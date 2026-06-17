const express = require('express');
const fs = require('fs');
const path = require('path');
const fileService = require('../services/file-service');
const { FUJIAN_DIR } = require('../config');
const clipService = require('../services/clip-service');

const router = express.Router();

router.get('/dirs', (req, res) => {
  try {
    const tree = fileService.scanTree();
    res.json(tree);
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, error: e.message });
  }
});

router.get('/list', (req, res) => {
  try {
    const files = fileService.listDir(req.query.dir || '');
    res.json({ success: true, files });
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, error: e.message });
  }
});

router.get('/read', (req, res) => {
  try {
    const result = fileService.readFileMarkdown(req.query.path);
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, error: e.message });
  }
});

router.post('/save', (req, res) => {
  try {
    const result = fileService.saveMarkdownFile(req.body.path, req.body.markdown);
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, error: e.message });
  }
});

router.post('/create-file', (req, res) => {
  try {
    const result = fileService.createFile(req.body);
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, error: e.message });
  }
});

router.post('/create-dir', (req, res) => {
  try {
    const result = fileService.createDir(req.body);
    res.json(result);
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, error: e.message });
  }
});

router.post('/rename', (req, res) => {
  try {
    const result = fileService.renamePath(req.body);
    res.json(result);
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, error: e.message });
  }
});

router.post('/move', (req, res) => {
  try {
    const result = fileService.movePath(req.body);
    res.json(result);
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, error: e.message });
  }
});

router.post('/move-batch', (req, res) => {
  try {
    const result = fileService.movePaths(req.body || {});
    res.json(result);
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, error: e.message });
  }
});

router.post('/delete', (req, res) => {
  try {
    const result = fileService.deletePath(req.body);
    res.json(result);
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, error: e.message });
  }
});

router.post('/upload', (req, res) => {
  try {
    const result = fileService.uploadFiles(req.body);
    res.json(result);
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, error: e.message });
  }
});

router.post('/upload-asset', (req, res) => {
  try {
    const { name, contentBase64, articlePath, dir } = req.body || {};
    if (!name || !contentBase64) return res.status(400).json({ success: false, error: '缺少文件数据' });
    const raw = Buffer.from(String(contentBase64), 'base64');
    if (raw.length > 5 * 1024 * 1024) return res.status(400).json({ success: false, error: '文件不能超过 5MB' });
    const safeName = String(name).replace(/[\\/:*?"<>|]/g, '_');
    const ext = path.extname(safeName).toLowerCase();
    const base = path.basename(safeName, ext);
    const finalName = base + '_' + Date.now() + ext;
    const scope = String(articlePath || dir || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    const articleScope = scope ? scope.replace(/\.html$/i, '') : 'root';
    const targetDir = path.join(FUJIAN_DIR, ...articleScope.split('/').filter(Boolean));
    const target = path.join(targetDir, finalName);
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(target, raw);
    const url = '/fujian/' + articleScope.split('/').filter(Boolean).map(encodeURIComponent).join('/') + (articleScope ? '/' : '') + encodeURIComponent(finalName);
    res.json({ success: true, url, name: finalName, originalName: name, isImage: /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(finalName) });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/clip/preview', async (req, res) => {
  try {
    const result = await clipService.previewClip((req.body && req.body.url) || '');
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/clip/save', async (req, res) => {
  try {
    const result = await clipService.saveClip(req.body || {});
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/render-md', (req, res) => {
  try {
    const result = fileService.renderMarkdownFile(req.query.path);
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, error: e.message });
  }
});

module.exports = router;
