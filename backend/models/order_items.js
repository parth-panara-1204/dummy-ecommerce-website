const mongoose = require('mongoose')

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

  const maxItem = await this.constructor.findOne().sort({ order_item_id: -1 });
  this.order_item_id = maxItem ? maxItem.order_item_id + 1 : 1;
});

const orderItem = mongoose.model('order_items', orderItemSchema)
module.exports = orderItem