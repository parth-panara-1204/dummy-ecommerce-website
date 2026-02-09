const mongoose = require('mongoose')

const order_items = mongoose.Schema({
    order_item_id: {type: String, required: true},
    order_id: {type: String, required: true},
    product_id: {type: String, required: true},
    user_id: {type: String, required: true},
    quantity: {type: Number, required: true},
    item_price: {type: Number, required: true},
    item_total: {type: Number, required: true},
})

const orderItem = mongoose.model('order_items', order_items)
module.exports = orderItem