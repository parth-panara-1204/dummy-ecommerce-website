const mongoose = require("mongoose")
const express = require('express')
const cors = require('cors')

const product_route = require('./routes/product-route.js')
const user_route = require('./routes/user-route.js')
const order_route = require('./routes/order-route.js')
const order_items  = require('./routes/order-item-route.js')
const review_route = require('./routes/review-route.js')
const event_route = require('./routes/event-route.js')

const app = express();
app.use(cors());
app.use(express.json());
app.use('/products', product_route)
app.use('/users', user_route)
app.use('/orders', order_route)
app.use('/order_items', order_items)
app.use('/reviews', review_route)
app.use('/events', event_route)

mongoose.connect("mongodb://localhost:27017/e-commerce").then(() => {
    console.log('connected to Mongodb');
}).catch((err) => {
    console.error(err);
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});