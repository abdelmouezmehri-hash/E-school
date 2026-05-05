#!/bin/bash
# Find pnpm
export PATH="$PATH:/home/runner/.local/share/pnpm:/usr/local/bin"
PNPM=$(which pnpm 2>/dev/null || echo "/home/runner/.local/share/pnpm/pnpm")

# Start API server in background
PORT=8080 node --enable-source-maps /home/runner/workspace/artifacts/api-server/dist/index.mjs &
API_PID=$!
echo "API server started (PID $API_PID) on port 8080"

# Start frontend (foreground — keeps the process alive)
cd /home/runner/workspace
$PNPM --filter @workspace/kidspeak run dev
