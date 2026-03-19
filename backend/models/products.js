const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model("product_counter", counterSchema);

const productSchema = new mongoose.Schema(
  {
    product_id: { type: Number, unique: true },
    product_name: { type: String, required: true },
    category: { type: String, required: true },
    brand: { type: String, required: true },
    price: { type: Number, required: true },
    rating: { type: Number, required: true, default: 0 },
    stock: { type: Number, required: true, default: 0 },
    image_url: { type: String, default: "" },
    image_filename: { type: String },
  },
  { timestamps: true }
);

productSchema.pre("save", async function (next) {
  if (this.product_id != null) return next();
  const counter = await Counter.findByIdAndUpdate(
    { _id: "product_id" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  this.product_id = counter.seq;
  next();
});

const Product = mongoose.model("product", productSchema);

module.exports = Product;
module.exports.Counter = Counter;