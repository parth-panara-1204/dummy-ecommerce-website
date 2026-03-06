const express = require('express');
const Review = require('../models/reviews.js');

const app = express();
app.use(express.json());

app.get('/product/:productId', async (req, res) => {
  try {
    const reviews = await Review.find({ product_id: parseInt(req.params.productId) })
      .sort({ review_date: -1 });
    res.json(reviews);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to get reviews" });
  }
});

app.get('/', async (req, res) => {
  try {
    const reviews = await Review.find();
    res.json(reviews);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to get reviews" });
  }
});

app.post('/', async (req, res) => {
  try {
    const last = await Review.findOne().sort({ review_id: -1 });
    const reviewId = last ? last.review_id + 1 : 1;
    
    const newReview = new Review({
      review_id: reviewId,
      order_id: req.body.order_id || null,
      product_id: Number(req.body.product_id),
      user_id: Number(req.body.user_id),
      rating: Number(req.body.rating),
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
