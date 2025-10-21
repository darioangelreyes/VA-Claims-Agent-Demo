#!/bin/bash

# Run VA Claims Dashboard App on alternate ports
# Frontend: http://localhost:5174
# Backend: http://localhost:8001

set -e

echo "🚀 Starting VA Claims Dashboard App..."
echo ""
echo "Frontend: http://localhost:5174"
echo "Backend: http://localhost:8001"
echo ""

# Load environment variables
if [ -f .env ]; then
  set -a
  source .env
  set +a
  echo "✓ Loaded .env file"
fi

if [ -f .env.local ]; then
  set -a
  source .env.local
  set +a
  echo "✓ Loaded .env.local file"
fi

echo ""

# Function to cleanup on exit
cleanup() {
  echo ""
  echo "🛑 Shutting down..."
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  exit
}

trap cleanup SIGINT SIGTERM

# Start backend on port 8001
echo "🔧 Starting backend server on port 8001..."
cd "$(dirname "$0")"
uv run uvicorn server.app:app --host 0.0.0.0 --port 8001 --reload &
BACKEND_PID=$!
echo "✓ Backend started (PID: $BACKEND_PID)"

# Wait a bit for backend to start
sleep 2

# Start frontend on port 5174
echo "🎨 Starting frontend server on port 5174..."
cd client
bun run dev &
FRONTEND_PID=$!
echo "✓ Frontend started (PID: $FRONTEND_PID)"

echo ""
echo "✅ VA Claims Dashboard is running!"
echo ""
echo "📊 Dashboard: http://localhost:5174"
echo "🔌 API: http://localhost:8001/api"
echo "❤️  Health: http://localhost:8001/health"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID

