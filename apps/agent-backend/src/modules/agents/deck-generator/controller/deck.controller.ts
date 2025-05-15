import { 
    Controller, 
    Post, 
    Get, 
    Put,
    Delete,
    Body, 
    Param, 
    Query,
    HttpStatus,
    HttpCode,
    HttpException,
    NotFoundException
  } from '@nestjs/common';
  import { Slide, PitchDeck } from '@orb_deck/shared-types';
import { DeckGeneratorService } from '../services/deck-generator.service';
import { DeckDAO } from '../dao/deck.dao';
import { CreateDeckInput } from '../dto/create-deck';
  
  @Controller('api/decks')
  export class DeckGeneratorController {
    constructor(
      private readonly deckGeneratorService: DeckGeneratorService,
      private readonly deckDAO: DeckDAO
    ) {}
  
    @Post('generate')
    @HttpCode(HttpStatus.CREATED)
    async generateDeck(@Body() input: CreateDeckInput): Promise<{ deck: PitchDeck }> {
      const slides = await this.deckGeneratorService.createPitchDeck(input);
      
      const deck = await this.deckDAO.create({
        userId: input.userId,
        title: input.title || `${input.companyName} Pitch Deck`,
        companyName: input.companyName,
        industry: input.industry,
        slides: slides,
        metadata: {
          problemStatement: input.problemStatement,
          solution: input.solution,
          targetMarket: input.targetMarket || '',
          businessModel: input.businessModel || '',
          financials: {
            fundingNeeded: input.fundingAmount
          }
        }
      });
      
      return { deck };
    }
  
    // Get deck by ID
    @Get(':deckId')
    async getDeck(@Param('deckId') deckId: string): Promise<PitchDeck> {
      const deck = await this.deckDAO.findById(deckId);
      if (!deck) {
        throw new NotFoundException(`Deck with ID ${deckId} not found`);
      }
      return deck;
    }
  
    // Update deck
    @Put(':deckId')
    async updateDeck(
      @Param('deckId') deckId: string,
      @Body() updateData: Partial<PitchDeck>
    ): Promise<PitchDeck> {
      try {
        return await this.deckDAO.update(deckId, updateData);
      } catch (error) {
        throw new HttpException(
          `Failed to update deck: ${(error as Error).message}`,
          HttpStatus.BAD_REQUEST
        );
      }
    }
  
    // Delete deck
    @Delete(':deckId')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteDeck(@Param('deckId') deckId: string): Promise<void> {
      try {
        await this.deckDAO.delete(deckId);
      } catch (error) {
        throw new HttpException(
          `Failed to delete deck: ${(error as Error).message}`,
          HttpStatus.BAD_REQUEST
        );
      }
    }
  
    // Get user's decks
    @Get('user/:userId')
    async getUserDecks(@Param('userId') userId: string): Promise<PitchDeck[]> {
      return await this.deckDAO.findByUserId(userId);
    }
  
    // Add slide to deck
    @Post(':deckId/slides')
    @HttpCode(HttpStatus.CREATED)
    async addSlide(
      @Param('deckId') deckId: string,
      @Body() slide: Slide
    ): Promise<PitchDeck> {
      try {
        return await this.deckDAO.addSlide(deckId, slide);
      } catch (error) {
        throw new HttpException(
          `Failed to add slide: ${(error as Error).message}`,
          HttpStatus.BAD_REQUEST
        );
      }
    }
  
    // Update slide
    @Put(':deckId/slides/:slideId')
    async updateSlide(
      @Param('deckId') deckId: string,
      @Param('slideId') slideId: string,
      @Body() slideData: Partial<Slide>
    ): Promise<PitchDeck> {
      try {
        return await this.deckDAO.updateSlide(deckId, slideId, slideData);
      } catch (error) {
        throw new HttpException(
          `Failed to update slide: ${(error as Error).message}`,
          HttpStatus.BAD_REQUEST
        );
      }
    }
  
    // Delete slide
    @Delete(':deckId/slides/:slideId')
    async deleteSlide(
      @Param('deckId') deckId: string,
      @Param('slideId') slideId: string
    ): Promise<PitchDeck> {
      try {
        return await this.deckDAO.deleteSlide(deckId, slideId);
      } catch (error) {
        throw new HttpException(
          `Failed to delete slide: ${(error as Error).message}`,
          HttpStatus.BAD_REQUEST
        );
      }
    }
  
    // Reorder slides
    @Put(':deckId/slides/reorder')
    async reorderSlides(
      @Param('deckId') deckId: string,
      @Body() body: { slideIds: string[] }
    ): Promise<PitchDeck> {
      try {
        return await this.deckDAO.reorderSlides(deckId, body.slideIds);
      } catch (error) {
        throw new HttpException(
          `Failed to reorder slides: ${(error as Error).message}`,
          HttpStatus.BAD_REQUEST
        );
      }
    }
  
    // Get refinement suggestions
    @Post(':deckId/refinements/suggestions')
    async getRefinementSuggestions(
      @Param('deckId') deckId: string,
      @Body() body: { sessionId: string }
    ): Promise<any> {
      const deck = await this.deckDAO.findById(deckId);
      if (!deck) {
        throw new NotFoundException(`Deck with ID ${deckId} not found`);
      }
      
      return this.deckGeneratorService.getRefinementSuggestions(
        body.sessionId,
        deck.slides
      );
    }
  
    // Apply refinements
    @Post(':deckId/refinements/apply')
    async applyRefinements(
      @Param('deckId') deckId: string,
      @Body() body: { refinements: any[], sessionId: string }
    ): Promise<PitchDeck> {
      const deck = await this.deckDAO.findById(deckId);
      if (!deck) {
        throw new NotFoundException(`Deck with ID ${deckId} not found`);
      }
      
      // Apply refinements through the workflow
      const refinedSlides = await this.deckGeneratorService.applyRefinements(
        body.sessionId,
        deck.slides,
        body.refinements
      );
      
      // Update the deck with refined slides
      return await this.deckDAO.update(deckId, { slides: refinedSlides });
    }
  
    // Export deck
    @Post(':deckId/export')
    async exportDeck(
      @Param('deckId') deckId: string,
      @Body() body: { format: 'pdf' | 'pptx' | 'google-slides' }
    ): Promise<{ url: string }> {
      const deck = await this.deckDAO.findById(deckId);
      if (!deck) {
        throw new NotFoundException(`Deck with ID ${deckId} not found`);
      }
      
      // TODO : Implement actual export logic
      return { url: `` };
    }
  
    // Search decks
    @Get('user/:userId/search')
    async searchDecks(
      @Param('userId') userId: string,
      @Query('q') query: string
    ): Promise<PitchDeck[]> {
      if (!query) {
        throw new HttpException('Search query is required', HttpStatus.BAD_REQUEST);
      }
      return await this.deckDAO.search(userId, query);
    }
  
    // Create version
    @Post(':deckId/versions')
    @HttpCode(HttpStatus.CREATED)
    async createVersion(@Param('deckId') deckId: string): Promise<PitchDeck> {
      try {
        return await this.deckDAO.createVersion(deckId);
      } catch (error) {
        throw new HttpException(
          `Failed to create version: ${(error as Error).message}`,
          HttpStatus.BAD_REQUEST
        );
      }
    }
  }