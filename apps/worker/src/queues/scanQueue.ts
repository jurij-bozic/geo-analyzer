import 'dotenv/config';
import { Queue, Worker } from 'bullmq';
import { PrismaClient } from '@prisma/client';

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
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return { scanId, brandName, url };
      }

      if (job.name === 'llm-query') {
        // Update status to querying
        await prisma.scan.update({
          where: { id: scanId },
          data: { status: 'querying' },
        });
        console.log(`[llm-query] Processing scan ${scanId}`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return { scanId, brandName, url };
      }

      if (job.name === 'recommend') {
        // Update status to analyzing
        await prisma.scan.update({
          where: { id: scanId },
          data: { status: 'analyzing' },
        });
        console.log(`[recommend] Processing scan ${scanId}`);
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Update status to complete
        await prisma.scan.update({
          where: { id: scanId },
          data: { status: 'complete' },
        });
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
