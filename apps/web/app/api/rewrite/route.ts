import { NextRequest, NextResponse } from 'next/server';
import ky from 'ky';

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

    // Call OpenRouter API directly
    const response = await ky.post('https://openrouter.ai/api/v1/chat/completions', {
      json: {
        model: 'openai/gpt-5.4-mini',
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
      },
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://geo-analyzer.vercel.app',
        'X-Title': 'GEO Analyzer',
      },
    }).json<{ choices: Array<{ message: { content: string } }> }>();

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
