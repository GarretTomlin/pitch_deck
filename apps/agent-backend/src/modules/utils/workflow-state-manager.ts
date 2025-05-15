import { Injectable } from '@nestjs/common';
import { DeckGeneratorState } from '@orb_deck/shared-types';

@Injectable()
export class WorkflowStateManager {
  private readonly states: Map<string, DeckGeneratorState> = new Map();

  updateState(sessionId: string, state: DeckGeneratorState): void {
    this.states.set(sessionId, state);
  }

  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  getState(sessionId: string): DeckGeneratorState | null {
    return this.states.get(sessionId) ?? null;
  }

  clearState(sessionId: string): void {
    this.states.delete(sessionId);
  }

  getAllActiveStates(): Map<string, DeckGeneratorState> {
    return new Map(this.states);
  }

  getActiveSessionCount(): number {
    return this.states.size;
  }
}
