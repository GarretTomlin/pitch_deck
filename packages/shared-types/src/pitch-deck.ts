export interface User {
    id: string;
    email: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
  }
  
  export interface PitchDeck {
    id: string;
    userId: string;
    title: string;
    companyName: string;
    industry: string;
    slides: Slide[];
    metadata: DeckMetadata;
    version: number;
    createdAt: Date;
    updatedAt: Date;
  }
  
  export interface Slide {
    id: string;
    title: string;
    type: SlideType;
    content: SlideContent;
    speakerNotes: string;
    order: number;
    metadata: SlideMetadata;
  }
  
  export type SlideType = 
    | 'title'
    | 'problem'
    | 'solution'
    | 'market'
    | 'business-model'
    | 'financials'
    | 'team'
    | 'competition'
    | 'traction'
    | 'ask'
    | 'custom';
  
  export interface SlideContent {
    text: string;
    bulletPoints?: string[];
    images?: ImageAsset[];
    charts?: ChartData[];
    layout: string;
  }
  
  export interface ImageAsset {
    url: string;
    alt: string;
    placement: 'left' | 'right' | 'center' | 'background';
  }
  
  export interface ChartData {
    type: 'bar' | 'line' | 'pie';
    data: any;
    config: any;
  }
  
  export interface DeckMetadata {
    problemStatement: string;
    solution: string;
    targetMarket: string;
    businessModel: string;
    financials: {
      revenue?: string;
      fundingNeeded?: string;
    };
  }
  
  export interface SlideMetadata {
    aiGenerated: boolean;
    lastAiUpdate?: Date;
    userEdited: boolean;
    template?: string;
  }
  
  export interface GenerateDeckRequest {
    companyName: string;
    industry: string;
    problemStatement: string;
    solution: string;
    businessModel?: string;
    targetMarket?: string;
    fundingAmount?: string;
  }
  
  export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    slideId?: string;
    timestamp: Date;
  }