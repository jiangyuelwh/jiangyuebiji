const fs = require('fs');
const path = require('path');
const { ARTICLES_DIR, HISTORY_DIR, HISTORY_KEEP_COUNT } = require('../config');

function saveSnapshot(filePath) {
  try {
    if (!fs.existsSync(filePath)) return;
    const relPath = path.relative(ARTICLES_DIR, filePath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const histPath = path.join(HISTORY_DIR, relPath + '.' + timestamp);
    fs.mkdirSync(path.dirname(histPath), { recursive: true });
    fs.copyFileSync(filePath, histPath);
    const baseDir = path.dirname(histPath);
    const snapshots = fs.readdirSync(baseDir).filter((f) => f.startsWith(path.basename(relPath))).sort();
    while (snapshots.length > HISTORY_KEEP_COUNT) {
      try { fs.unlinkSync(path.join(baseDir, snapshots.shift())); } catch {}
    }
  } catch (e) {
    console.error('快照保存失败:', e.message);
  }
}

function listHistory(relPath) {
  const histDir = path.join(HISTORY_DIR, path.dirname(relPath));
  if (!fs.existsSync(histDir)) return [];
  const baseName = path.basename(relPath);
  return fs.readdirSync(histDir)
    .filter((f) => f.startsWith(baseName + '.'))
    .sort().reverse().slice(0, HISTORY_KEEP_COUNT)
    .map((f) => {
      const size = fs.statSync(path.join(histDir, f)).size;
      const ts = f.slice(baseName.length + 1);
      return { file: f, time: ts.replace(/-/g, ':').replace(/T/, ' ').replace(/Z$/, ''), size };
    });
}

function getHistoryFilePath(relPath, version) {
  return path.join(HISTORY_DIR, relPath.replace(/^\/+/, '') + '.' + version);
}

function readHistoryVersion(relPath, version) {
  if (!relPath || !version) {
    const err = new Error('missing params');
    err.statusCode = 400;
    throw err;
  }

  const histPath = getHistoryFilePath(relPath, version);
  if (!fs.existsSync(histPath)) {
    const err = new Error('version not found');
    err.statusCode = 404;
    throw err;
  }

  return {
    content: fs.readFileSync(histPath, 'utf-8'),
  };
}

function restoreHistory(relPath, version) {
  if (!relPath || !version) {
    const err = new Error('missing params');
    err.statusCode = 400;
    throw err;
  }

  const histPath = getHistoryFilePath(relPath, version);
  if (!fs.existsSync(histPath)) {
    const err = new Error('version not found');
    err.statusCode = 404;
    throw err;
  }

  const filePath = path.resolve(ARTICLES_DIR, relPath);
  if (!fs.existsSync(filePath)) {
    const err = new Error('文件不存在');
    err.statusCode = 404;
    throw err;
  }

  saveSnapshot(filePath);
  const snapshotContent = fs.readFileSync(histPath, 'utf-8');
  fs.writeFileSync(filePath, snapshotContent, 'utf-8');

  return {
    success: true,
    path: relPath,
    version,
  };
}

function listAllHistory() {
  if (!fs.existsSync(HISTORY_DIR)) return [];
  const out = [];
  function walk(dir) {
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else {
        const rel = path.relative(HISTORY_DIR, full).replace(/\\/g, '/');
        const m = rel.match(/^(.*?\.html)\.(.+)$/);
        if (!m) continue;
        out.push({
          path: m[1],
          version: m[2],
          file: entry.name,
          time: m[2].replace(/-/g, ':').replace(/T/, ' ').replace(/Z$/, ''),
          size: fs.statSync(full).size,
        });
      }
    }
  }
  walk(HISTORY_DIR);
  return out.sort((a, b) => String(b.version).localeCompare(String(a.version)));
}

module.exports = {
  saveSnapshot,
  listHistory,
  listAllHistory,
  readHistoryVersion,
  restoreHistory,
};
