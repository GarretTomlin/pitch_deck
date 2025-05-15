import { DeckGeneratorState } from '@orb_deck/shared-types';

export interface AgentState {
    id: string;
    status: 'idle' | 'processing' | 'completed' | 'error';
    messages: Message[];
    context: Record<string, any>;
  }
  
  export interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
    metadata?: Record<string, any>;
  }



  export interface ExtendedDeckGeneratorState extends DeckGeneratorState {
    progress?: number;
  }