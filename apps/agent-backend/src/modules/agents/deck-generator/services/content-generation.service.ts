import { Injectable } from '@nestjs/common';
import { BaseWorkflow } from '../base/base-workflow';
import { DeckGeneratorState, Slide, SlideType, ChartData } from '@orb_deck/shared-types';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { JsonResponseParser, SlideContentSchema } from '@orb_deck/utils';

@Injectable()
export class ContentGenerationService extends BaseWorkflow {
  constructor(aguiEmitter: any, configService: any) {
    super(aguiEmitter, configService, ContentGenerationService.name);
  }

  async generateSlides(state: DeckGeneratorState): Promise<Slide[]> {
    const slides: Slide[] = [];
    const totalSlides = state.outline.suggestedSlides.length;

    for (let i = 0; i < totalSlides; i++) {
      const slideOutline = state.outline.suggestedSlides[i];
      
      try {
        const slide = await this.generateSingleSlide(
          slideOutline,
          state.userInput,
          i,
          totalSlides,
          state.sessionId
        );
        
        slides.push(slide);
      } catch (error) {
        this.logger.warn(`Failed to generate slide: ${slideOutline.title}`, error);
        // Continue with other slides even if one fails
      }
    }

    return slides;
  }

  private async generateSingleSlide(
    slideOutline: any,
    userInput: any,
    index: number,
    total: number,
    sessionId: string
  ): Promise<Slide> {
    this.emitEvent(sessionId, {
      type: 'slide.generating',
      data: {
        slideNumber: index + 1,
        totalSlides: total,
        slideTitle: slideOutline.title,
        progress: ((index + 1) / total) * 100,
      },
    });

    const contentPrompt = this.promptManager.render('slide-content', {
      title: slideOutline.title,
      type: slideOutline.type,
      mainPoints: slideOutline.mainPoints,
      companyName: userInput.companyName,
      industry: userInput.industry,
    });

    const systemMessage = new SystemMessage(
      'You are a content writer specializing in pitch decks. Create compelling, concise content.'
    );

    const response = await this.model.invoke([
      systemMessage,
      new HumanMessage(contentPrompt),
    ]);

    const slideContent = JsonResponseParser.parse(
      response.content as string,
      SlideContentSchema,
      { fuzzyMatch: true }
    );

    if (!slideContent) {
      throw new Error(`Failed to parse content for slide: ${slideOutline.title}`);
    }

    const slide = this.createSlideObject(slideOutline, slideContent, index);

    this.emitEvent(sessionId, {
      type: 'slide.generated',
      data: { 
        slide,
        progress: ((index + 1) / total) * 100,
      },
    });

    return slide;
  }

  private createSlideObject(outline: any, content: any, order: number): Slide {
    const charts: ChartData[] = content.chartData ? [{
      type: content.chartData.type,
      data: content.chartData.data,
      config: {
        showLegend: true,
        animations: true,
      },
    }] : [];

    return {
      id: crypto.randomUUID(),
      title: outline.title,
      type: outline.type as SlideType,
      content: {
        text: content.text,
        bulletPoints: content.bulletPoints ?? [],
        images: [],
        charts,
        layout: this.determineLayout(outline.type),
      },
      speakerNotes: content.speakerNotes,
      order,
      metadata: {
        aiGenerated: true,
        userEdited: false,
        lastAiUpdate: new Date(),
        template: JSON.stringify({ 
          suggestedImages: content.suggestedImages 
        }),
      },
    };
  }

  private determineLayout(slideType: string): string {
    const layoutMap: Record<string, string> = {
      'title': 'full-image',
      'problem': 'two-column',
      'solution': 'image-right',
      'market': 'chart-focused',
      'financials': 'chart-focused',
      'team': 'grid',
      'competition': 'comparison',
      'traction': 'chart-focused',
    };
    
    return layoutMap[slideType] ?? 'default';
  }
}