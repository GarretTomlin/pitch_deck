import { Module } from '@nestjs/common';
import { DeckGeneratorService } from './deck-generator/services/deck-generator.service';
import { DeckGeneratorWorkflow } from './deck-generator/langgraph-workflow';
import { ResearchService } from './deck-generator/services/research.service';
import { OutlineService } from './deck-generator/services/outline.service';
import { ContentGenerationService } from './deck-generator/services/content-generation.service';
import { RefinementService } from './deck-generator/services/refinement.service';
import { DeckDAO } from './deck-generator/dao/deck.dao';
import { SlideDAO } from './deck-generator/dao/slide.dao';
import { AgUIEventEmitter } from '../events/agui-event.service';
import { ConfigModule } from '@nestjs/config';
import { DeckGeneratorController } from './deck-generator/controller/deck.controller';

@Module({
  imports: [ConfigModule],
  controllers: [DeckGeneratorController],
  providers: [
    DeckGeneratorService,
    DeckGeneratorWorkflow,
    ResearchService,
    OutlineService,
    ContentGenerationService,
    RefinementService,
    DeckDAO,
    SlideDAO,
    AgUIEventEmitter,
  ],
  exports: [DeckGeneratorService],
})
export class AgentsModule {}