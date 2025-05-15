import { Injectable, Logger } from '@nestjs/common';
import { 
  DeckGeneratorState, 
  Slide,
  GenerateDeckRequest 
} from '@orb_deck/shared-types';
import { DeckGeneratorWorkflow } from '../langgraph-workflow';
import { AgUIEventEmitter } from '@/modules/events/agui-event.service';
import { CreateDeckInput } from '../dto/create-deck';


@Injectable()
export class DeckGeneratorService {
  private readonly logger = new Logger(DeckGeneratorService.name);
  
  constructor(
    private readonly workflow: DeckGeneratorWorkflow,
    private readonly aguiEmitter: AgUIEventEmitter
  ) {}

  async createPitchDeck(input: CreateDeckInput): Promise<Slide[]> {
    const { sessionId, targetInvestorType, additionalContext, userId, title, ...generateDeckRequest } = input;
    
    try {
      this.logger.log(`Starting pitch deck generation for ${input.companyName}`);
      
      // Initialize state with GenerateDeckRequest structure
      const userInput: GenerateDeckRequest = {
        companyName: generateDeckRequest.companyName,
        industry: generateDeckRequest.industry,
        problemStatement: generateDeckRequest.problemStatement,
        solution: generateDeckRequest.solution,
        businessModel: generateDeckRequest.businessModel,
        targetMarket: generateDeckRequest.targetMarket,
        fundingAmount: generateDeckRequest.fundingAmount,
      };
      
      const initialState: DeckGeneratorState = {
        userInput,
        research: null,
        outline: null,
        slides: [],
        refinements: [],
        currentStep: 'initial',
        messages: [],
        sessionId: sessionId,
      };
      
      // Run the workflow
      const result = await this.workflow.run(initialState, sessionId);
      
      this.logger.log(`Completed pitch deck generation: ${result.slides.length} slides created`);
      
      return result.slides;
    } catch (error) {
      this.logger.error(`Error creating pitch deck: ${(error as Error).message}`, (error as Error).stack);
      
      this.aguiEmitter.emit(sessionId, {
        type: 'error',
        data: {
          error: (error as Error).message,
          context: 'createPitchDeck',
          timestamp: new Date()
        }
      });
      
      throw error;
    }
  }

  async getRefinementSuggestions(sessionId: string, slides: Slide[]): Promise<any> {
    try {
      this.aguiEmitter.emit(sessionId, {
        type: 'refinement.suggestions',
        data: {
          suggestions: [
            'Consider adding more specific metrics to the traction slide',
            'The market size slide could benefit from more recent data',
            'Add competitor comparison matrix to the competition slide'
          ]
        }
      });
      
      return {
        suggestions: [
          {
            slideIndex: 3,
            type: 'content',
            suggestion: 'Add specific market size data and CAGR'
          },
          {
            slideIndex: 5,
            type: 'visual',
            suggestion: 'Include a competitor comparison chart'
          }
        ]
      };
    } catch (error) {
      this.logger.error(`Error getting refinement suggestions: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
  }

  async applyRefinements(sessionId: string, slides: Slide[], refinements: any[]): Promise<Slide[]> {
    try {
      // Convert refinements to the format expected by the workflow
      const refinementRequests = refinements.map(r => ({
        slideId: slides[r.slideIndex].id,
        feedback: r.suggestion,
        timestamp: new Date(),
        status: 'pending' as const
      }));

      // Use the workflow to apply refinements
      const refinedSlides = await this.workflow.refineSpecificSlides(
        sessionId,
        refinementRequests
      );

      // Merge refined slides with original slides
      return slides.map(slide => {
        const refined = refinedSlides.find(r => r.id === slide.id);
        return refined ?? slide;
      });
    } catch (error) {
      this.logger.error(`Error applying refinements: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
  }

  async exportDeck(slides: Slide[], format: 'pdf' | 'pptx' | 'google-slides'): Promise<Buffer> {
    try {
      
      // TODO:  Implement actual export logic
      this.logger.log(`Exporting deck in ${format} format`);
      
      // For now, returning a mock buffer
      return Buffer.from('Mock export data');
    } catch (error) {
      this.logger.error(`Error exporting deck: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
  }
}