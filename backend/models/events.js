const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  userId: { type: String },
  productId: { type: String },
  eventType: { type: String },
  timestamp: { type: Date, default: Date.now },
  amount: { type: Number },
  category: { type: String },
  quantity: { type: Number },
  // Keep snake_case IDs flexible because event producers may send string or numeric IDs.
  order_id: { type: String },
  user_id: { type: String },
  createdAt: { type: Date, default: Date.now, expire: 86400 } // Auto-delete after 24 hours
});

module.exports = mongoose.model('Event', eventSchema);
