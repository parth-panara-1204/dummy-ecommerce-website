#!/bin/bash

echo "=========================================="
echo "Starting E-Commerce Application"
echo "=========================================="
echo ""

# Check if Docker Compose services are running
echo "🐳 Checking Docker services..."
if ! docker ps | grep -q "mongo"; then
    echo "⚠️  MongoDB container not running"
    echo "   Starting Docker Compose services..."
    docker compose up -d
    echo "   ✓ Docker services started"
    sleep 3
else
    echo "   ✓ Docker services already running"
fi

echo ""

# Start backend servers
echo "📦 Starting Backend Services..."
cd backend

# Start WebSocket server in background
node websocket-server.js &
WS_PID=$!
echo "   ✓ WebSocket server (PID: $WS_PID) - ws://localhost:8080"

# Start Express server in background
node server.js &
EXPRESS_PID=$!
echo "   ✓ Express server (PID: $EXPRESS_PID) - http://localhost:3000"

cd ..

# Start frontend
echo ""
echo "🎨 Starting Frontend..."
cd frontend
npm run dev &
FRONTEND_PID=$!
echo "   ✓ Frontend dev server (PID: $FRONTEND_PID) - http://localhost:5173"

cd ..

echo ""
echo "=========================================="
echo "✅ All services started successfully!"
echo "=========================================="
echo ""
echo "📍 Access points:"
echo "   • Frontend:  http://localhost:5173"
echo "   • Backend:   http://localhost:3000"
echo "   • WebSocket: ws://localhost:8080"
echo ""
echo "🐳 Docker services:"
echo "   • MongoDB:   localhost:27017"
echo "   • Kafka:     localhost:9092"
echo "   • MinIO:     localhost:9000"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Trap Ctrl+C and kill all processes
trap "echo ''; echo 'Stopping all services...'; kill $WS_PID $EXPRESS_PID $FRONTEND_PID 2>/dev/null; exit" INT

# Wait for all processes
wait
