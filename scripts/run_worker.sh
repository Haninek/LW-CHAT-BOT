#!/bin/bash

# Run Arq worker for background job processing
# Prerequisites: Redis server running on localhost:6379

echo "Starting Underwriting Wizard background worker..."

# Set environment variables
export API_BASE="${API_BASE:-http://localhost:8000}"
export API_KEY_PARTNER="${API_KEY_PARTNER:-dev_underwriting_wizard_key}"
export REDIS_HOST="${REDIS_HOST:-localhost}"
export REDIS_PORT="${REDIS_PORT:-6379}"
export REDIS_DB="${REDIS_DB:-0}"

# Check if Redis is available
if ! redis-cli ping > /dev/null 2>&1; then
    echo "Error: Redis is not running. Start Redis first:"
    echo "  docker run -d --name redis -p 6379:6379 redis:7"
    echo "  or"
    echo "  redis-server"
    exit 1
fi

echo "Redis connection confirmed ✓"
echo "Starting worker processes..."

# Start the worker
cd "$(dirname "$0")/.."
python -m arq worker.jobs.WorkerSettings