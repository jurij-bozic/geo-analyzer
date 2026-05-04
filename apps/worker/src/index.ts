import express from 'express';
import { scanQueue } from './queues/scanQueue';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;

// POST /jobs/scan - Enqueue a new scan job
app.post('/jobs/scan', async (req, res): Promise<void> => {
  try {
    const { scanId, brandName, url } = req.body;

    if (!scanId || !brandName || !url) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Enqueue the crawl job
    await scanQueue.add(
      'crawl',
      { scanId, brandName, url },
      { attempts: 3, backoff: { type: 'exponential', delay: 1000 } }
    );

    res.status(202).json({ message: 'Job enqueued' });
  } catch (error) {
    console.error('Error enqueuing job:', error);
    res.status(500).json({ error: 'Failed to enqueue job' });
  }
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Worker service running on port ${PORT}`);
});
