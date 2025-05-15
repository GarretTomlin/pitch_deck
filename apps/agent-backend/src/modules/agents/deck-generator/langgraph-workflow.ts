import { StateGraph, START, END, StateGraphArgs } from '@langchain/langgraph';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { 
  DeckGeneratorState, 
  WorkflowStep, 
  Slide, 
  GenerateDeckRequest,
  MarketResearch,
  DeckOutline,
  Refinement,
  ChatMessage
} from '@orb_deck/shared-types';
import { AgUIEventEmitter } from '@/modules/events/agui-event.service';
import { ResearchService } from './services/research.service';
import { OutlineService } from './services/outline.service';
import { ContentGenerationService } from './services/content-generation.service';
import { RefinementService } from './services/refinement.service';
import { WorkflowStateManager } from '@/modules/utils/workflow-state-manager';

type GraphNode = 
  | 'research_market'
  | 'create_outline' 
  | 'generate_content'
  | 'refine_slides'
  | 'human_feedback'
  | 'error_handler';

@Injectable()
export class DeckGeneratorWorkflow {
  private readonly logger = new Logger(DeckGeneratorWorkflow.name);
  private workflow: StateGraph<DeckGeneratorState, Partial<DeckGeneratorState>, GraphNode | typeof START | typeof END>;
  private readonly activeStreams: Map<string, AbortController> = new Map();
  private readonly stateManager: WorkflowStateManager;

  constructor(
    private readonly aguiEmitter: AgUIEventEmitter,
    private readonly configService: ConfigService,
    private readonly researchService: ResearchService,
    private readonly outlineService: OutlineService,
    private readonly contentService: ContentGenerationService,
    private readonly refinementService: RefinementService,
  ) {
    this.stateManager = new WorkflowStateManager();
    this.setupWorkflow();
  }

  private setupWorkflow() {
    const graphConfig: StateGraphArgs<DeckGeneratorState> = {
      channels: {
        userInput: {
          reducer: (x: GenerateDeckRequest, y: GenerateDeckRequest) => y ?? x,
          default: () => ({} as GenerateDeckRequest)
        },
        research: {
          reducer: (x: MarketResearch | null, y: MarketResearch | null) => y ?? x,
          default: () => null
        },
        outline: {
          reducer: (x: DeckOutline | null, y: DeckOutline | null) => y ?? x,
          default: () => null
        },
        slides: {
          reducer: (x: Slide[], y: Slide[]) => y ?? x,
          default: () => []
        },
        refinements: {
          reducer: (x: Refinement[], y: Refinement[]) => y ?? x,
          default: () => []
        },
        currentStep: {
          reducer: (x: WorkflowStep, y: WorkflowStep) => y ?? x,
          default: () => 'initial' as WorkflowStep
        },
        messages: {
          reducer: (x: ChatMessage[], y: ChatMessage[]) => y ?? x,
          default: () => []
        },
        error: {
          reducer: (x: any, y: any) => y ?? x,
          default: () => undefined
        },
        sessionId: {
          reducer: (x: string, y: string) => y ?? x,
          default: () => ''
        },
        deckId: {
          reducer: (x: string | undefined, y: string | undefined) => y ?? x,
          default: () => undefined
        }
      }
    };

    this.workflow = new StateGraph<DeckGeneratorState, Partial<DeckGeneratorState>, GraphNode | typeof START | typeof END>(graphConfig);

    this.workflow.addNode('research_market' as GraphNode, this.researchMarket.bind(this));
    this.workflow.addNode('create_outline' as GraphNode, this.createOutline.bind(this));
    this.workflow.addNode('generate_content' as GraphNode, this.generateContent.bind(this));
    this.workflow.addNode('refine_slides' as GraphNode, this.refineSlides.bind(this));
    this.workflow.addNode('human_feedback' as GraphNode, this.handleHumanFeedback.bind(this));
    this.workflow.addNode('error_handler' as GraphNode, this.handleError.bind(this));

    this.workflow.addEdge(START, 'research_market' as GraphNode);
    
    this.workflow.addConditionalEdges(
      'research_market' as GraphNode,
      this.checkError.bind(this),
      {
        error: 'error_handler' as GraphNode,
        success: 'create_outline' as GraphNode,
      }
    );

    this.workflow.addConditionalEdges(
      'create_outline' as GraphNode,
      this.checkError.bind(this),
      {
        error: 'error_handler' as GraphNode,
        success: 'generate_content' as GraphNode,
      }
    );

    this.workflow.addConditionalEdges(
      'generate_content' as GraphNode,
      this.checkForRefinement.bind(this),
      {
        needs_refinement: 'human_feedback' as GraphNode,
        complete: 'refine_slides' as GraphNode,
        error: 'error_handler' as GraphNode,
      }
    );

    this.workflow.addEdge('human_feedback' as GraphNode, 'refine_slides' as GraphNode);
    this.workflow.addEdge('refine_slides' as GraphNode, END);
    this.workflow.addEdge('error_handler' as GraphNode, END);
  }

