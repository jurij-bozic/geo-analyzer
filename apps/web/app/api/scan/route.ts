import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import ky from 'ky';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { brandName, url } = body;

    // Validate inputs
    if (!brandName || typeof brandName !== 'string') {
      return NextResponse.json(
        { error: 'brandName is required and must be a string' },
        { status: 400 }
      );
    }

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'url is required and must be a string' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'url must be a valid URL' },
        { status: 400 }
      );
    }

    // Create scan record
    const scan = await prisma.scan.create({
      data: {
        brandName,
        url,
        status: 'pending',
      },
    });

    // Enqueue job in worker
    try {
      await ky.post(`${process.env.WORKER_URL}/jobs/scan`, {
        json: { scanId: scan.id, brandName, url },
      });
    } catch (error) {
      console.error('Error enqueuing job:', error);
      // Don't fail the response, the job might still be queued
    }

    return NextResponse.json({ scanId: scan.id }, { status: 201 });
  } catch (error) {
    console.error('Error creating scan:', error);
    return NextResponse.json(
      { error: 'Failed to create scan' },
      { status: 500 }
    );
  }
}
