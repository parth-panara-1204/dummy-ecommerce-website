const WebSocket = require('ws');
const mongoose = require('mongoose');
const { Kafka } = require('kafkajs');

const wss = new WebSocket.Server({ port: 8080 });
const clients = new Set();

// Kafka setup
const kafka = new Kafka({
  clientId: 'websocket-consumer',
  brokers: ['localhost:9092'],
});

const consumer = kafka.consumer({ groupId: 'admin-dashboard' });

let baseRevenue = 0;
let baseUsers = 0;
let orderCount = 0;
let eventCount = 0;
let lastEventTime = Date.now();
const categoryCounts = {};

async function initializeConnection() {
  try {
    await mongoose.connect("mongodb://localhost:27017/e-commerce");
    console.log('WebSocket server connected to MongoDB');
    
    // Get base metrics from database
    const Order = require('./models/order.js');
    const User = require('./models/user.js');
    
    const orders = await Order.find();
    baseRevenue = orders.reduce((sum, order) => sum + (Number(order.total_amount || order.amount || 0)), 0);
    orderCount = orders.length;
    
    const users = await User.find();
    baseUsers = users.length;
    
    console.log(`Base metrics: Revenue=${baseRevenue}, Orders=${orderCount}, Users=${baseUsers}`);
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err);
  }
}

async function connectKafkaConsumer() {
  const MAX_RETRIES = 5;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`Connecting Kafka consumer (attempt ${attempt}/${MAX_RETRIES})...`);
      await consumer.connect();
      console.log('Kafka consumer connected');
      
      await consumer.subscribe({ topic: 'clickStream', fromBeginning: false });
      console.log('✓ Subscribed to clickStream topic');
      
      await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const event = JSON.parse(message.value.toString());
            console.log('📊 Event received:', event);
            processEvent(event);
          } catch (err) {
            console.error('Error processing Kafka message:', err);
          }
        },
      });
      
      console.log('✓ Kafka consumer is now running and listening for events');
      return;
    } catch (err) {
      console.error(`Kafka connection failed (attempt ${attempt}/${MAX_RETRIES}):`, err.message);
      if (attempt === MAX_RETRIES) {
        console.error('Failed to connect to Kafka after all retries');
        console.log('WebSocket server will run without Kafka integration');
      } else {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
}

function processEvent(event) {
  const now = Date.now();
  eventCount++;
  
  console.log(`Processing event #${eventCount}:`, event.eventType, event.userId);
  
  // Calculate events per second
  const timeDiff = (now - lastEventTime) / 1000;
  const eventsPerSec = timeDiff > 0 ? 1 / timeDiff : 0;
  lastEventTime = now;
  
  // Update category counts
  const category = event.category || event.productCategory || 'Unknown';
  if (category) {
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
  }
  
  // Update revenue for purchase events
  if (event.eventType === 'purchase' && event.amount) {
    baseRevenue += Number(event.amount);
    orderCount++;
    console.log(`💰 Purchase event: +${event.amount}, Total revenue: ${baseRevenue}`);
  }
  
  // Broadcast live metrics
  const metrics = {
    timestamp: now / 1000,
    revenue: baseRevenue,
    orders: orderCount,
    ordersPerSec: event.eventType === 'purchase' ? 1 : 0,
    users: baseUsers,
    events: eventCount,
    eventsPerSec: Math.min(eventsPerSec, 100),
    category: category,
    eventType: event.eventType,
    kafkaLag: 0,
    messagesPerSec: Math.min(eventsPerSec, 100),
    sparkBatchTime: 0,
    order_id: event.orderId || event.order_id,
    user_id: event.userId || event.user_id,
    amount: event.amount || 0,
  };
  
  console.log(`📡 Broadcasting to ${clients.size} client(s)`);
  broadcast(metrics);
}

wss.on('connection', (ws) => {
  console.log('Client connected');
  clients.add(ws);
  
  // Send initial state to new client
  const initialState = {
    timestamp: Date.now() / 1000,
    revenue: baseRevenue,
    orders: orderCount,
    ordersPerSec: 0,
    users: baseUsers,
    events: eventCount,
    eventsPerSec: 0,
    kafkaLag: 0,
    messagesPerSec: 0,
    sparkBatchTime: 0,
  };
  
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(initialState));
  }

  ws.on('close', () => {
    console.log('Client disconnected');
    clients.delete(ws);
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
    clients.delete(ws);
  });
});

function broadcast(data) {
  const message = JSON.stringify(data);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

initializeConnection().then(() => {
  console.log('WebSocket server running on ws://localhost:8080');
  connectKafkaConsumer();
});
