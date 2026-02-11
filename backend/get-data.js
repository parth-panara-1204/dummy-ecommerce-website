const mongoose = require('mongoose');
const product = require('./models/products.js');
const axios = require('axios');

mongoose.connect("mongodb://localhost:27017/e-commerce").then(() => {
    console.log('connected to Mongodb');
}).catch((err) => {
    console.error(err);
});

async function get_data() {
  try {
    // Clear existing products to avoid duplicates
    await product.deleteMany({});
    console.log('Cleared existing products');

    const response = await axios.get("https://dummyjson.com/products");

    const products = response.data.products.map(p => ({
      product_id: p.id,
      product_name: p.title,
      category: p.category,
      brand: p.brand,
      price: p.price,
      rating: p.rating
    }));

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