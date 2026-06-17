#!/data/data/com.termux/files/usr/bin/bash
cd "$(dirname "$0")"
nohup node server.js 8765 > app.log 2>&1 &
echo $! > .server.pid
echo "started pid $(cat .server.pid)"
