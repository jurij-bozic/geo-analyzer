import { PrismaClient } from '@prisma/client';
import { crawlPage } from '../lib/crawler';

const prisma = new PrismaClient();

export async function crawlJob(scanId: string, url: string): Promise<void> {
  try {
    // Crawl the page
    const crawledContent = await crawlPage(url);

    // Save crawled content to database
    await prisma.scan.update({
      where: { id: scanId },
      data: {
        crawledTitle: crawledContent.title,
        crawledMeta: crawledContent.metaDescription,
        crawledHeadings: crawledContent.headings,
        crawledBody: crawledContent.bodyText,
        hasFAQSchema: crawledContent.hasFAQSchema,
      },
    });
  } catch (error) {
    console.error('Crawl job error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
