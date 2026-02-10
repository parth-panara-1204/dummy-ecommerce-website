const mongoose = require("mongoose")
const order = require('../models/order.js')
const express = require('express')

const app = express()
app.use(express.json())

app.post("/", async (req, res) => {
  try {
    const order = new Order(req.body);
    await order.save(); // pre hook runs here
    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = app