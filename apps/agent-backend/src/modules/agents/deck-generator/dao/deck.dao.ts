import { prisma } from '@/modules/lib/prisma';
import { JsonConverter } from '@/modules/utils/json-converter';
import { Injectable } from '@nestjs/common';
import { PitchDeck, Slide, DeckMetadata } from '@orb_deck/shared-types';
import { Prisma } from '@prisma/client';

@Injectable()
export class DeckDAO {
  async create(data: Partial<PitchDeck>): Promise<PitchDeck> {
    const result = await prisma.pitchDeck.create({
      data: {
        userId: data.userId,
        title: data.title,
        companyName: data.companyName,
        industry: data.industry,
        slides: JsonConverter.slidesToJson(data.slides || []),
        metadata: JsonConverter.metadataToJson(data.metadata || {} as DeckMetadata),
        version: data.version || 1,
      },
    });
    
    return {
      ...result,
      slides: JsonConverter.toSlides(result.slides),
      metadata: JsonConverter.toMetadata(result.metadata),
    } as PitchDeck;
  }

  async findById(deckId: string): Promise<PitchDeck | null> {
    const deck = await prisma.pitchDeck.findUnique({
      where: { id: deckId },
      include: {
        user: true,
      },
    });
    
    if (!deck) return null;
    
    return {
      ...deck,
      slides: JsonConverter.toSlides(deck.slides),
      metadata: JsonConverter.toMetadata(deck.metadata),
    } as PitchDeck;
  }

  async update(deckId: string, data: Partial<PitchDeck>): Promise<PitchDeck> {
    const updateData: Prisma.PitchDeckUpdateInput = {
      ...data,
      slides: data.slides ? JsonConverter.slidesToJson(data.slides) : undefined,
      metadata: data.metadata ? JsonConverter.metadataToJson(data.metadata) : undefined,
      updatedAt: new Date(),
    };
    
    const result = await prisma.pitchDeck.update({
      where: { id: deckId },
      data: updateData,
    });
    
    return {
      ...result,
      slides: JsonConverter.toSlides(result.slides),
      metadata: JsonConverter.toMetadata(result.metadata),
    } as PitchDeck;
  }

  async delete(deckId: string): Promise<void> {
    await prisma.pitchDeck.delete({
      where: { id: deckId },
    });
  }

  async findByUserId(userId: string): Promise<PitchDeck[]> {
    const decks = await prisma.pitchDeck.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
    
    return decks.map(deck => ({
      ...deck,
      slides: JsonConverter.toSlides(deck.slides),
      metadata: JsonConverter.toMetadata(deck.metadata),
    })) as PitchDeck[];
  }

  async addSlide(deckId: string, slide: Slide): Promise<PitchDeck> {
    const deck = await this.findById(deckId);
    if (!deck) {
      throw new Error('Deck not found');
    }

    const slides = [...deck.slides, slide];
    return this.update(deckId, { slides });
  }

  async updateSlide(deckId: string, slideId: string, slideData: Partial<Slide>): Promise<PitchDeck> {
    const deck = await this.findById(deckId);
    if (!deck) {
      throw new Error('Deck not found');
    }

    const slides = deck.slides.map(slide => 
      slide.id === slideId ? { ...slide, ...slideData } : slide
    );

    return this.update(deckId, { slides });
  }

  async deleteSlide(deckId: string, slideId: string): Promise<PitchDeck> {
    const deck = await this.findById(deckId);
    if (!deck) {
      throw new Error('Deck not found');
    }

    const slides = deck.slides.filter(slide => slide.id !== slideId);
    return this.update(deckId, { slides });
  }

  async reorderSlides(deckId: string, slideIds: string[]): Promise<PitchDeck> {
    const deck = await this.findById(deckId);
    if (!deck) {
      throw new Error('Deck not found');
    }

    const reorderedSlides = slideIds.map((id, index) => {
      const slide = deck.slides.find(s => s.id === id);
      if (!slide) throw new Error(`Slide ${id} not found`);
      return { ...slide, order: index };
    });

    return this.update(deckId, { slides: reorderedSlides });
  }

  async search(userId: string, query: string): Promise<PitchDeck[]> {
    const decks = await prisma.pitchDeck.findMany({
      where: {
        userId,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { companyName: { contains: query, mode: 'insensitive' } },
          { industry: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
    });
    
    return decks.map(deck => ({
      ...deck,
      slides: JsonConverter.toSlides(deck.slides),
      metadata: JsonConverter.toMetadata(deck.metadata),
    })) as PitchDeck[];
  }

  async createVersion(deckId: string): Promise<PitchDeck> {
    const deck = await this.findById(deckId);
    if (!deck) {
      throw new Error('Deck not found');
    }

    return this.create({
      ...deck,
      id: undefined,
      version: deck.version + 1,
      createdAt: undefined,
      updatedAt: undefined,
    });
  }
}