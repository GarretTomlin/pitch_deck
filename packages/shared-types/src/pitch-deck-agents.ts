import { AgUIEvent } from './events';
import { 
  GenerateDeckRequest, 
  Slide, 
  ChatMessage,
  SlideType 
} from './pitch-deck';

export interface Refinement {
  slideId: string;
  feedback: string;
  timestamp: Date;
  status: 'pending' | 'applied';
}

export interface Competitor {
  name: string;
  description: string;
  marketShare?: string;
  strengths: string[];
  weaknesses: string[];
}

export interface DeckGeneratorState {
  userInput: GenerateDeckRequest;
  research: MarketResearch | null;
  outline: DeckOutline | null;
  slides: Slide[];
  refinements: Refinement[];
  currentStep: WorkflowStep;
  messages: ChatMessage[];
  error?: {
    message: string;
    stack?: string;
    node?: string;
    timestamp: Date;
  };
  sessionId: string;
  deckId?: string;
}

export type WorkflowStep = 
  | 'initial'
  | 'research'
  | 'outline'
  | 'content-generation'
  | 'refinement'
  | 'complete';

export interface MarketResearch {
  competitors: Competitor[];
  marketSize: string;
  trends: string[];
  insights: string[];
}

export interface DeckOutline {
  suggestedSlides: SlideOutline[];
  narrative: string;
  keyMessages: string[];
}

export interface SlideOutline {
  type: SlideType;
  title: string;
  mainPoints: string[];
  suggestedVisuals: string[];
}

export interface PitchDeckAgentEvent extends AgUIEvent {
  agentId: string;
  workflowStep: WorkflowStep;
}

export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface AgentConfig {
  id: string;
  name: string;
  role: string;
  tools: Tool[];
  temperature: number;
}