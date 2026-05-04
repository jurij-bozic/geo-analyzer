import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ScanResult } from '@geo-analyzer/shared';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const { id } = params;

    // Fetch scan with relations
    const scan = await prisma.scan.findUnique({
      where: { id },
      include: {
        llmResults: true,
        recommendations: true,
      },
    });

    if (!scan) {
      return NextResponse.json(
        { error: 'Scan not found' },
        { status: 404 }
      );
    }

    // Map to ScanResult type
    const result: ScanResult = {
      id: scan.id,
      brandName: scan.brandName,
      url: scan.url,
      status: scan.status as any,
      crawledContent: scan.crawledTitle
        ? {
            title: scan.crawledTitle,
            metaDescription: scan.crawledMeta || '',
            headings: scan.crawledHeadings,
            bodyText: scan.crawledBody || '',
            hasFAQSchema: scan.hasFAQSchema,
          }
        : null,
      llmResults: scan.llmResults.map((result) => ({
        id: result.id,
        model: result.model as any,
        prompt: result.prompt,
        response: result.response,
        brandMentioned: result.brandMentioned,
        competitorsMentioned: result.competitorsMentioned,
      })),
      recommendations: scan.recommendations.map((rec) => ({
        id: rec.id,
        type: rec.type as any,
        title: rec.title,
        description: rec.description,
      })),
      createdAt: scan.createdAt.toISOString(),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching scan:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scan' },
      { status: 500 }
    );
  }
}
