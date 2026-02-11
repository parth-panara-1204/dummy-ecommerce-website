const mongoose = require('mongoose')

const orderSchema = new mongoose.Schema({
  order_id: { type: Number, unique: true },
  user_id: { type: Number, required: true },
  amount: { type: Number, required: true },
  status: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});

orderSchema.pre("save", async function () {
  if (!this.isNew) return;

  const maxOrder = await this.constructor.findOne().sort({ order_id: -1 });
  this.order_id = maxOrder ? maxOrder.order_id + 1 : 1;
});

const Order = mongoose.model('order', orderSchema)
module.exports = Order