  async run(input: DeckGeneratorState, sessionId: string): Promise<DeckGeneratorState> {
    const controller = new AbortController();
    this.activeStreams.set(sessionId, controller);

    try {
      const app = this.workflow.compile();
      
      // Set session ID in state
      input.sessionId = sessionId;
      
      // Emit start event
      this.aguiEmitter.emit(sessionId, {
        type: 'workflow.start',
        data: { 
          workflowStep: 'initial', 
          status: 'starting',
          input: input.userInput 
        },
      });

      // Initialize with default values if not provided
      const initialState: DeckGeneratorState = {
        userInput: input.userInput || {} as GenerateDeckRequest,
        research: input.research || null,
        outline: input.outline || null,
        slides: input.slides || [],
        refinements: input.refinements || [],
        currentStep: input.currentStep || 'initial',
        messages: input.messages || [],
        error: input.error,
        sessionId: sessionId,
        deckId: input.deckId,
      };

      const stream = await app.stream(initialState);
      let finalState: DeckGeneratorState = initialState;
      
      for await (const state of stream) {
        if (controller.signal.aborted) {
          break;
        }

        finalState = state as DeckGeneratorState;
        this.stateManager.updateState(sessionId, finalState);

        this.aguiEmitter.emit(sessionId, {
          type: 'state.update',
          data: {
            workflowStep: finalState.currentStep,
            progress: this.calculateProgress(finalState.currentStep),
            ...finalState,
          },
        });
      }

      this.aguiEmitter.emit(sessionId, {
        type: 'workflow.complete',
        data: { 
          success: true,
          slidesCount: finalState.slides.length,
          deckId: finalState.deckId,
        },
      });

      return finalState;
    } catch (error) {
      this.handleWorkflowError(sessionId, error as Error, input.currentStep);
      throw error;
    } finally {
      this.activeStreams.delete(sessionId);
      this.stateManager.clearState(sessionId);
    }
  }

  async cancelWorkflow(sessionId: string): Promise<void> {
    const controller = this.activeStreams.get(sessionId);
    if (controller) {
      controller.abort();
      this.activeStreams.delete(sessionId);
      
      this.aguiEmitter.emit(sessionId, {
        type: 'workflow.cancelled',
        data: { timestamp: new Date() },
      });
    }
  }

  private async researchMarket(state: DeckGeneratorState): Promise<Partial<DeckGeneratorState>> {
    try {
      const research = await this.researchService.performMarketResearch(state);
      
      return {
        research,
        currentStep: 'research' as WorkflowStep,
      };
    } catch (error) {
      return this.handleNodeError(state, error as Error, 'research');
    }
  }

  private async createOutline(state: DeckGeneratorState): Promise<Partial<DeckGeneratorState>> {
    try {
      const outline = await this.outlineService.createDeckOutline(state);
      
      return {
        outline,
        currentStep: 'outline' as WorkflowStep,
      };
    } catch (error) {
      return this.handleNodeError(state, error as Error, 'outline');
    }
  }

