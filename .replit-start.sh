#!/bin/bash
# Find pnpm
export PATH="$PATH:/home/runner/.local/share/pnpm:/usr/local/bin"
PNPM=$(which pnpm 2>/dev/null || echo "/home/runner/.local/share/pnpm/pnpm")

# Clear any stale process holding port 8080 before starting the API server
node -e "
const fs = require('fs');
try {
  const lines = fs.readFileSync('/proc/net/tcp6', 'utf8').split('\n');
  const hit = lines.find(l => /:1F90 /.test(l));
  if (!hit) { console.log('Port 8080 is free'); process.exit(0); }
  const inode = hit.trim().split(/\s+/)[9];
  const pids = fs.readdirSync('/proc').filter(p => /^\d+$/.test(p));
  for (const pid of pids) {
    try {
      const fds = fs.readdirSync('/proc/' + pid + '/fd');
      for (const fd of fds) {
        try {
          if (fs.readlinkSync('/proc/' + pid + '/fd/' + fd) === 'socket:[' + inode + ']') {
            process.kill(parseInt(pid), 9);
            console.log('Cleared stale PID ' + pid + ' from port 8080');
          }
        } catch(e) {}
      }
    } catch(e) {}
  }
} catch(e) { console.log('Port check skipped:', e.message); }
" 2>/dev/null || true
sleep 0.5

# Start API server in background
PORT=8080 node --enable-source-maps /home/runner/workspace/artifacts/api-server/dist/index.mjs &
API_PID=$!
echo "API server started (PID $API_PID) on port 8080"

# Start frontend (foreground — keeps the process alive)
cd /home/runner/workspace
$PNPM --filter @workspace/kidspeak run dev
