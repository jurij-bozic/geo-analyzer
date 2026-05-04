import 'dotenv/config';
import express from 'express';
import { Job } from 'bullmq';
import { scanQueue } from './queues/scanQueue';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;

// POST /jobs/scan - Enqueue a new scan job
app.post('/jobs/scan', async (req, res): Promise<void> => {
  try {
    const { scanId, brandName, url } = req.body;

    console.log(`[API] Received scan request:`, { scanId, brandName, url });

    if (!scanId || !brandName || !url) {
      console.warn('[API] Missing required fields');
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Enqueue the crawl job with timeout
    console.log(`[API] Adding crawl job to queue for scan ${scanId}`);
    
    try {
      const jobPromise = scanQueue.add(
        'crawl',
        { scanId, brandName, url },
        { attempts: 3, backoff: { type: 'exponential', delay: 1000 } }
      );

      // Add 5 second timeout to job enqueue
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Job enqueue timeout after 5s')), 5000)
      );

      const job = await Promise.race([jobPromise, timeoutPromise]) as Job;

      console.log(`[API] Crawl job ${job.id} enqueued successfully`);
      res.status(202).json({ message: 'Job enqueued', jobId: job.id });
    } catch (queueError) {
      console.error('[API] Queue/Redis error:', queueError instanceof Error ? queueError.message : String(queueError));
      throw queueError;
    }
  } catch (error) {
    console.error('[API] Error enqueuing job:', error);
    res.status(500).json({ error: 'Failed to enqueue job', details: error instanceof Error ? error.message : String(error) });
  }
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`\n✓ Worker service running on port ${PORT}`);
  console.log(`  Queue: scan`);
  console.log(`  Accepting jobs at POST /jobs/scan\n`);
});
