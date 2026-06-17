const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { BASE_DIR } = require('../config');

const SETTINGS_DIR = path.join(BASE_DIR, 'data');
const SETTINGS_FILE = path.join(SETTINGS_DIR, 'settings.json');
const SESSION_COOKIE = 'liruibiji_session';
const DEFAULTS = {
  profile: {
    username: '江月',
  },
  auth: {
    enabled: false,
    passwordHash: '',
    passwordSalt: '',
    updatedAt: '',
    shares: {},
  },
  appearance: {
    theme: 'light',
  },
};

function ensureStore() {
  fs.mkdirSync(SETTINGS_DIR, { recursive: true });
  if (!fs.existsSync(SETTINGS_FILE)) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(DEFAULTS, null, 2), 'utf8');
  }
}

function readSettings() {
  ensureStore();
  try {
    const raw = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    const settings = {
      profile: { ...DEFAULTS.profile, ...(raw.profile || {}) },
      auth: { ...DEFAULTS.auth, ...(raw.auth || {}) },
      appearance: { ...DEFAULTS.appearance, ...(raw.appearance || {}) },
    };
    if (!String(settings.profile.username || '').trim()) settings.profile.username = DEFAULTS.profile.username;
    if (!['light', 'dark'].includes(settings.appearance.theme)) settings.appearance.theme = 'light';
    return settings;
  } catch {
    return JSON.parse(JSON.stringify(DEFAULTS));
  }
}

function writeSettings(next) {
  ensureStore();
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(next, null, 2), 'utf8');
  return next;
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(String(password || ''), salt, 120000, 32, 'sha256').toString('hex');
}

function makeSalt() {
  return crypto.randomBytes(16).toString('hex');
}

function getPublicSettings() {
  const settings = readSettings();
  return {
    profile: {
      username: settings.profile.username || DEFAULTS.profile.username,
      siteTitle: (settings.profile.username || DEFAULTS.profile.username) + '的笔记网站',
    },
    auth: {
      enabled: !!settings.auth.enabled,
      hasPassword: !!(settings.auth.passwordHash && settings.auth.passwordSalt),
      updatedAt: settings.auth.updatedAt || '',
    },
    appearance: {
      theme: settings.appearance.theme || 'light',
    },
  };
}

function updateProfile({ username }) {
  const settings = readSettings();
  const nextName = String(username || '').trim();
  if (!nextName) throw new Error('请输入用户名');
  settings.profile.username = nextName.slice(0, 30);
  writeSettings(settings);
  return getPublicSettings();
}

function updateAppearance(theme) {
  const settings = readSettings();
  settings.appearance.theme = ['light', 'dark'].includes(theme) ? theme : 'light';
  writeSettings(settings);
  return getPublicSettings();
}

function updatePasswordConfig({ enabled, password }) {
  const settings = readSettings();
  if (typeof enabled === 'boolean') settings.auth.enabled = enabled;
  if (typeof password === 'string' && password.trim()) {
    const salt = makeSalt();
    settings.auth.passwordSalt = salt;
    settings.auth.passwordHash = hashPassword(password.trim(), salt);
    settings.auth.updatedAt = new Date().toISOString();
  }
  writeSettings(settings);
  return getPublicSettings();
}

function verifyPassword(password) {
  const settings = readSettings();
  if (!settings.auth.passwordHash || !settings.auth.passwordSalt) return false;
  return hashPassword(String(password || '').trim(), settings.auth.passwordSalt) === settings.auth.passwordHash;
}

function isAuthEnabled() {
  const settings = readSettings();
  return !!(settings.auth.enabled && settings.auth.passwordHash && settings.auth.passwordSalt);
}

function buildSessionToken() {
  return crypto.randomBytes(24).toString('hex');
}

function parseCookies(req) {
  const header = String((req && req.headers && req.headers.cookie) || '');
  const out = {};
  header.split(';').forEach(part => {
    const idx = part.indexOf('=');
    if (idx <= 0) return;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  });
  return out;
}

