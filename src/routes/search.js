const express = require('express');
const { searchFiles } = require('../services/search-service');

const router = express.Router();

router.get('/search', (req, res) => {
  try {
    const result = searchFiles(req.query.q || '');
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, error: e.message });
  }
});

module.exports = router;
