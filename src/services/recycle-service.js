const fs = require('fs');
const path = require('path');
const { ARTICLES_DIR, FUJIAN_DIR, RECYCLE_BIN_DIR } = require('../config');

const RECYCLE_META = path.join(RECYCLE_BIN_DIR, 'index.json');
const KEEP_MS = 30 * 24 * 60 * 60 * 1000;

function ensureRecycleState() {
  fs.mkdirSync(RECYCLE_BIN_DIR, { recursive: true });
  if (!fs.existsSync(RECYCLE_META)) fs.writeFileSync(RECYCLE_META, '[]', 'utf8');
}

function readIndex() {
  ensureRecycleState();
  try { return JSON.parse(fs.readFileSync(RECYCLE_META, 'utf8')); } catch { return []; }
}

function writeIndex(items) {
  ensureRecycleState();
  fs.writeFileSync(RECYCLE_META, JSON.stringify(items, null, 2), 'utf8');
}

function articleAssetDir(relPath) {
  return path.join(FUJIAN_DIR, ...String(relPath || '').replace(/\\/g, '/').replace(/\.html$/i, '').split('/').filter(Boolean));
}

function uniqueRecycleKey(relPath) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safe = String(relPath || '').replace(/[\\/:*?"<>|]/g, '__');
  return stamp + '__' + safe;
}

function cleanupRecycleBin() {
  const now = Date.now();
  const items = readIndex();
  const kept = [];
  for (const item of items) {
    const expired = !item.deletedAt || (now - new Date(item.deletedAt).getTime() > KEEP_MS);
    if (expired) {
      try { if (item.recyclePath && fs.existsSync(item.recyclePath)) fs.rmSync(item.recyclePath, { recursive: true, force: true }); } catch {}
      try { if (item.assetRecyclePath && fs.existsSync(item.assetRecyclePath)) fs.rmSync(item.assetRecyclePath, { recursive: true, force: true }); } catch {}
    } else {
      kept.push(item);
    }
  }
  writeIndex(kept);
}

function moveToRecycleBin(relPath, isDir) {
  cleanupRecycleBin();
  const sourcePath = path.resolve(ARTICLES_DIR, relPath);
  if (!fs.existsSync(sourcePath)) {
    const err = new Error('文件不存在');
    err.statusCode = 404;
    throw err;
  }
  const key = uniqueRecycleKey(relPath);
  const recyclePath = path.join(RECYCLE_BIN_DIR, key);
  fs.mkdirSync(path.dirname(recyclePath), { recursive: true });
  fs.renameSync(sourcePath, recyclePath);

  let assetRecyclePath = '';
  try {
    const assetPath = isDir
      ? path.join(FUJIAN_DIR, ...String(relPath || '').replace(/\\/g, '/').split('/').filter(Boolean))
      : articleAssetDir(relPath);
    if (fs.existsSync(assetPath)) {
      assetRecyclePath = path.join(RECYCLE_BIN_DIR, key + '__assets');
      fs.renameSync(assetPath, assetRecyclePath);
    }
  } catch {}

  const stat = fs.statSync(recyclePath);
  const items = readIndex();
  items.unshift({
    id: key,
    name: path.basename(relPath),
    originalPath: String(relPath || '').replace(/\\/g, '/'),
    isDir: !!isDir,
    deletedAt: new Date().toISOString(),
    recyclePath,
    assetRecyclePath,
    size: stat.size || 0,
  });
  writeIndex(items);
  return { success: true, recycled: true, id: key };
}

function listRecycleBin() {
  cleanupRecycleBin();
  return readIndex().map(item => ({
    id: item.id,
    name: item.name,
    originalPath: item.originalPath,
    isDir: item.isDir,
    deletedAt: item.deletedAt,
    size: item.size || 0,
  }));
}

function restoreFromRecycleBin(id) {
  cleanupRecycleBin();
  const items = readIndex();
  const idx = items.findIndex(item => item.id === id);
  if (idx === -1) {
    const err = new Error('回收站项目不存在');
    err.statusCode = 404;
    throw err;
  }
  const item = items[idx];
  const targetPath = path.join(ARTICLES_DIR, ...String(item.originalPath || '').split('/'));
  if (fs.existsSync(targetPath)) {
    const err = new Error('原位置已存在同名文件，请先处理');
    err.statusCode = 409;
    throw err;
  }
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.renameSync(item.recyclePath, targetPath);

  try {
    if (item.assetRecyclePath && fs.existsSync(item.assetRecyclePath)) {
      const assetTarget = item.isDir
        ? path.join(FUJIAN_DIR, ...String(item.originalPath || '').split('/').filter(Boolean))
        : articleAssetDir(item.originalPath);
      fs.mkdirSync(path.dirname(assetTarget), { recursive: true });
      fs.renameSync(item.assetRecyclePath, assetTarget);
    }
  } catch {}

  items.splice(idx, 1);
  writeIndex(items);
  return { success: true, path: item.originalPath };
}

module.exports = {
  cleanupRecycleBin,
  moveToRecycleBin,
  listRecycleBin,
  restoreFromRecycleBin,
};
