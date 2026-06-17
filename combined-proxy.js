/**
 * combined-proxy.js - 在 8123 端口上提供 qiangzhan 游戏 + liruibiji 编辑器
 * 
 * 结构：
 *   / → qiangzhan 游戏 (由 Python server.py 提供)
 *   /liruibiji → liruibiji 编辑器
 */
const http = require('http');
const httpProxy = require('http-proxy');

// 如果没有 http-proxy，用简单转发
const QIANZHAN_PORT = 8123;
const LIRUI_PORT = 8765;
const PROXY_PORT = 8123;

// 创建代理
function createProxy() {
  try {
    const httpProxy = require('http-proxy');
    const proxy = httpProxy.createProxyServer({
      ws: true,
      changeOrigin: true,
    });

    const server = http.createServer((req, res) => {
      const url = req.url;
      
      if (url.startsWith('/liruibiji') || url.startsWith('/api/') || url.startsWith('/articles/')) {
        // 处理 liruibiji 请求 - 重写路径
        const targetUrl = new URL(url, 'http://localhost:' + LIRUI_PORT);
        const options = {
          hostname: 'localhost',
          port: LIRUI_PORT,
          path: url,
          method: req.method,
          headers: req.headers,
        };
        
        const proxyReq = http.request(options, (proxyRes) => {
          res.writeHead(proxyRes.statusCode, proxyRes.headers);
          proxyRes.pipe(res);
        });
        
        proxyReq.on('error', (err) => {
          res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('代理错误: ' + err.message);
        });
        
        req.pipe(proxyReq);
      } else {
        // 转发到 qiangzhan 游戏
        proxy.web(req, res, { target: 'http://localhost:' + QIANZHAN_PORT }, (err) => {
          res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('代理错误: ' + err.message);
        });
      }
    });

    // WebSocket 支持
    server.on('upgrade', (req, socket, head) => {
      if (req.url.startsWith('/liruibiji')) {
        // liruibiji WebSocket
      } else {
        proxy.ws(req, socket, head, { target: 'http://localhost:' + QIANZHAN_PORT });
      }
    });

    return server;
  } catch (e) {
    console.error('http-proxy not available, using simple approach:', e.message);
    return null;
  }
}

// Simple approach without http-proxy
function createSimpleServer() {
  const server = http.createServer((req, res) => {
    const url = req.url;
    
    if (url.startsWith('/liruibiji') || url.startsWith('/api/') || url.startsWith('/articles/')) {
      // 转发到 liruibiji
      const options = {
        hostname: 'localhost',
        port: LIRUI_PORT,
        path: url,
        method: req.method,
        headers: req.headers,
      };
      
      const proxyReq = http.request(options, (proxyRes) => {
        // 重写 HTML 中的链接指向 /liruibiji/
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
      });
      
      proxyReq.on('error', () => {
        res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('liruibiji 服务未启动 (端口 ' + LIRUI_PORT + ')');
      });
      
      req.pipe(proxyReq);
    } else {
      // 转发到游戏
      const options = {
        hostname: 'localhost',
        port: QIANZHAN_PORT,
        path: url,
        method: req.method,
        headers: req.headers,
      };
      
      const proxyReq = http.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
      });
      
      proxyReq.on('error', () => {
        res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('qiangzhan 服务未启动 (端口 ' + QIANZHAN_PORT + ')');
      });
      
      req.pipe(proxyReq);
    }
  });
  
  return server;
}

// 检查是否可用
const server = createProxy() || createSimpleServer();

server.listen(PROXY_PORT, '0.0.0.0', () => {
  console.log('✅ 混合代理运行在 :' + PROXY_PORT);
  console.log('   /           → qiangzhan 游戏');
  console.log('   /liruibiji  → liruibiji 编辑器');
});
