#!/bin/bash

# Start the FastAPI server in the background
cd server
uvicorn main:app --reload --port 8000 &
SERVER_PID=$!
cd ..

echo "FastAPI server started with PID: $SERVER_PID"
echo "Frontend will open in your browser after compilation."

# Start the frontend development server
bun run dev

# Function to kill the server when the script exits
cleanup() {
  echo "Stopping FastAPI server (PID: $SERVER_PID)..."
  kill $SERVER_PID
  echo "Server stopped."
}

trap cleanup EXIT

