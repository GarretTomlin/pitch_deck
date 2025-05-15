import { Prisma } from '@prisma/client';
import { Slide, DeckMetadata } from '@orb_deck/shared-types';

export class JsonConverter {
  static toSlides(json: Prisma.JsonValue[]): Slide[] {
    return json as unknown as Slide[];
  }

  static toMetadata(json: Prisma.JsonValue): DeckMetadata {
    return json as unknown as DeckMetadata;
  }

  static slidesToJson(slides: Slide[]): Prisma.InputJsonValue[] {
    return slides as unknown as Prisma.InputJsonValue[];
  }

  static metadataToJson(metadata: DeckMetadata): Prisma.InputJsonValue {
    return metadata as unknown as Prisma.InputJsonValue;
  }
}