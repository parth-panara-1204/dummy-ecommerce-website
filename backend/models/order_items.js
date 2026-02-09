const mongoose = require('mongoose')

const order_items = mongoose.Schema({
    order_item_id: {type: Number, required: true},
    order_id: {type: Number, required: true},
    product_id: {type: Number, required: true},
    user_id: {type: Number,Numberrequired: true},
    quantity: {type: Number, required: true},
    item_price: {type: Number, required: true},
    item_total: {type: Number, required: true},
})

const orderItem = mongoose.model('order_items', order_items)
module.exports = orderItem