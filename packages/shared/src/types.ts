export type ScanStatus = 'pending' | 'crawling' | 'querying' | 'analyzing' | 'complete' | 'failed';

export type LLMModel = 'openai/gpt-4o' | 'openai/gpt-5.4-mini' | 'anthropic/claude-3-5-sonnet';

export interface ScanInput {
  brandName: string;
  url: string;
}

export interface CrawledContent {
  title: string;
  metaDescription: string;
  headings: string[];
  bodyText: string;
  hasFAQSchema: boolean;
}

export interface LLMResultData {
  id: string;
  model: LLMModel;
  prompt: string;
  response: string;
  brandMentioned: boolean;
  competitorsMentioned: string[];
}

export interface RecommendationData {
  id: string;
  type: 'content' | 'schema' | 'authority' | 'structure';
  title: string;
  description: string;
}

export interface ScanResult {
  id: string;
  brandName: string;
  url: string;
  status: ScanStatus;
  crawledContent: CrawledContent | null;
  llmResults: LLMResultData[];
  recommendations: RecommendationData[];
  createdAt: string;
}

export interface StatusResponse {
  status: ScanStatus;
}
