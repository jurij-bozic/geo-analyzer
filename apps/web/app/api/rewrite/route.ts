import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': 'https://geo-analyzer.vercel.app',
    'X-Title': 'GEO Analyzer',
  },
  timeout: 30 * 1000, // 30 seconds
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'text is required and must be a string' },
        { status: 400 }
      );
    }

    // Call GPT-4o to rewrite content
    const response = await openrouter.chat.completions.create({
      model: 'openai/gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You are a GEO (Generative Engine Optimization) expert. Rewrite the following web page content so that it is more likely to be cited by AI language models like ChatGPT and Claude. Make it authoritative, structured, and fact-dense. Use clear headings, include specific claims, and answer common questions directly. Return only the rewritten content.',
        },
        {
          role: 'user',
          content: text,
        },
      ],
    });

    const rewritten = response.choices[0]?.message?.content || '';

    return NextResponse.json({ rewritten });
  } catch (error) {
    console.error('Error rewriting content:', error);
    return NextResponse.json(
      { error: 'Failed to rewrite content' },
      { status: 500 }
    );
  }
}
