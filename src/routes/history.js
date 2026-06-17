const express = require('express');
const {
  listHistory,
  listAllHistory,
  readHistoryVersion,
  restoreHistory,
} = require('../services/history-service');
const { listRecycleBin, restoreFromRecycleBin } = require('../services/recycle-service');

const router = express.Router();

router.get('/history', (req, res) => {
  try {
    const p = req.query.path;
    if (!p) return res.status(400).json({ success: false, error: 'missing path' });
    const relPath = p.replace(/^\/+/, '');
    const versions = listHistory(relPath);
    res.json({ success: true, versions });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/history/all', (req, res) => {
  try {
    res.json({ success: true, versions: listAllHistory() });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/recycle-bin', (req, res) => {
  try {
    res.json({ success: true, items: listRecycleBin() });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/recycle-bin/restore', (req, res) => {
  try {
    res.json(restoreFromRecycleBin(req.body.id));
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, error: e.message });
  }
});

router.get('/history/view', (req, res) => {
  try {
    const result = readHistoryVersion(req.query.path, req.query.version);
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, error: e.message });
  }
});

router.post('/history/restore', (req, res) => {
  try {
    const result = restoreHistory(req.body.path, req.body.version);
    res.json(result);
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, error: e.message });
  }
});

module.exports = router;
