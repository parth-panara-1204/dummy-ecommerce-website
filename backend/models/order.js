const mongoose = require('mongoose')

const orderCounterSchema = new mongoose.Schema({
  _id: { type: String },
  seq: { type: Number, default: 0 }
});
const OrderCounter = mongoose.model('order_counter', orderCounterSchema);

const orderSchema = new mongoose.Schema({
  order_id: { type: Number, unique: true },
  user_id: { type: Number, required: true },
  amount: { type: Number, required: true },
  status: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});

orderSchema.pre("save", async function () {
  if (!this.isNew) return;

  const counter = await OrderCounter.findOneAndUpdate(
    { _id: 'order_id' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  this.order_id = counter.seq;
});

const Order = mongoose.model('order', orderSchema)
module.exports = Order
module.exports.OrderCounter = OrderCounter