# Admin Panel Setup Guide

## Problem
The admin panel was not working because it requires a WebSocket server for live data streaming, which was missing from the original setup.

## Solution
I've created a WebSocket server that provides live streaming data to the admin dashboard.

## What Was Added

1. **websocket-server.js** - WebSocket server that:
   - Runs on port 8080
   - Connects to MongoDB to fetch base metrics
   - Broadcasts live metrics every 2 seconds
   - Provides revenue, orders, users, events, and system health data

2. **start-servers.sh** - Bash script to run both servers simultaneously:
   - Express server (port 3000)
   - WebSocket server (port 8080)

3. **Updated package.json** - Added `ws` dependency for WebSocket support

## Setup Instructions

### Step 1: Install Dependencies
```bash
cd backend
npm install
```

### Step 2: Start the Servers
```bash
# Option 1: Use the startup script (recommended)
./start-servers.sh

# Option 2: Run servers separately in different terminals
# Terminal 1:
node server.js

# Terminal 2:
node websocket-server.js
```

### Step 3: Access Admin Panel
1. Make sure MongoDB is running on port 27017
2. Start the frontend: `cd frontend && npm run dev`
3. Login with an admin user (email: admin@eshop.com)
4. Navigate to `/admin` route
5. You should now see live data streaming in the dashboard

## Features Now Working

✅ Live revenue tracking
✅ Real-time order metrics
✅ Active users count
✅ Events per second
✅ Revenue trend chart
✅ Top categories (live)
✅ System health monitoring
✅ Live event feed
✅ Alerts for revenue spikes and system issues

## Troubleshooting

### WebSocket connection fails
- Ensure port 8080 is not in use
- Check that websocket-server.js is running
- Verify MongoDB connection

### No live data appearing
- Check browser console for WebSocket errors
- Ensure both servers are running
- Verify the WebSocket URL in Admin.jsx matches your setup

### Permission denied on start-servers.sh
```bash
chmod +x start-servers.sh
```

## Technical Details

The WebSocket server:
- Generates mock live data based on actual database metrics
- Simulates real-time e-commerce activity
- Provides metrics for revenue, orders, users, and events
- Includes system health indicators (Kafka lag, Spark batch time)
- Supports multiple concurrent client connections
- Auto-reconnects on connection loss
