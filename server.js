#!/usr/bin/env node

const app = require('./src/app');
const { PORT } = require('./src/config');

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('✨ 江月个人空间: http://0.0.0.0:' + PORT);
});

server.keepAliveTimeout = 30000;
server.headersTimeout = 31000;
