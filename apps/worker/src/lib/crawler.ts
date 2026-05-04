import ky from 'ky';
import * as cheerio from 'cheerio';
import { CrawledContent } from '@geo-analyzer/shared';

export async function crawlPage(url: string): Promise<CrawledContent> {
  try {
    // Fetch the HTML
    const html = await ky.get(url, { timeout: 10000 }).text();

    // Parse with cheerio
    const $ = cheerio.load(html);

    // Extract title
    const title = $('title').text().trim();

    // Extract meta description
    const metaDescription = $('meta[name="description"]').attr('content')?.trim() || '';

    // Extract headings
    const headings: string[] = [];
    $('h1, h2, h3').each((_, element) => {
      const text = $(element).text().trim();
      if (text) {
        headings.push(text);
      }
    });

    // Extract body text from paragraphs
    const bodyTextParts: string[] = [];
    $('p').each((_, element) => {
      const text = $(element).text().trim();
      if (text) {
        bodyTextParts.push(text);
      }
    });
    let bodyText = bodyTextParts.join(' ');
    // Truncate to 5000 chars
    if (bodyText.length > 5000) {
      bodyText = bodyText.substring(0, 5000);
    }

    // Check for FAQ schema
    let hasFAQSchema = false;
    $('script[type="application/ld+json"]').each((_, element) => {
      try {
        const jsonText = $(element).html();
        if (jsonText) {
          const schema = JSON.parse(jsonText);
          if (schema['@type'] === 'FAQPage') {
            hasFAQSchema = true;
          }
        }
      } catch (e) {
        // Ignore JSON parsing errors
      }
    });

    return {
      title,
      metaDescription,
      headings,
      bodyText,
      hasFAQSchema,
    };
  } catch (error) {
    console.error('Error crawling page:', error);
    throw new Error(`Failed to crawl ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
