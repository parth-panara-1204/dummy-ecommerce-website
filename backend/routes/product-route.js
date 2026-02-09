const mongoose = require("mongoose")
const Product = require('../models/products.js')
const express = require('express')

const app = express()
app.use(express.json())

app.get("/", async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    console.log(err)
    res.status(500).json({ error: "Failed to get products" });
  }
});

module.exports = app