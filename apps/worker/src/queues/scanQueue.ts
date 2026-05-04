import 'dotenv/config';
import { Queue, Worker } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { crawlPage } from '../lib/crawler';
import { inferNiche, getPrompts } from '../lib/prompts';
import { openrouter, MODELS } from '../lib/openrouter';

const prisma = new PrismaClient();

// Parse Redis URL: redis://user:pass@host:port
const parseRedisUrl = (url: string) => {
  try {
    const redisUrl = new URL(url);
    return {
      host: redisUrl.hostname,
      port: parseInt(redisUrl.port),
      username: redisUrl.username || 'default',
      password: redisUrl.password,
    };
  } catch (error) {
    console.error('Failed to parse Redis URL:', error);
    return { host: 'localhost', port: 6379 };
  }
};

const redis = process.env.REDIS_URL 
  ? parseRedisUrl(process.env.REDIS_URL)
  : { host: 'localhost', port: 6379 };

console.log(`\n✓ Redis Configuration:`);
console.log(`  Host: ${redis.host}`);
console.log(`  Port: ${redis.port}`);
console.log(`  Auth: ${redis.password ? 'yes' : 'no'}\n`);

export const scanQueue = new Queue('scan', { connection: redis });

// Add queue error listeners
scanQueue.on('error', (error) => {
  console.error('Queue error:', error);
});

// Unified worker that handles all job types
const worker = new Worker(
  'scan',
  async (job) => {
    const { scanId, brandName, url } = job.data;

    try {
      if (job.name === 'crawl') {
        // Update status to crawling
        await prisma.scan.update({
          where: { id: scanId },
          data: { status: 'crawling' },
        });
        console.log(`[crawl] Processing scan ${scanId}: ${url}`);

        // Crawl the page
        const crawled = await crawlPage(url);

        // Save crawled content to database
        await prisma.scan.update({
          where: { id: scanId },
          data: {
            crawledTitle: crawled.title,
            crawledMeta: crawled.metaDescription,
            crawledHeadings: crawled.headings,
            crawledBody: crawled.bodyText,
            hasFAQSchema: crawled.hasFAQSchema,
          },
        });

        console.log(`[crawl] Completed for scan ${scanId}`);
        return { scanId, brandName, url };
      }

      if (job.name === 'llm-query') {
        // Update status to querying
        await prisma.scan.update({
          where: { id: scanId },
          data: { status: 'querying' },
        });
        console.log(`[llm-query] Processing scan ${scanId}`);

        // Fetch the scan with crawled content
        const scan = await prisma.scan.findUnique({
          where: { id: scanId },
        });

        if (!scan) {
          throw new Error(`Scan ${scanId} not found`);
        }

        // Infer niche from crawled content
        const niche = await inferNiche(
          scan.crawledTitle || '',
          scan.crawledMeta || ''
        );
        console.log(`[llm-query] Inferred niche: ${niche}`);

        // Get 7 prompts for this niche and brand
        const prompts = await getPrompts(brandName, niche);
        console.log(`[llm-query] Generated 7 prompts, will make 14 LLM calls`);

        // Call LLM APIs: 7 prompts × 2 models
        const models = [MODELS.GPT4O, MODELS.CLAUDE_SONNET];
        const llmCalls = [];

        for (const prompt of prompts) {
          for (const model of models) {
            llmCalls.push(
              (async () => {
                try {
                  console.log(`[llm-query] Calling ${model} with prompt...`);
                  
                  const response = await openrouter.chat.completions.create({
                    model,
                    messages: [
                      {
                        role: 'user',
                        content: prompt,
                      },
                    ],
                  });

                  const responseText = response.choices[0]?.message?.content || '';

                  // Check if brand is mentioned
                  const brandMentioned = responseText
                    .toLowerCase()
                    .includes(brandName.toLowerCase());

                  // Extract competitor names (simple heuristic: capitalized words after "like", "such as", etc.)
                  const competitorsMentioned: string[] = [];
                  const patterns = [
                    /(?:like|such as|alternatives to|competitors include|products like)([^.]*)/gi,
                    /(?:instead of|rather than)([^.]*)/gi,
                  ];

                  for (const pattern of patterns) {
                    let match;
                    while ((match = pattern.exec(responseText)) !== null) {
                      const mentions = match[1]
                        .split(/[,;]/)
                        .map((s) => s.trim())
                        .filter((s) => s.length > 0 && s.length < 50)
                        .filter((s) => /^[A-Z]/.test(s)); // Only capitalized words

                      competitorsMentioned.push(...mentions);
                    }
                  }

                  // Save LLM result
                  await prisma.lLMResult.create({
                    data: {
                      scanId,
                      model,
                      prompt,
                      response: responseText,
                      brandMentioned,
                      competitorsMentioned: [...new Set(competitorsMentioned)], // Deduplicate
                    },
                  });

                  console.log(
                    `[llm-query] Saved ${model} result: brandMentioned=${brandMentioned}, competitors=${competitorsMentioned.length}`
                  );

                  return { model, responseText, brandMentioned };
                } catch (error) {
                  console.error(`[llm-query] Error calling ${model}:`, error);
                  // Don't rethrow - let other calls complete even if one fails
                  return null;
                }
              })()
            );
          }
        }

        // Execute all LLM calls in parallel
        const results = await Promise.all(llmCalls);
        const successCount = results.filter((r) => r !== null).length;
        console.log(`[llm-query] Completed ${successCount}/${llmCalls.length} LLM calls`);

        return { scanId, brandName, url };
      }

      if (job.name === 'recommend') {
        // Update status to analyzing
        await prisma.scan.update({
          where: { id: scanId },
          data: { status: 'analyzing' },
        });
        console.log(`[recommend] Processing scan ${scanId}`);

        // Fetch all LLM results and scan
        const scan = await prisma.scan.findUnique({
          where: { id: scanId },
          include: { llmResults: true },
        });

        if (!scan) {
          throw new Error(`Scan ${scanId} not found`);
        }

        // Calculate statistics
        const brandMentionCount = scan.llmResults.filter(
          (r) => r.brandMentioned
        ).length;
        const totalResults = scan.llmResults.length;

        // Aggregate competitors by frequency
        const competitorFreq = new Map<string, number>();
        for (const result of scan.llmResults) {
          for (const competitor of result.competitorsMentioned) {
            competitorFreq.set(
              competitor,
              (competitorFreq.get(competitor) || 0) + 1
            );
          }
        }

        // Get top 5 competitors
        const topCompetitors = Array.from(competitorFreq.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name]) => name)
          .join(', ');

        // Create prompt for recommendation generation
        const recommendationPrompt = `You are a GEO (Generative Engine Optimization) expert. Based on the analysis below, provide 5 specific, actionable recommendations to improve how often this brand appears in AI-generated responses.

Website: ${brandName}
URL: ${scan.url}

Analysis Results:
- Brand mentioned in ${brandMentionCount}/${totalResults} LLM responses
- Top competitors mentioned: ${topCompetitors || 'N/A'}
- Website title: ${scan.crawledTitle}
- Website has FAQ schema: ${scan.hasFAQSchema}

Provide exactly 5 recommendations in JSON format like this (no other text):
[
  {"type": "content|schema|authority|structure", "title": "...", "description": "..."},
  ...
]`;

        console.log(`[recommend] Generating recommendations with GPT-4o`);

        // Call GPT-4o to generate recommendations
        const response = await openrouter.chat.completions.create({
          model: MODELS.GPT4O,
          messages: [
            {
              role: 'user',
              content: recommendationPrompt,
            },
          ],
        });

        const responseText = response.choices[0]?.message?.content || '[]';

        // Parse recommendations from response
        let recommendations: Array<{
          type: 'content' | 'schema' | 'authority' | 'structure';
          title: string;
          description: string;
        }> = [];

        try {
          // Extract JSON from response (might be wrapped in markdown code blocks)
          const jsonMatch = responseText.match(/\[[\s\S]*\]/);
          const jsonStr = jsonMatch ? jsonMatch[0] : responseText;
          recommendations = JSON.parse(jsonStr);
          console.log(`[recommend] Parsed ${recommendations.length} recommendations`);
        } catch (error) {
          console.error('[recommend] Failed to parse recommendations:', error);
          // Provide fallback recommendations
          recommendations = [
            {
              type: 'content',
              title: 'Improve Content Quality',
              description: 'Add more detailed, fact-dense content that directly answers common questions in your industry.',
            },
            {
              type: 'schema',
              title: 'Add Structured Data',
              description: 'Implement FAQ, Product, or Organization schema to help AI models better understand your content.',
            },
            {
              type: 'authority',
              title: 'Build Authority Signals',
              description: 'Include citations, statistics, and expert quotes to increase credibility in AI responses.',
            },
            {
              type: 'structure',
              title: 'Restructure Content',
              description: 'Use clear headings, bullet points, and tables to make content scannable for AI models.',
            },
            {
              type: 'content',
              title: 'Create Industry Guides',
              description: 'Publish comprehensive guides that position your brand as a thought leader.',
            },
          ];
        }

        // Save each recommendation
        for (const rec of recommendations) {
          await prisma.recommendation.create({
            data: {
              scanId,
              type: rec.type,
              title: rec.title,
              description: rec.description,
            },
          });
        }

        console.log(`[recommend] Saved ${recommendations.length} recommendations`);

        // Update status to complete
        await prisma.scan.update({
          where: { id: scanId },
          data: { status: 'complete' },
        });

        console.log(`[recommend] Completed for scan ${scanId}`);
        return { scanId, brandName, url };
      }

      throw new Error(`Unknown job type: ${job.name}`);
    } catch (error) {
      console.error(`Job ${job.name} error for scan ${scanId}:`, error);
      await prisma.scan.update({
        where: { id: scanId },
        data: { status: 'failed' },
      }).catch(err => console.error('Failed to update scan status:', err));
      throw error;
    }
  },
  { connection: redis }
);

// Error handlers
worker.on('error', (error) => {
  console.error('Worker error:', error);
});

worker.on('failed', (job, error) => {
  console.error(`Job ${job?.name} (${job?.id}) failed:`, error.message);
});

worker.on('completed', (job) => {
  console.log(`Job ${job.name} (${job.id}) completed`);

  // Chain to next job
  if (job.name === 'crawl') {
    console.log(`Enqueueing llm-query for scan ${job.data.scanId}`);
    scanQueue.add('llm-query', job.data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });
  } else if (job.name === 'llm-query') {
    console.log(`Enqueueing recommend for scan ${job.data.scanId}`);
    scanQueue.add('recommend', job.data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });
  }
});
