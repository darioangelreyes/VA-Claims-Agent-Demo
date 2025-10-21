#!/bin/bash

# Start VA Claims Dashboard Frontend on port 5174

echo "🚀 Starting VA Claims Dashboard Frontend on port 5174..."

cd "$(dirname "$0")/client"
bun run dev

