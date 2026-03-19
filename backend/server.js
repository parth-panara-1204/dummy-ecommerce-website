const mongoose = require("mongoose")
const express = require('express')
const cors = require('cors')
const path = require('path')
const { connectProducer, sendEvent } = require('./kafkaProducer.js')

const product_route = require('./routes/product-route.js')
const user_route = require('./routes/user-route.js')
const order_route = require('./routes/order-route.js')
const order_items  = require('./routes/order-item-route.js')
const review_route = require('./routes/review-route.js')
const kafka_route = require('./routes/kafka-route.js')

const app = express();
app.use(cors());
// Allow image uploads via base64 data URLs from the admin form
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use('/assets', express.static(path.join(__dirname, '..', 'assets')));

connectProducer()

app.use('/products', product_route)
app.use('/users', user_route)
app.use('/orders', order_route)
app.use('/order_items', order_items)
app.use('/reviews', review_route)
app.use('/events', kafka_route)

mongoose.connect("mongodb://localhost:27017/e-commerce").then(async () => {
    console.log('connected to Mongodb');

    // Seed order_item_id counter from current max (only on first boot)
    const OrderItem = require('./models/order_items');
    const { Counter } = require('./models/order_items');
    const maxItem = await OrderItem.findOne().sort({ order_item_id: -1 });
    await Counter.findOneAndUpdate(
      { _id: 'order_item_id' },
      { $setOnInsert: { seq: maxItem ? maxItem.order_item_id : 0 } },
      { upsert: true }
    );

    // Seed order_id counter from current max (only on first boot)
    const Order = require('./models/order.js');
    const { OrderCounter } = require('./models/order.js');
    const maxOrder = await Order.findOne().sort({ order_id: -1 });
    await OrderCounter.findOneAndUpdate(
      { _id: 'order_id' },
      { $setOnInsert: { seq: maxOrder ? maxOrder.order_id : 0 } },
      { upsert: true }
    );

    // Seed product_id counter from current max (only on first boot)
    const Product = require('./models/products.js');
    const { Counter: ProductCounter } = require('./models/products.js');
    const maxProduct = await Product.findOne().sort({ product_id: -1 });
    await ProductCounter.findOneAndUpdate(
      { _id: 'product_id' },
      { $setOnInsert: { seq: maxProduct ? maxProduct.product_id : 0 } },
      { upsert: true }
    );

    console.log('counters ready');
}).catch((err) => {
    console.error(err);
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});