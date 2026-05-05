import OpenAI from 'openai';

export const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': 'https://geo-analyzer.vercel.app',
    'X-Title': 'GEO Analyzer',
  },
  timeout: 30 * 1000, // 30 seconds
});

export const MODELS = {
  GPT4O: 'openai/gpt-4o',
  GPT4O_MINI: 'openai/gpt-4o-mini',
  GPT45_MINI: 'openai/gpt-5.4-mini',
  CLAUDE_SONNET: 'anthropic/claude-3-5-sonnet',
} as const;
