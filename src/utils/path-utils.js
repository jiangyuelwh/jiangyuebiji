const path = require('path');
const { ARTICLES_DIR } = require('../config');

function safePath(target, base = ARTICLES_DIR) {
  const rel = path.relative(base, target);
  return !rel.startsWith('..') && !path.isAbsolute(rel);
}

function resolveArticlePath(relPath = '') {
  return path.resolve(ARTICLES_DIR, relPath);
}

function ensureSafeArticlePath(relPath = '') {
  const absPath = resolveArticlePath(relPath);
  if (!safePath(absPath, ARTICLES_DIR) && absPath !== ARTICLES_DIR) {
    const err = new Error('非法路径');
    err.statusCode = 403;
    throw err;
  }
  return absPath;
}

module.exports = { safePath, resolveArticlePath, ensureSafeArticlePath };
