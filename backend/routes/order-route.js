const mongoose = require("mongoose")
const order = require('../models/order.js')
const express = require('express')

const app = express()
app.use(express.json())

app.get("/", async (req, res) => {
  try {
    const orders = await order.find();
    res.json(orders);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to get orders" });
  }
});

app.post("/", async (req, res) => {
  try {
    const { user_id, amount, status } = req.body;

    // Validate required fields
    if (!user_id && user_id !== 0) {
      return res.status(400).json({ error: "user_id is required" });
    }
    if (!amount && amount !== 0) {
      return res.status(400).json({ error: "amount is required" });
    }
    if (!status) {
      return res.status(400).json({ error: "status is required" });
    }

    // Ensure numeric user_id
    const numUserId = Number(user_id);
    if (isNaN(numUserId)) {
      return res.status(400).json({ error: "user_id must be a number" });
    }

    // Ensure numeric amount
    const numAmount = Number(amount);
    if (isNaN(numAmount)) {
      return res.status(400).json({ error: "amount must be a number" });
    }

    const newOrder = new order({
      user_id: numUserId,
      amount: numAmount,
      status: String(status)
    });
    await newOrder.save(); // pre hook runs here
    res.status(201).json(newOrder);
  } catch (err) {
    console.error('Order creation error:', err);
    res.status(400).json({ error: err.message, details: err.toString() });
  }
});

module.exports = app