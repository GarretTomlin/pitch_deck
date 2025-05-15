import { Injectable } from '@nestjs/common';
import { BaseWorkflow } from '../base/base-workflow';
import { Slide, Refinement } from '@orb_deck/shared-types';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { JsonResponseParser, SlideContentSchema } from '@orb_deck/utils';
import { SlideDAO } from '../dao/slide.dao';

@Injectable()
export class RefinementService extends BaseWorkflow {
  constructor(
    aguiEmitter: any,
    configService: any,
    private readonly slideDAO: SlideDAO
  ) {
    super(aguiEmitter, configService, RefinementService.name);
  }

  async refineSlide(
    slideId: string,
    feedback: string,
    sessionId?: string
  ): Promise<Slide> {
    try {
      // Get the current slide
      const currentSlide = await this.slideDAO.findById(slideId);
      if (!currentSlide) {
        throw new Error('Slide not found');
      }

      // Emit refinement start event if session exists
      if (sessionId) {
        this.emitEvent(sessionId, {
          type: 'slide.refining',
          data: {
            slideId,
            feedback,
            timestamp: new Date(),
          },
        });
      }

      // Create refinement prompt
      const refinePrompt = this.promptManager.render('slide-refinement', {
        currentSlide,
        feedback,
        refinementGuidelines: this.getRefinementGuidelines(currentSlide.type),
      });

      const systemMessage = new SystemMessage(
        'You are an expert pitch deck editor. Refine content based on specific feedback while maintaining structure and clarity.'
      );

      const response = await this.model.invoke([
        systemMessage,
        new HumanMessage(refinePrompt),
      ]);

      const refinedContent = JsonResponseParser.parse(
        response.content as string,
        SlideContentSchema,
        { fuzzyMatch: true }
      );

      if (!refinedContent) {
        throw new Error('Failed to parse refined slide content');
      }

      const refinedSlide = {
        ...currentSlide,
        content: {
          ...currentSlide.content,
          text: refinedContent.text || currentSlide.content.text,
          bulletPoints: refinedContent.bulletPoints || currentSlide.content.bulletPoints,
          charts: refinedContent.chartData ? [{
            id: crypto.randomUUID(),
            type: refinedContent.chartData.type,
            data: refinedContent.chartData.data,
            config: { showLegend: true, animations: true },
          }] : currentSlide.content.charts,
        },
        speakerNotes: refinedContent.speakerNotes || currentSlide.speakerNotes,
        metadata: {
          ...currentSlide.metadata,
          userEdited: true,
          lastRefinement: new Date(),
          refinementCount: ((currentSlide.metadata as any).refinementCount || 0) + 1,
          version: ((currentSlide.metadata as any).version || 0) + 1,
        },
      };

      const savedSlide = await this.slideDAO.update(slideId, refinedSlide);

      if (sessionId) {
        this.emitEvent(sessionId, {
          type: 'slide.refined',
          data: {
            slideId,
            version: (savedSlide.metadata as any).version,
            success: true,
          },
        });
      }

      return savedSlide;
    } catch (error) {
      this.logAndEmitError(sessionId || 'unknown', error as Error, 'slide refinement');
      throw error;
    }
  }

  async refineMultipleSlides(
    refinements: Refinement[],
    sessionId: string
  ): Promise<Slide[]> {
    const refinedSlides: Slide[] = [];

    for (const refinement of refinements) {
      try {
        const refined = await this.refineSlide(
          refinement.slideId,
          refinement.feedback,
          sessionId
        );
        refinedSlides.push(refined);
      } catch (error) {
        this.logger.error(`Failed to refine slide ${refinement.slideId}:`, error);
        // Continue with other slides
      }
    }

    return refinedSlides;
  }

  private getRefinementGuidelines(slideType: string): string {
    const guidelines: Record<string, string> = {
      'problem': 'Focus on pain points and urgency. Use specific metrics.',
      'solution': 'Emphasize unique value proposition and differentiation.',
      'market': 'Include TAM, SAM, SOM with credible sources.',
      'financials': 'Show clear path to profitability with realistic projections.',
      'team': 'Highlight relevant experience and domain expertise.',
      'competition': 'Be honest about competitors while showing your advantages.',
    };

    return guidelines[slideType] || 'Maintain clarity and conciseness.';
  }

  async refineSlideContent(
    slideId: string,
    feedback: string
  ): Promise<Slide> {
    return this.refineSlide(slideId, feedback);
  }
}