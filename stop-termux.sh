#!/data/data/com.termux/files/usr/bin/bash
cd "$(dirname "$0")"
if [ -f .server.pid ]; then
  PID=$(cat .server.pid)
  kill "$PID" 2>/dev/null || true
  rm -f .server.pid
  echo "stopped pid $PID"
else
  pkill -f "node server.js 8765" 2>/dev/null || true
  echo "stopped matching node server.js 8765"
fi
