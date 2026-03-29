const OrderItem = require("../models/order_items.js");
const express = require('express')

const app = express()
app.use(express.json())

app.get("/", async (req, res) => {
  try {
    const items = await OrderItem.find();
    res.json(items);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to get order items" });
  }
});

app.post("/", async (req, res) => {
  try {
    const { order_id, product_id, user_id, quantity, item_price, item_total } = req.body;

    // Validate and convert numeric fields
    const numOrderId = Number(order_id);
    const numProductId = Number(product_id);
    const numUserId = Number(user_id);
    const numQuantity = Number(quantity);
    const numItemPrice = Number(item_price);
    const numItemTotal = Number(item_total);

    if (isNaN(numOrderId) || isNaN(numProductId) || isNaN(numUserId) || isNaN(numQuantity) || isNaN(numItemPrice) || isNaN(numItemTotal)) {
      return res.status(400).json({ error: "All numeric fields must be valid numbers" });
    }

    const item = new OrderItem({
      order_id: numOrderId,
      product_id: numProductId,
      user_id: numUserId,
      quantity: numQuantity,
      item_price: numItemPrice,
      item_total: numItemTotal
    });
    await item.save();
    res.status(201).json(item);
  } catch (err) {
    console.error('Order item creation error:', err);
    res.status(400).json({ error: err.message, details: err.toString() });
  }
});

module.exports = app