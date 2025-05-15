import { Injectable } from '@nestjs/common';
import { Slide } from '@orb_deck/shared-types';
import { DeckDAO } from './deck.dao';
import { prisma } from '@/modules/lib/prisma';

@Injectable()
export class SlideDAO {
  constructor(private readonly deckDAO: DeckDAO) {}

  async findById(slideId: string): Promise<Slide | null> {
    const decks = await prisma.deck.findMany({
      where: {
        slides: {
          path: ['$[*]'],
          array_contains: {
            id: slideId
          }
        }
      }
    });

    for (const deck of decks) {
      const slides = deck.slides as any[];
      const slide = slides?.find(s => s.id === slideId);
      if (slide) {
        return slide as Slide;
      }
    }
    
    return null;
  }

  async findByDeckId(deckId: string): Promise<Slide[]> {
    const deck = await this.deckDAO.findById(deckId);
    return deck?.slides || [];
  }

  async create(deckId: string, slide: Slide): Promise<Slide> {
    await this.deckDAO.addSlide(deckId, slide);
    return slide;
  }

  async update(slideId: string, slideData: Partial<Slide>): Promise<Slide> {
    // Find which deck contains this slide
    const decks = await prisma.deck.findMany({
      where: {
        slides: {
          path: ['$[*]'],
          array_contains: {
            id: slideId
          }
        }
      }
    });

    if (decks.length === 0) {
      throw new Error('Slide not found');
    }

    const deck = decks[0];
    const slides = deck.slides as any[];
    const slideIndex = slides?.findIndex(s => s.id === slideId);
    
    if (slideIndex === -1 || slideIndex === undefined) {
      throw new Error('Slide not found in deck');
    }

    const updatedSlide = {
      ...slides[slideIndex],
      ...slideData
    };

    await this.deckDAO.updateSlide(deck.id, slideId, updatedSlide);

    return updatedSlide as Slide;
  }

  async delete(deckId: string, slideId: string): Promise<void> {
    await this.deckDAO.deleteSlide(deckId, slideId);
  }

  async reorder(deckId: string, slideIds: string[]): Promise<Slide[]> {
    const deck = await this.deckDAO.reorderSlides(deckId, slideIds);
    return deck.slides;
  }
}