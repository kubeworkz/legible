#!/bin/bash
# Start DeepAnalyze WebUI v2 (backend + frontend)
set -e

REPO_DIR="/opt/deepanalyze/repo"
CHAT_DIR="${REPO_DIR}/demo/chat_v2"
LOG_DIR="${CHAT_DIR}/logs"

mkdir -p "$LOG_DIR"

echo "Starting DeepAnalyze WebUI v2..."

# Start backend (FastAPI — ports 8200, 8100)
cd "$CHAT_DIR"
nohup python3 backend.py > "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID (API: http://localhost:8200, Files: http://localhost:8100)"

sleep 2

# Start frontend (Next.js — port 4000)
cd "${CHAT_DIR}/frontend"
FRONTEND_PORT=${FRONTEND_PORT:-4000}
nohup npm run dev -- -p "$FRONTEND_PORT" > "$LOG_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID (UI: http://localhost:${FRONTEND_PORT})"

# Save PIDs for stop script
echo $BACKEND_PID > "$LOG_DIR/backend.pid"
echo $FRONTEND_PID > "$LOG_DIR/frontend.pid"

echo ""
echo "WebUI v2 started successfully."
echo "  Frontend:     http://localhost:${FRONTEND_PORT}"
echo "  Backend API:  http://localhost:8200"
echo "  File Service: http://localhost:8100"
echo "  Logs:         ${LOG_DIR}/"
