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
    const newOrder = new order(req.body);
    await newOrder.save(); // pre hook runs here
    res.status(201).json(newOrder);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = app