import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { StatusResponse } from '@geo-analyzer/shared';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const { id } = params;

    // Fetch only the status field
    const scan = await prisma.scan.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!scan) {
      return NextResponse.json(
        { error: 'Scan not found' },
        { status: 404 }
      );
    }

    const response: StatusResponse = {
      status: scan.status as any,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching scan status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scan status' },
      { status: 500 }
    );
  }
}
