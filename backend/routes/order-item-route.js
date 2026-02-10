const OrderItem = require("../models/order_items.js");
const express = require('express')

const app = express()
app.use(express.json())

app.post("/", async (req, res) => {
  try {
    const item = new OrderItem(req.body);
    await item.save();
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = app