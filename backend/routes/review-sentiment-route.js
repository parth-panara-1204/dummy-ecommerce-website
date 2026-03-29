const express = require('express');
const Minio = require('minio');

const router = express.Router();

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: Number(process.env.MINIO_PORT || 9000),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});

const minioBucket = process.env.MINIO_BUCKET || 'datalake';
const sentimentPrefix = 'review-sentiment/';

function listObjects(bucket, prefix) {
  return new Promise((resolve, reject) => {
    const objects = [];
    const stream = minioClient.listObjectsV2(bucket, prefix, true);

    stream.on('data', (obj) => {
      if (obj && obj.name) {
        objects.push(obj);
      }
    });
    stream.on('error', (err) => reject(err));
    stream.on('end', () => resolve(objects));
  });
}

function getObjectText(bucket, objectName) {
  return new Promise((resolve, reject) => {
    minioClient.getObject(bucket, objectName, (err, dataStream) => {
      if (err) {
        reject(err);
        return;
      }

      let body = '';
      dataStream.on('data', (chunk) => {
        body += chunk.toString('utf8');
      });
      dataStream.on('end', () => resolve(body));
      dataStream.on('error', (streamErr) => reject(streamErr));
    });
  });
}

async function loadSentimentRows({ limit = 100, maxFiles = 80 }) {
  const allObjects = await listObjects(minioBucket, sentimentPrefix);

  const files = allObjects
    .filter((obj) => obj.name.includes('/part-') || obj.name.startsWith(`${sentimentPrefix}part-`))
    .sort((a, b) => new Date(b.lastModified || 0) - new Date(a.lastModified || 0));

  const rows = [];
  for (const file of files.slice(0, maxFiles)) {
    if (rows.length >= limit) break;

    const content = await getObjectText(minioBucket, file.name);
    const lines = content.split('\n').filter(Boolean);

    for (const line of lines) {
      if (rows.length >= limit) break;
      try {
        const parsed = JSON.parse(line);
        rows.push(parsed);
      } catch (_err) {
        // Ignore malformed lines and continue processing others.
      }
    }
  }

  return rows;
}

function summarize(rows) {
  const summary = {
    total: rows.length,
    positive: 0,
    negative: 0,
    neutral: 0,
    positiveRate: 0,
    negativeRate: 0,
    neutralRate: 0,
    source: 'minio',
  };

  for (const row of rows) {
    if (row.sentiment === 'positive') summary.positive += 1;
    if (row.sentiment === 'negative') summary.negative += 1;
    if (row.sentiment === 'neutral') summary.neutral += 1;
  }

  if (summary.total > 0) {
    summary.positiveRate = Number((summary.positive / summary.total).toFixed(4));
    summary.negativeRate = Number((summary.negative / summary.total).toFixed(4));
    summary.neutralRate = Number((summary.neutral / summary.total).toFixed(4));
  }

  return summary;
}

router.get('/', async (req, res) => {
  try {
    const limit = Math.min(Number.parseInt(req.query.limit, 10) || 25, 200);
    const rows = await loadSentimentRows({ limit, maxFiles: 80 });

    return res.json({
      records: rows,
      summary: summarize(rows),
      source: 'minio',
    });
  } catch (err) {
    console.error('Failed to fetch review sentiment rows:', err);
    return res.status(500).json({ error: 'Failed to fetch review sentiment', details: err.message });
  }
});

router.get('/summary', async (req, res) => {
  try {
    const limit = Math.min(Number.parseInt(req.query.limit, 10) || 2000, 10000);
    const rows = await loadSentimentRows({ limit, maxFiles: 200 });

    return res.json({
      ...summarize(rows),
      sampledRows: rows.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to fetch review sentiment summary:', err);
    return res.status(500).json({ error: 'Failed to fetch review sentiment summary', details: err.message });
  }
});

module.exports = router;
