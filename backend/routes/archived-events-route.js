const express = require('express');
const Event = require('../models/events.js');

const router = express.Router();

// GET /archived-events - fetch recent events from MongoDB
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(Number.parseInt(req.query.limit, 10) || 100, 500);
    const events = await Event.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.json({
      events,
      total: events.length,
      source: 'mongodb'
    });
  } catch (err) {
    console.error('Failed to fetch archived events:', err);
    res.status(500).json({ error: 'Failed to fetch archived events', details: err.message });
  }
});

// GET /archived-events/summary - stats
router.get('/summary', async (req, res) => {
  try {
    const count = await Event.countDocuments();
    const summary = {
      eventsStored: count,
      source: 'mongodb',
      lastUpdated: new Date().toISOString()
    };
    return res.json(summary);
  } catch (err) {
    console.error('Failed to get archived events summary:', err);
    res.status(500).json({ error: 'Failed to get summary', details: err.message });
  }
});

module.exports = router;
