const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  review_id: { type: Number, unique: true },
  order_id: { type: Number },
  product_id: { type: Number, required: true },
  user_id: { type: Number },
  rating: { type: Number, required: true },
  review_text: { type: String, required: true },
  review_date: { type: Date, default: Date.now }
});

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;
