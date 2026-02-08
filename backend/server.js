const mongoose = require("mongoose")
const Product = require('./models/products')
const express = require('express')

const app = express();
app.use(express.json());


mongoose.connect("mongodb://localhost:27017/ecommerce").then(() => {
    console.log('connected to Mongodb');
}).catch((err) => {
    console.error(err);
});


app.get("/products", async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    console.log(err)
    res.status(500).json({ error: "Failed to get products" });
  }
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});