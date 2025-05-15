export interface CreateDeckInput {
    userId: string;
    companyName: string;
    problemStatement: string;
    industry: string;
    solution: string;
    businessModel?: string;
    targetMarket?: string;
    fundingAmount?: string;
    targetInvestorType?: 'seed' | 'seriesA' | 'seriesB' | 'seriesC' | 'strategic';
    sessionId: string;
    additionalContext?: string;
    title?: string;
  }