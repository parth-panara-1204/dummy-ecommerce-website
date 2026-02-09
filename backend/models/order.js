const mongoose = require('mongoose')

const order = mongoose.Schema({
    order_id: {type: Number, required: true},
    user_id: {type: Number, required: true},
    order_date: {type: String, required: true},
    order_status: {type: String, enum: ['processing', 'completed', 'cancelled', 'returned', 'shipped'], required: true},
    total_amount: {type: Number, required: true},
})

const Order = mongoose.model('order', order)
module.exports = Order