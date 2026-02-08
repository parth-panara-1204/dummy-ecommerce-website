const mongoose = require('mongoose');
const product = require('./models/products.js');
const axios = require('axios');

mongoose.connect("mongodb://localhost:27017/ecommerce").then(() => {
    console.log('connected to Mongodb');
}).catch((err) => {
    console.error(err);
});

async function get_data() {
  try {
    const response = await axios.get("https://dummyjson.com/products");

    const products = response.data.products;

    await product.insertMany(products);

    console.log('saved!')

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
    console.log('disconnected from MongoDB')
  }
};

get_data();