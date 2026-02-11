const express = require('express');
const Review = require('../models/reviews.js');

const app = express();
app.use(express.json());

// Get reviews for a specific product
app.get('/product/:productId', async (req, res) => {
  try {
    const reviews = await Review.find({ product_id: parseInt(req.params.productId) });
    res.json(reviews);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to get reviews" });
  }
});

// Get all reviews
app.get('/', async (req, res) => {
  try {
    const reviews = await Review.find();
    res.json(reviews);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to get reviews" });
  }
});

// Create a new review
app.post('/', async (req, res) => {
  try {
    const reviewCount = await Review.countDocuments();
    const reviewId = `R${String(reviewCount + 1).padStart(8, '0')}`;
    
    const newReview = new Review({
      review_id: reviewId,
      order_id: req.body.order_id || null,
      product_id: req.body.product_id,
      user_id: req.body.user_id,
      rating: req.body.rating,
      review_text: req.body.review_text,
      review_date: new Date()
    });
    
    await newReview.save();
    res.status(201).json(newReview);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to create review" });
  }
});

module.exports = app;