function getSessionStore(settings) {
  if (!settings.auth.sessions || typeof settings.auth.sessions !== 'object') settings.auth.sessions = {};
  return settings.auth.sessions;
}

function getShareStore(settings) {
  if (!settings.auth.shares || typeof settings.auth.shares !== 'object') settings.auth.shares = {};
  return settings.auth.shares;
}

function createSession() {
  const settings = readSettings();
  const token = buildSessionToken();
  const sessions = getSessionStore(settings);
  sessions[token] = {
    createdAt: Date.now(),
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
  };
  writeSettings(settings);
  return token;
}

function clearSession(token) {
  if (!token) return;
  const settings = readSettings();
  const sessions = getSessionStore(settings);
  if (sessions[token]) {
    delete sessions[token];
    writeSettings(settings);
  }
}

function verifySessionToken(token) {
  if (!token) return false;
  const settings = readSettings();
  const sessions = getSessionStore(settings);
  const record = sessions[token];
  if (!record) return false;
  if (!record.expiresAt || record.expiresAt < Date.now()) {
    delete sessions[token];
    writeSettings(settings);
    return false;
  }
  return true;
}

function normalizeRelPath(v) {
  return String(v || '').replace(/^\/+/, '').replace(/\\/g, '/');
}

function createShareToken(relPath) {
  const normalized = normalizeRelPath(relPath);
  if (!normalized) throw new Error('缺少分享路径');
  const settings = readSettings();
  const shares = getShareStore(settings);
  const token = crypto.randomBytes(24).toString('hex');
  shares[token] = {
    path: normalized,
    createdAt: Date.now(),
  };
  writeSettings(settings);
  return token;
}

function verifyShareAccess(reqPath, token) {
  if (!token) return false;
  const settings = readSettings();
  const shares = getShareStore(settings);
  const record = shares[String(token || '')];
  if (!record || !record.path) return false;
  const reqNorm = normalizeRelPath(reqPath);
  const base = normalizeRelPath(record.path);
  if (!reqNorm || !base) return false;
  if (reqNorm === base) return true;
  const assetBase = base.replace(/\.html$/i, '');
  if (assetBase && reqNorm.startsWith('fujian/' + assetBase + '/')) return true;
  return false;
}

function isAuthenticated(req) {
  if (!isAuthEnabled()) return true;
  const cookies = parseCookies(req);
  return verifySessionToken(cookies[SESSION_COOKIE]);
}

function shouldProtectPath(reqPath) {
  const p = String(reqPath || '');
  if (p.startsWith('/static/')) return false;
  if (p === '/api/settings/public') return false;
  if (p === '/api/auth/login') return false;
  if (p === '/api/auth/logout') return false;
  if (p === '/login') return false;
  return true;
}

function hasShareAccess(req) {
  const token = String((req.query && req.query.share) || '').trim();
  if (!token) return false;
  const reqPath = String(req.path || '').replace(/^\/+/, '');
  return verifyShareAccess(reqPath, token);
}

function authGuard(req, res, next) {
  if (!isAuthEnabled()) return next();
  if (!shouldProtectPath(req.path)) return next();
  if (isAuthenticated(req)) return next();
  if (hasShareAccess(req)) return next();
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ success: false, authRequired: true, error: '需要访问密码' });
  }
  const nextPath = String(req.originalUrl || req.url || '/');
  return res.redirect('/login?next=' + encodeURIComponent(nextPath));
}

module.exports = {
  SESSION_COOKIE,
  getPublicSettings,
  updateProfile,
  updateAppearance,
  updatePasswordConfig,
  verifyPassword,
  isAuthEnabled,
  createSession,
  clearSession,
  parseCookies,
  isAuthenticated,
  authGuard,
  createShareToken,
  verifyShareAccess,
};
