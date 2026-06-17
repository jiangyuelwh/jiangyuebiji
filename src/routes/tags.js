const express = require('express');
const { listTags } = require('../services/tag-service');

const router = express.Router();

router.get('/tags', (req, res) => {
  try {
    const result = listTags((req.query.tag || '').trim());
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, error: e.message });
  }
});

module.exports = router;
