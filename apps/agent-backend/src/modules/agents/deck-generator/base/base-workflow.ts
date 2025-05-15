import { Logger } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { ConfigService } from '@nestjs/config';
import { AgUIEventEmitter } from '@/modules/events/agui-event.service';
import { PromptTemplateManager } from '@orb_deck/utils';
import { WorkflowStep } from '@orb_deck/shared-types';
import * as path from 'path';

interface ChatOpenAIOptions {
  modelName: string;
  temperature: number;
  streaming: boolean;
}

export abstract class BaseWorkflow {
  protected readonly logger: Logger;
  protected model: ChatOpenAI;
  protected promptManager: PromptTemplateManager;

  constructor(
    protected aguiEmitter: AgUIEventEmitter,
    protected configService: ConfigService,
    loggerName: string,
  ) {
    this.logger = new Logger(loggerName);

    const modelOptions: ChatOpenAIOptions = {
      modelName:
        this.configService.get<string>('OPENAI_MODEL') || 'gpt-4-turbo',
      temperature: 0.7,
      streaming: true,
    };

    this.model = new ChatOpenAI(modelOptions);

    const promptsPath =
      this.configService.get<string>('PROMPTS_PATH') ||
      path.join(__dirname, '../../../../prompts');

    this.promptManager = new PromptTemplateManager(promptsPath);
  }

  protected calculateProgress(step: WorkflowStep): number {
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

  protected emitEvent(sessionId: string, event: any): void {
    this.aguiEmitter.emit(sessionId, event);
  }

  protected logAndEmitError(
    sessionId: string,
    error: Error,
    context: string,
  ): void {
    this.logger.error(`Error in ${context}: ${error.message}`, error.stack);

    this.emitEvent(sessionId, {
      type: 'error',
      data: {
        error: error.message,
        context,
        timestamp: new Date(),
      },
    });
  }
}
