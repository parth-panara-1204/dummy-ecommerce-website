const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  product_id: { type: String, required: true },
  product_name: { type: String, required: true },
  category: { type: String, required: true },
  brand: { type: String, required: true },
  price: { type: Number, required: true },
  rating: { type: Number, required: true }
});

const product = mongoose.model("product", productSchema);
module.exports = product