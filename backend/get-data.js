const mongoose = require('mongoose');
const product = require('./models/products.js');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

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

    const csvPath = path.join(__dirname, '..', 'ecommerce_dataset', 'products.csv');

    const products = await new Promise((resolve, reject) => {
      const records = [];

      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (row) => {
          records.push({
            product_id: Number(row.product_id),
            product_name: row.product_name,
            category: row.category,
            brand: row.brand,
            price: Number(row.price),
            rating: Number(row.rating),
            image_filename: row.image_filename || undefined
          });
        })
        .on('end', () => resolve(records))
        .on('error', (err) => reject(err));
    });

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