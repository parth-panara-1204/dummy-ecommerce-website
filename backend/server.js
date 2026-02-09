const mongoose = require("mongoose")
const Product = require('./models/products.js')
const express = require('express')

const product_route = require('./routes/product-route.js')
const user_route = require('./routes/user-route.js')

const app = express();
app.use(express.json());
app.use('/products', product_route)
app.use('/users', user_route)

mongoose.connect("mongodb://localhost:27017/e-commerce").then(() => {
    console.log('connected to Mongodb');
}).catch((err) => {
    console.error(err);
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});