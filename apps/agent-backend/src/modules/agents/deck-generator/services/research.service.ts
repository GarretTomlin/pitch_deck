import { Injectable } from '@nestjs/common';
import { BaseWorkflow } from '../base/base-workflow';
import { tavily } from '@tavily/core';
import { DeckGeneratorState, MarketResearch, Competitor } from '@orb_deck/shared-types';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import {
  JsonResponseParser,
  MarketResearchSchema,
} from '@orb_deck/utils';

@Injectable()
export class ResearchService extends BaseWorkflow {
  private readonly tavilyClient: ReturnType<typeof tavily>;

  constructor(aguiEmitter: any, configService: any) {
    super(aguiEmitter, configService, ResearchService.name);

    this.tavilyClient = tavily({
      apiKey: this.configService.get('TAVILY_API_KEY'),
    });
  }

  async performMarketResearch(
    state: DeckGeneratorState,
  ): Promise<MarketResearch> {
    const startTime = Date.now();
    const { userInput } = state;

    this.emitEvent(state.sessionId, {
      type: 'tool.call',
      data: {
        tool: 'market_research',
        args: userInput,
        timestamp: new Date(),
      },
    });

    try {
      // Perform searches
      const searchResults = await this.executeSearches(userInput);

      // Generate research insights
      const research = await this.analyzeSearchResults(
        searchResults,
        userInput,
      );

      this.emitEvent(state.sessionId, {
        type: 'tool.result',
        data: {
          tool: 'market_research',
          result: research,
          duration: Date.now() - startTime,
        },
      });

      return research;
    } catch (error) {
      this.logAndEmitError(state.sessionId, error as Error, 'market research');
      throw error;
    }
  }

  private async executeSearches(userInput: any) {
    const searchQueries = [
      `${userInput.industry} market size 2024 statistics`,
      `${userInput.companyName} competitors analysis ${userInput.industry}`,
      `${userInput.industry} trends 2024 future outlook`,
      `${userInput.problemStatement} solutions market opportunities`,
    ];

    const searchPromises = searchQueries.map(async (query) => {
      try {
        const response = await this.tavilyClient.search(query, {
          max_results: 5,
          // include_answer: true,
          // include_raw_content: false,
          // search_depth: "basic",
          // include_domains: [],
          // exclude_domains: []
        });
        return response;
      } catch (err) {
        this.logger.warn(`Search failed for query: ${query}`, err);
        return null;
      }
    });

    const results = await Promise.all(searchPromises);
    return results.filter((r) => r !== null);
  }

  private async analyzeSearchResults(
    searchResults: any[],
    userInput: any,
  ): Promise<MarketResearch> {
    const formattedResults = searchResults.map(result => ({
      query: result.query,
      results: result.results?.map((r: any) => ({
        title: r.title,
        content: r.content,
        url: r.url,
        score: r.score
      }))
    }));

    const researchPrompt = this.promptManager.render('market-research', {
      industry: userInput.industry,
      companyName: userInput.companyName,
      problemStatement: userInput.problemStatement,
      searchResults: formattedResults,
    });

    const systemMessage = new SystemMessage(
      'You are a market research analyst. Provide structured data analysis in JSON format only.',
    );

    const response = await this.model.invoke([
      systemMessage,
      new HumanMessage(researchPrompt),
    ]);

    const parsedResearch = JsonResponseParser.parse(
      response.content as string,
      MarketResearchSchema,
      { fuzzyMatch: true },
    );

    if (!parsedResearch) {
      throw new Error('Failed to parse market research response');
    }

    // Transform to ensure required properties are present
    const research: MarketResearch = {
      competitors: (parsedResearch.competitors || []).map((comp: any): Competitor => ({
        name: comp.name ?? '',
        description: comp.description ?? '',
        marketShare: comp.marketShare,
        strengths: comp.strengths ?? [],
        weaknesses: comp.weaknesses ?? [],
      })),
      marketSize: parsedResearch.marketSize ?? '',
      trends: parsedResearch.trends ?? [],
      insights: parsedResearch.insights ?? [],
    };

    return research;
  }
}