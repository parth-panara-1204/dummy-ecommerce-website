const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  review_id: { type: String, unique: true },
  order_id: { type: String },
  product_id: { type: Number, required: true },
  user_id: { type: String },
  rating: { type: Number, required: true },
  review_text: { type: String, required: true },
  review_date: { type: Date, default: Date.now }
});

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;
