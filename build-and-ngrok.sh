#!/usr/bin/env bash
set -e

PORT="${PORT:-2567}"

echo "=== Nem Da — Build & Run với ngrok ==="
echo ""

# 1. Install dependencies
echo "[1/4] Installing dependencies..."
npm install --silent

# 2. Build client
echo "[2/4] Building client (production)..."
VITE_SERVER_URL="" npm run build -w client 2>&1 | tail -1

# 3. Build server
echo "[3/4] Building server..."
npm run build -w server 2>&1 | tail -1

# 4. Start server
echo "[4/4] Starting production server..."
echo ""
export NODE_ENV=production
export HOST=0.0.0.0
node server/dist/index.js &
SERVER_PID=$!

cleanup() {
  echo ""
  echo "Stopping server..."
  kill $SERVER_PID 2>/dev/null
  exit 0
}
trap cleanup INT TERM

sleep 2

echo "=============================="
echo "Server đang chạy tại:"
echo "  Local:    http://localhost:$PORT"
echo ""
echo "Đang chạy ngrok..."
echo "=============================="
echo ""

ngrok http "$PORT" --log=stdout 2>/dev/null || ngrok http "$PORT"
