import { Injectable } from '@nestjs/common';
import { BaseWorkflow } from '../base/base-workflow';
import { DeckGeneratorState, DeckOutline, SlideType, SlideOutline } from '@orb_deck/shared-types';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { JsonResponseParser, DeckOutlineSchema } from '@orb_deck/utils';

@Injectable()
export class OutlineService extends BaseWorkflow {
  constructor(aguiEmitter: any, configService: any) {
    super(aguiEmitter, configService, OutlineService.name);
  }

  async createDeckOutline(state: DeckGeneratorState): Promise<DeckOutline> {
    this.emitEvent(state.sessionId, {
      type: 'message.create',
      data: {
        role: 'assistant',
        content: 'Creating pitch deck outline based on research...',
      },
    });

    try {
      const outlinePrompt = this.promptManager.render('deck-outline', {
        companyName: state.userInput.companyName,
        industry: state.userInput.industry,
        problemStatement: state.userInput.problemStatement,
        solution: state.userInput.solution,
        businessModel: state.userInput.businessModel,
        targetMarket: state.userInput.targetMarket,
        research: state.research,
      });

      const systemMessage = new SystemMessage(
        'You are a pitch deck expert. Create structured outlines for investor presentations.'
      );

      const response = await this.model.invoke([
        systemMessage,
        new HumanMessage(outlinePrompt),
      ]);

      const parsedOutline = JsonResponseParser.parse(
        response.content as string,
        DeckOutlineSchema,
        { fuzzyMatch: true }
      );

      if (!parsedOutline) {
        throw new Error('Failed to parse deck outline response');
      }

      const outline: DeckOutline = {
        suggestedSlides: parsedOutline.suggestedSlides.map((slide: any): SlideOutline => ({
          type: slide.type as SlideType,
          title: slide.title ?? '',
          mainPoints: slide.mainPoints ?? [],
          suggestedVisuals: slide.suggestedVisuals ?? [],
        })),
        narrative: parsedOutline.narrative ?? '',
        keyMessages: parsedOutline.keyMessages ?? [],
      };

      this.emitEvent(state.sessionId, {
        type: 'outline.created',
        data: {
          slideCount: outline.suggestedSlides.length,
          narrative: outline.narrative,
        },
      });

      return outline;
    } catch (error) {
      this.logAndEmitError(state.sessionId, error as Error, 'outline creation');
      throw error;
    }
  }
}