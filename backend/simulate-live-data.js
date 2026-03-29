/*
  Live event simulator for the admin dashboard.
  Sends realistic traffic to POST /events with weighted event types.

  Usage:
    node simulate-live-data.js

  Optional env vars:
    API_URL=http://localhost:3000/events
    MIN_DELAY_MS=250
    MAX_DELAY_MS=1200
    USERS_CSV_PATH=/home/Parth/dummy-ecommerce-website/ecommerce_dataset/users.csv
*/

const fs = require('fs');
const path = require('path');

const API_URL = process.env.API_URL || 'http://localhost:3000/events';
const MIN_DELAY_MS = Number.parseInt(process.env.MIN_DELAY_MS || '250', 10);
const MAX_DELAY_MS = Number.parseInt(process.env.MAX_DELAY_MS || '1200', 10);
const USERS_CSV_PATH = process.env.USERS_CSV_PATH || path.resolve(__dirname, '..', 'ecommerce_dataset', 'users.csv');

if (!Number.isFinite(MIN_DELAY_MS) || !Number.isFinite(MAX_DELAY_MS) || MIN_DELAY_MS <= 0 || MAX_DELAY_MS < MIN_DELAY_MS) {
  console.error('Invalid MIN_DELAY_MS / MAX_DELAY_MS. Example: MIN_DELAY_MS=250 MAX_DELAY_MS=1200');
  process.exit(1);
}

const categories = [
  'Electronics',
  'Clothing',
  'Beauty',
  'Books',
  'Home & Kitchen',
  'Sports',
  'Toys',
  'Groceries',
  'Automotive',
  'Pet Supplies'
];

let isRunning = true;
let orderCounter = Math.floor(Date.now() / 1000);
let sent = 0;
let failed = 0;
const byType = { view: 0, cart: 0, review: 0, purchase: 0 };
let knownUserIds = [];

function loadUserIdsFromCsv(csvPath) {
  try {
    const raw = fs.readFileSync(csvPath, 'utf8');
    const lines = raw.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];

    const header = lines[0].split(',').map((v) => v.trim());
    const userIdIndex = header.indexOf('user_id');
    if (userIdIndex === -1) return [];

    const ids = [];
    for (let i = 1; i < lines.length; i += 1) {
      const cols = lines[i].split(',');
      const id = (cols[userIdIndex] || '').trim();
      if (id) ids.push(id);
    }

    return [...new Set(ids)];
  } catch (err) {
    console.error('[simulator] failed to read users csv:', err.message);
    return [];
  }
}

function pickUserId() {
  if (knownUserIds.length > 0) {
    return knownUserIds[randInt(0, knownUserIds.length - 1)];
  }

  // Fallback range if CSV is unavailable.
  return String(randInt(1, 120));
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickCategory() {
  return categories[randInt(0, categories.length - 1)];
}

function pickWeightedEventType() {
  const r = Math.random();
  if (r < 0.55) return 'view';
  if (r < 0.8) return 'cart';
  if (r < 0.9) return 'review';
  return 'purchase';
}

function buildEvent() {
  const eventType = pickWeightedEventType();
  const userId = pickUserId();
  const productId = String(randInt(1, 2021));
  const category = pickCategory();

  const event = {
    userId,
    productId,
    eventType,
    category,
    timestamp: new Date().toISOString()
  };

  if (eventType === 'cart') {
    event.quantity = randInt(1, 4);
  }

  if (eventType === 'purchase') {
    const quantity = randInt(1, 3);
    const unitPrice = randInt(199, 4999);
    event.quantity = quantity;
    event.amount = quantity * unitPrice;
    event.orderId = String(orderCounter++);
  }

  return event;
}

async function sendEvent(event) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event)
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body}`);
  }
}

function nextDelay() {
  return randInt(MIN_DELAY_MS, MAX_DELAY_MS);
}

async function tick() {
  if (!isRunning) return;

  const event = buildEvent();
  try {
    await sendEvent(event);
    sent += 1;
    byType[event.eventType] += 1;
  } catch (err) {
    failed += 1;
    console.error('[simulator] send failed:', err.message);
  }

  setTimeout(tick, nextDelay());
}

const statsTimer = setInterval(() => {
  const breakdown = `view:${byType.view} cart:${byType.cart} review:${byType.review} purchase:${byType.purchase}`;
  console.log(`[simulator] sent=${sent} failed=${failed} ${breakdown}`);
}, 5000);

process.on('SIGINT', () => {
  isRunning = false;
  clearInterval(statsTimer);
  console.log('\n[simulator] stopped by SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  isRunning = false;
  clearInterval(statsTimer);
  console.log('\n[simulator] stopped by SIGTERM');
  process.exit(0);
});

console.log(`[simulator] posting events to ${API_URL}`);
console.log(`[simulator] interval range ${MIN_DELAY_MS}-${MAX_DELAY_MS}ms`);
knownUserIds = loadUserIdsFromCsv(USERS_CSV_PATH);
console.log(`[simulator] loaded ${knownUserIds.length} user IDs from ${USERS_CSV_PATH}`);
tick();
