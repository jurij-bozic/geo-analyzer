import { Queue, Worker } from 'bullmq';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const redis = {
  host: process.env.REDIS_URL?.split('@')[1]?.split(':')[0] || 'localhost',
  port: parseInt(process.env.REDIS_URL?.split(':')?.pop() || '6379'),
};

export const scanQueue = new Queue('scan', { connection: redis });

// Crawl job processor
const crawlWorker = new Worker(
  'scan',
  async (job) => {
    const { scanId, brandName, url } = job.data;

    try {
      // Update status to crawling
      await prisma.scan.update({
        where: { id: scanId },
        data: { status: 'crawling' },
      });

      console.log(`Crawling ${url} for scan ${scanId}`);

      // TODO: Implement actual crawling logic
      // For now, just wait a bit to simulate work
      await new Promise((resolve) => setTimeout(resolve, 1000));

      return { scanId, brandName, url };
    } catch (error) {
      console.error('Crawl job error:', error);
      await prisma.scan.update({
        where: { id: scanId },
        data: { status: 'failed' },
      });
      throw error;
    }
  },
  { connection: redis }
);

// LLM Query job processor
const llmQueryWorker = new Worker(
  'scan',
  async (job) => {
    const { scanId, brandName, url } = job.data;

    try {
      // Update status to querying
      await prisma.scan.update({
        where: { id: scanId },
        data: { status: 'querying' },
      });

      console.log(`Querying LLMs for scan ${scanId}`);

      // TODO: Implement actual LLM querying logic
      // For now, just wait a bit to simulate work
      await new Promise((resolve) => setTimeout(resolve, 1000));

      return { scanId, brandName, url };
    } catch (error) {
      console.error('LLM Query job error:', error);
      await prisma.scan.update({
        where: { id: scanId },
        data: { status: 'failed' },
      });
      throw error;
    }
  },
  { connection: redis }
);

// Recommendation job processor
const recommendWorker = new Worker(
  'scan',
  async (job) => {
    const { scanId, brandName, url } = job.data;

    try {
      // Update status to analyzing
      await prisma.scan.update({
        where: { id: scanId },
        data: { status: 'analyzing' },
      });

      console.log(`Generating recommendations for scan ${scanId}`);

      // TODO: Implement actual recommendation generation logic
      // For now, just wait a bit to simulate work
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Update status to complete
      await prisma.scan.update({
        where: { id: scanId },
        data: { status: 'complete' },
      });

      return { scanId, brandName, url };
    } catch (error) {
      console.error('Recommendation job error:', error);
      await prisma.scan.update({
        where: { id: scanId },
        data: { status: 'failed' },
      });
      throw error;
    }
  },
  { connection: redis }
);

// Chain jobs via completion events
crawlWorker.on('completed', async (job) => {
  console.log(`Crawl job ${job.id} completed, enqueuing LLM query job`);
  await scanQueue.add(
    'llm-query',
    job.data,
    { attempts: 3, backoff: { type: 'exponential', delay: 1000 } }
  );
});

llmQueryWorker.on('completed', async (job) => {
  console.log(`LLM query job ${job.id} completed, enqueuing recommendation job`);
  await scanQueue.add(
    'recommend',
    job.data,
    { attempts: 3, backoff: { type: 'exponential', delay: 1000 } }
  );
});

recommendWorker.on('completed', async (job) => {
  console.log(`Recommendation job ${job.id} completed`);
});

// Handle errors
[crawlWorker, llmQueryWorker, recommendWorker].forEach((worker) => {
  worker.on('failed', async (job, err) => {
    console.error(`Job ${job?.id} failed:`, err);
  });
});
