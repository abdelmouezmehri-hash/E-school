#!/usr/bin/env bash
# Clear any stale process holding port 8080 before starting the API server.
node -e "
const fs = require('fs');
try {
  const lines = fs.readFileSync('/proc/net/tcp6', 'utf8').split('\n');
  const hit = lines.find(l => /:1F90 /.test(l));
  if (!hit) { process.exit(0); }
  const inode = hit.trim().split(/\s+/)[9];
  for (const pid of fs.readdirSync('/proc').filter(p => /^\d+\$/.test(p))) {
    try {
      for (const fd of fs.readdirSync('/proc/'+pid+'/fd')) {
        try {
          if (fs.readlinkSync('/proc/'+pid+'/fd/'+fd) === 'socket:['+inode+']') {
            process.kill(parseInt(pid), 9);
          }
        } catch(e) {}
      }
    } catch(e) {}
  }
} catch(e) {}
" 2>/dev/null || true

exec PORT=8080 node --enable-source-maps /home/runner/workspace/artifacts/api-server/dist/index.mjs
