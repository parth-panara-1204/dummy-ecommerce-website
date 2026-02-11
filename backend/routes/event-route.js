const express = require('express');
const Event = require('../models/events.js');

const app = express();
app.use(express.json());

// Create a new event
app.post('/', async (req, res) => {
  try {
    const eventCount = await Event.countDocuments();
    const eventId = `E${String(eventCount + 1).padStart(8, '0')}`;
    
    // Create event description based on type
    let description = '';
    const userName = req.body.user_name || 'Guest';
    const productName = req.body.product_name || `Product #${req.body.product_id}`;
    
    switch(req.body.event_type) {
      case 'view':
        description = `${userName} viewed ${productName}`;
        break;
      case 'cart':
        description = `${userName} added ${productName} to cart`;
        break;
      case 'purchase':
        description = `${userName} purchased ${productName}`;
        break;
      case 'review':
        description = `${userName} reviewed ${productName}`;
        break;
      default:
        description = `${userName} interacted with ${productName}`;
    }
    
    const newEvent = new Event({
      event_id: eventId,
      user_id: req.body.user_id,
      user_name: req.body.user_name || 'Guest',
      product_id: req.body.product_id,
      product_name: req.body.product_name,
      event_type: req.body.event_type,
      event_description: description,
      event_timestamp: new Date()
    });
    
    await newEvent.save();
    res.status(201).json(newEvent);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to create event" });
  }
});

// Get all events
app.get('/', async (req, res) => {
  try {
    const events = await Event.find();
    res.json(events);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to get events" });
  }
});

module.exports = app;