  private async generateContent(state: DeckGeneratorState): Promise<Partial<DeckGeneratorState>> {
    try {
      const slides = await this.contentService.generateSlides(state);
      
      return {
        slides,
        currentStep: 'content-generation' as WorkflowStep,
      };
    } catch (error) {
      return this.handleNodeError(state, error as Error, 'content-generation');
    }
  }

  private async refineSlides(state: DeckGeneratorState): Promise<Partial<DeckGeneratorState>> {
    try {
      if (!state.refinements || state.refinements.length === 0) {
        return {
          currentStep: 'complete' as WorkflowStep,
        };
      }

      const refinedSlides = await this.refinementService.refineMultipleSlides(
        state.refinements,
        state.sessionId
      );

      // Merge refined slides with existing slides
      const updatedSlides: Slide[] = state.slides.map(slide => {
        const refined = refinedSlides.find(r => r.id === slide.id);
        if (refined) {
          return refined;
        }
        return slide;
      });

      return {
        slides: updatedSlides,
        currentStep: 'complete' as WorkflowStep,
      };
    } catch (error) {
      return this.handleNodeError(state, error as Error, 'refinement');
    }
  }

  private async handleHumanFeedback(state: DeckGeneratorState): Promise<Partial<DeckGeneratorState>> {
    this.aguiEmitter.emit(state.sessionId, {
      type: 'human.input.request',
      data: {
        message: 'Please review the generated slides and provide feedback',
        slides: state.slides,
        options: [
          'Approve all slides',
          'Request refinements',
          'Regenerate specific slides',
        ],
      },
    });

    return {
      currentStep: 'refinement' as WorkflowStep,
    };
  }

  // Helper methods
  private checkError(state: DeckGeneratorState): string {
    return state.error ? 'error' : 'success';
  }

  private checkForRefinement(state: DeckGeneratorState): string {
    if (state.error) return 'error';
    
    const requiresReview = this.configService.get('REQUIRE_HUMAN_REVIEW', true);
    
    if (requiresReview && state.refinements.length === 0) {
      return 'needs_refinement';
    }
    
    return state.refinements?.length > 0 ? 'needs_refinement' : 'complete';
  }

  private async handleError(state: DeckGeneratorState): Promise<Partial<DeckGeneratorState>> {
    this.logger.error('Workflow error:', state.error);
    
    this.aguiEmitter.emit(state.sessionId, {
      type: 'workflow.error',
      data: {
        error: state.error,
        step: state.currentStep,
        recovery: 'Manual intervention required',
      },
    });
    
    return {
      currentStep: 'complete' as WorkflowStep,
    };
  }

  private handleNodeError(state: DeckGeneratorState, error: Error, node: string): Partial<DeckGeneratorState> {
    this.logger.error(`Error in ${node} node:`, error);
    
    return {
      error: {
        message: error.message,
        stack: error.stack,
        node,
        timestamp: new Date(),
      },
    };
  }

  private handleWorkflowError(sessionId: string, error: Error, step: WorkflowStep): void {
    this.logger.error(`Workflow error: ${error.message}`, error.stack);
    
    this.aguiEmitter.emit(sessionId, {
      type: 'workflow.error',
      data: { 
        error: error.message,
        step,
      },
    });
  }

  private calculateProgress(step: WorkflowStep): number {
    const steps: WorkflowStep[] = [
      'initial',
      'research',
      'outline',
      'content-generation',
      'refinement',
      'complete',
    ];
    const currentIndex = steps.indexOf(step);
    return ((currentIndex + 1) / steps.length) * 100;
  }

  async refineSpecificSlide(
    sessionId: string,
    slideId: string,
    feedback: string
  ): Promise<Slide> {
    const refined = await this.refinementService.refineSlideContent(slideId, feedback);
    return refined;
  }

  async refineSpecificSlides(
    sessionId: string,
    refinements: any[]
  ): Promise<Slide[]> {
    return await this.refinementService.refineMultipleSlides(refinements, sessionId);
  }
}