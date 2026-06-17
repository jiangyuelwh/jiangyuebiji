const express = require('express');
const settingsService = require('../services/settings-service');
const fileService = require('../services/file-service');

const router = express.Router();

router.get('/settings/public', (req, res) => {
  res.json({ success: true, settings: settingsService.getPublicSettings() });
});

router.get('/settings', (req, res) => {
  res.json({ success: true, settings: settingsService.getPublicSettings() });
});

router.post('/settings/profile', (req, res) => {
  try {
    const settings = settingsService.updateProfile(req.body || {});
    res.json({ success: true, settings });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

router.post('/settings/password', (req, res) => {
  try {
    const { enabled, password, confirmPassword } = req.body || {};
    if (typeof enabled !== 'boolean') throw new Error('缺少启用状态');
    if (enabled) {
      if (!String(password || '').trim()) throw new Error('请输入访问密码');
      if (String(password) !== String(confirmPassword || '')) throw new Error('两次输入的密码不一致');
    }
    const settings = settingsService.updatePasswordConfig({ enabled, password: String(password || '') });
    res.json({ success: true, settings });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

router.post('/settings/appearance', (req, res) => {
  try {
    const settings = settingsService.updateAppearance((req.body && req.body.theme) || 'system');
    res.json({ success: true, settings });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

router.get('/settings/wiki-links/check', (req, res) => {
  try {
    res.json({ success: true, report: fileService.scanWikiLinkIssues() });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/settings/wiki-links/repair', (req, res) => {
  try {
    res.json(fileService.repairWikiLinkIssues());
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/settings/assets/scan', (req, res) => {
  try {
    res.json(fileService.scanUnusedAssets());
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/settings/assets/cleanup', (req, res) => {
  try {
    res.json(fileService.cleanupUnusedAssets());
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/auth/login', (req, res) => {
  try {
    const password = String((req.body && req.body.password) || '').trim();
    if (!settingsService.verifyPassword(password)) {
      return res.status(401).json({ success: false, error: '密码错误' });
    }
    const token = settingsService.createSession();
    res.cookie(settingsService.SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    res.json({ success: true, next: String((req.body && req.body.next) || '/').trim() || '/' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/auth/logout', (req, res) => {
  try {
    const cookies = settingsService.parseCookies(req);
    settingsService.clearSession(cookies[settingsService.SESSION_COOKIE]);
    res.clearCookie(settingsService.SESSION_COOKIE);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/share/create', (req, res) => {
  try {
    const relPath = String((req.body && req.body.path) || '').trim();
    if (!relPath) return res.status(400).json({ success: false, error: '缺少文件路径' });
    const token = settingsService.createShareToken(relPath);
    res.json({ success: true, token });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
