const mongoose = require('mongoose')
const Counter = require('../models/counter.js')

const orderItemSchema = new mongoose.Schema({
  order_item_id: { type: Number, unique: true },
  order_id: { type: Number, required: true },
  product_id: { type: Number, required: true },
  user_id: { type: Number, required: true },
  quantity: { type: Number, required: true },
  item_price: { type: Number, required: true },
  item_total: { type: Number, required: true }
});

orderItemSchema.pre("save", async function () {
  if (!this.isNew) return;

  const counter = await Counter.findByIdAndUpdate(
    { _id: "order_item_id" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  this.order_item_id = counter.seq;
});

const orderItem = mongoose.model('order_items', orderItemSchema)
module.exports = orderItem