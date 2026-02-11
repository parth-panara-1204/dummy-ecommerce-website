const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  event_id: { type: String, unique: true },
  user_id: { type: String },
  user_name: { type: String }, // Name of user who performed action
  product_id: { type: Number },
  product_name: { type: String }, // Name of product involved
  event_type: { type: String, required: true }, // view, cart, purchase, review
  event_description: { type: String }, // Human-readable description
  event_timestamp: { type: Date, default: Date.now }
});

const Event = mongoose.model('Event', eventSchema);
module.exports = Event;
