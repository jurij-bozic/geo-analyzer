import ky from 'ky';

export const openrouter = {
  chat: {
    completions: {
      create: async (params: {
        model: string;
        messages: Array<{ role: string; content: string }>;
        max_tokens?: number;
        temperature?: number;
      }) => {
        if (!process.env.OPENROUTER_API_KEY) {
          throw new Error('OPENROUTER_API_KEY environment variable is not set');
        }

        const response = await ky.post('https://openrouter.ai/api/v1/chat/completions', {
          json: params,
          headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'https://geo-analyzer.vercel.app',
            'X-Title': 'GEO Analyzer',
          },
          timeout: 30 * 1000, // 30 seconds
        }).json<{
          choices: Array<{
            message: {
              content: string;
            };
          }>;
        }>();
        return response;
      },
    },
  },
};

export const MODELS = {
  GPT4O: 'openai/gpt-4o',
  GPT4O_MINI: 'openai/gpt-4o-mini',
  GPT54_MINI: 'openai/gpt-5.4-mini',
  CLAUDE_SONNET: 'anthropic/claude-3-5-sonnet',
} as const;
