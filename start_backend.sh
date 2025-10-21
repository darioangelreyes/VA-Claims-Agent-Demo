#!/bin/bash

# Start VA Claims Dashboard Backend on port 8001

echo "🚀 Starting VA Claims Dashboard Backend on port 8001..."

# Load environment variables
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

if [ -f .env.local ]; then
  set -a
  source .env.local
  set +a
fi

cd "$(dirname "$0")"
uv run uvicorn server.app:app --host 0.0.0.0 --port 8001 --reload

