const fs = require('fs');
const path = require('path');

const { ARTICLES_DIR, FUJIAN_DIR } = require('../config');
const { fileCache, dirCache } = require('./cache-service');
const { moveToRecycleBin, moveAssetToRecycleBin } = require('./recycle-service');
const { analyzeWikiLinks, repairWikiLinks } = require('./wiki-service');
const { RECYCLE_BIN_DIR } = require('../config');
const {
  mdParse,
  buildHtml,
  extractSourceMd,
  ensureSourceMd,
  extractTitle,
  extractTags,
} = require('./markdown-service');
const { saveSnapshot } = require('./history-service');
const { TODAY_CHROME } = require('./today-chrome');
const { REMINDER_CHROME } = require('./reminder-chrome');
const { safePath } = require('../utils/path-utils');
const { getAssetDirForArticleRel, normalizeArticleOrDirAssetLinks } = require('./asset-link-service');
const { isSystemTaskRel, resolveTaskReadPath, migrateLegacyTaskFiles, TEMPLATE_CHROME } = require('./task-service');

function rebuildAllArticles() {
  function walk(dir, out = []) {
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, out);
      else if (/\.html$/i.test(entry.name) && entry.name !== 'renwu.html') out.push(full);
    }
    return out;
  }
  const files = walk(ARTICLES_DIR, []);
  for (const filePath of files) {
    try {
      const relPath = path.relative(ARTICLES_DIR, filePath).replace(/\\/g, '/');
      const html = fs.readFileSync(filePath, 'utf-8');
      const markdown = extractSourceMd(ensureSourceMd(html));
      const title = path.basename(relPath, '.html');
      const bodyHtml = mdParse(markdown, { breaks: true, gfm: true });
      let chromeHtml = '';
      try {
        const m = html.match(/<article class="markdown-body">([\s\S]*?)<h1>/);
        if (m && (m[1].includes('addTaskBtn') || m[1].includes('addRemBtn') || m[1].includes('addTaskModal') || m[1].includes('addRemModal'))) chromeHtml = m[1];
      } catch {}
      if (!chromeHtml) {
        if (relPath.includes('今日任务')) chromeHtml = TODAY_CHROME;
        else if (relPath.includes('提醒事项')) chromeHtml = REMINDER_CHROME;
        else if (relPath.includes('每日任务模板')) chromeHtml = TEMPLATE_CHROME;
      }
      const rebuilt = buildHtml(title, bodyHtml, markdown, chromeHtml, relPath);
      fs.writeFileSync(filePath, rebuilt, 'utf-8');
    } catch {}
  }
  fileCache.clear();
  dirCache.clear();
}

function assertSafe(targetPath) {
  if (!safePath(targetPath, ARTICLES_DIR) && targetPath !== ARTICLES_DIR) {
    const err = new Error('非法路径');
    err.statusCode = 403;
    throw err;
  }
}

function scanTree(dirPath = ARTICLES_DIR) {
  const cached = dirCache.get('tree');
  if (cached && dirPath === ARTICLES_DIR) return cached;

  let entries = [];
  try { entries = fs.readdirSync(dirPath, { withFileTypes: true }); } catch { return []; }

  const tree = entries.filter((e) => !e.name.startsWith('.') && e.isDirectory() && !(dirPath === ARTICLES_DIR && e.name === '任务管理')).map((entry) => {
    const fullPath = path.join(dirPath, entry.name);
    const relPath = path.relative(ARTICLES_DIR, fullPath).replace(/\\/g, '/');
    const sub = fs.readdirSync(fullPath); const hasFiles = sub.some(function(e){return !e.startsWith('.') && !fs.statSync(path.join(fullPath,e)).isDirectory()}); return { type: 'dir', name: entry.name, path: relPath, children: scanTree(fullPath), hasFiles: hasFiles };
  });

  if (dirPath === ARTICLES_DIR) dirCache.set('tree', tree);
  return tree;
}

function listDir(relDir = '') {
  const dirPath = path.resolve(ARTICLES_DIR, relDir);
  assertSafe(dirPath);
  const relKey = path.relative(ARTICLES_DIR, dirPath).replace(/\\/g, '/');
  const cacheKey = 'list:' + relKey;
  const cached = fileCache.get(cacheKey);
  if (cached) return cached;

  let entries = [];
  try { entries = fs.readdirSync(dirPath, { withFileTypes: true }); } catch { return []; }

  const items = entries.filter((e) => !e.name.startsWith('.') && e.name !== 'renwu.html' && e.name !== 'system_pages' && !(dirPath === ARTICLES_DIR && e.name === '任务管理')).map((entry) => {
    const fullPath = path.join(dirPath, entry.name);
    const relPath = path.relative(ARTICLES_DIR, fullPath).replace(/\\/g, '/');
    const stat = fs.statSync(fullPath);
    let title = entry.name;
    return { name: entry.name, title, path: relPath, isDir: entry.isDirectory(), size: entry.isDirectory() ? 0 : stat.size, mtime: stat.mtimeMs };
  });

  items.sort(function(a,b){if(a.isDir!==b.isDir)return a.isDir?-1:1;return (b.mtime||0)-(a.mtime||0)});
  fileCache.set(cacheKey, items);
  return items;
}

function readFileMarkdown(relPath) {
  if (!relPath) { const err = new Error('缺少 path'); err.statusCode = 400; throw err; }
  if (String(relPath).replace(/\\/g, '/') === 'renwu.html') { const err = new Error('系统页面不可编辑'); err.statusCode = 403; throw err; }
  migrateLegacyTaskFiles();
  const isSystem = isSystemTaskRel(relPath);
  const filePath = isSystem ? resolveTaskReadPath(relPath) : path.resolve(ARTICLES_DIR, relPath);
  if (!isSystem) assertSafe(filePath);
  if (!fs.existsSync(filePath)) { const err = new Error('文件不存在'); err.statusCode = 404; throw err; }
  const cacheKey = 'read:' + relPath;
  const cached = fileCache.get(cacheKey);
  if (cached) return cached;
  let html = fs.readFileSync(filePath, 'utf-8');
  html = ensureSourceMd(html);
  const markdown = extractSourceMd(html);
  const title = path.basename(relPath || '', '.html');
  const tags = extractTags(markdown);
  const payload = { markdown, title, path: relPath, tags };
  fileCache.set(cacheKey, payload);
  return payload;
}

function saveMarkdownFile(relPath, markdown) {
  if (!relPath || typeof markdown !== 'string') { const err = new Error('缺少参数'); err.statusCode = 400; throw err; }
  if (String(relPath).replace(/\\/g, '/') === 'renwu.html') { const err = new Error('系统页面不可编辑'); err.statusCode = 403; throw err; }
  migrateLegacyTaskFiles();
  const isSystem = isSystemTaskRel(relPath);
  const filePath = isSystem ? resolveTaskReadPath(relPath) : path.resolve(ARTICLES_DIR, relPath);
  if (!isSystem) assertSafe(filePath);
  saveSnapshot(filePath);
  const title = path.basename(relPath || '', '.html');
  const bodyHtml = mdParse(markdown, { breaks: true, gfm: true });
    // Preserve chrome from existing file if present
  var chromeHtml = "";
  try {
    const existing = fs.readFileSync(filePath, "utf-8");
    const m = existing.match(/<article class="markdown-body">([\s\S]*?)<h1>/);
    if (
      m &&
      !relPath.includes("每日任务模板") &&
      !relPath.includes("今日任务") &&
      (m[1].includes("addTaskBtn") || m[1].includes("addRemBtn") || m[1].includes("addTaskModal") || m[1].includes("addRemModal") || m[1].includes("openTemplateBtn") || m[1].includes("openTodayBtn"))
    ) {
      chromeHtml = m[1];
    }
  } catch(e) {}
  if (!chromeHtml) {
    if (relPath.includes("今日任务")) chromeHtml = TODAY_CHROME;
    else if (relPath.includes("提醒事项")) chromeHtml = REMINDER_CHROME;
    else if (relPath.includes("每日任务模板")) chromeHtml = TEMPLATE_CHROME;
  }
  const html = buildHtml(title, bodyHtml, markdown, chromeHtml, relPath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, html, 'utf-8');
  if (!isSystem) rebuildAllArticles();
  fileCache.del('read:' + relPath);
  fileCache.delPrefix('list:');
  dirCache.clear();
  return { title, path: relPath };
}

function createFile({ name, dir = '', content = '' }) {
  if (!name) { const err = new Error('缺少文件名'); err.statusCode = 400; throw err; }
  if (!name.endsWith('.html')) name += '.html';
  if (String(dir || '').replace(/\\/g, '/').startsWith('__system__/')) {
    const err = new Error('系统目录不可新建文件');
    err.statusCode = 403;
    throw err;
  }
  const dirPath = path.resolve(ARTICLES_DIR, dir);
  assertSafe(dirPath);
  const filePath = path.join(dirPath, name);
  assertSafe(filePath);
  if (fs.existsSync(filePath)) { const err = new Error('文件已存在'); err.statusCode = 409; throw err; }
  const title = name.replace(/\.html$/i, '');
  const markdown = content || ``;
  const bodyHtml = mdParse(markdown, { breaks: true, gfm: true });
  const html = buildHtml(title, bodyHtml, markdown, '', path.relative(ARTICLES_DIR, filePath).replace(/\\/g, '/'));
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, html, 'utf-8');
  rebuildAllArticles();
  fileCache.delPrefix('list:');
  dirCache.clear();
  return { path: path.relative(ARTICLES_DIR, filePath).replace(/\\/g, '/') };
}

function createDir({ name, dir = '' }) {
  if (!name) { const err = new Error('缺少目录名'); err.statusCode = 400; throw err; }
  if (String(dir || '').replace(/\\/g, '/').startsWith('__system__/')) { const err = new Error('系统目录不可新建文件夹'); err.statusCode = 403; throw err; }
  const parentDir = path.resolve(ARTICLES_DIR, dir);
  assertSafe(parentDir);
  const newDir = path.join(parentDir, name);
  assertSafe(newDir);
  fs.mkdirSync(newDir, { recursive: true });
  fileCache.delPrefix('list:');
  dirCache.clear();
  return { success: true };
}

function renamePath({ path: relPath, newName }) {
  if (!relPath || !newName) { const err = new Error('缺少参数'); err.statusCode = 400; throw err; }
  if (String(relPath).replace(/\\/g, '/') === 'renwu.html') { const err = new Error('系统页面不可重命名'); err.statusCode = 403; throw err; }
  if (String(relPath || '').replace(/\\/g, '/').startsWith('__system__/')) { const err = new Error('系统页面不可重命名'); err.statusCode = 403; throw err; }
  const oldPath = path.resolve(ARTICLES_DIR, relPath);
  assertSafe(oldPath);
  const newPath = path.join(path.dirname(oldPath), newName);
  assertSafe(newPath);
  const isDir = fs.existsSync(oldPath) && fs.statSync(oldPath).isDirectory();
  fs.renameSync(oldPath, newPath);
  try {
    const oldAssetDir = getAssetDirForArticleRel(relPath);
    const newRelPath = path.relative(ARTICLES_DIR, newPath).replace(/\\/g, '/');
    const newAssetDir = getAssetDirForArticleRel(newRelPath);
    if (fs.existsSync(oldAssetDir)) {
      fs.mkdirSync(path.dirname(newAssetDir), { recursive: true });
      fs.renameSync(oldAssetDir, newAssetDir);
    }
  } catch {}
  try { normalizeArticleOrDirAssetLinks(newPath); } catch {}
  rebuildAllArticles();
  fileCache.clear();
  dirCache.clear();
  return { success: true };
}

function movePath({ path: relPath, targetDir = '' }) {
  if (!relPath) { const err = new Error('缺少 path'); err.statusCode = 400; throw err; }
  if (String(relPath).replace(/\\/g, '/') === 'renwu.html') { const err = new Error('系统页面不可移动'); err.statusCode = 403; throw err; }
  if (String(relPath || '').replace(/\\/g, '/').startsWith('__system__/')) { const err = new Error('系统页面不可移动'); err.statusCode = 403; throw err; }
  const oldPath = path.resolve(ARTICLES_DIR, relPath);
  const targetDirPath = path.resolve(ARTICLES_DIR, targetDir);
  assertSafe(oldPath);
  assertSafe(targetDirPath);
  const newPath = path.join(targetDirPath, path.basename(oldPath));
  assertSafe(newPath);
  fs.renameSync(oldPath, newPath);
  try {
    const oldAssetDir = getAssetDirForArticleRel(relPath);
    const newRelPath = path.relative(ARTICLES_DIR, newPath).replace(/\\/g, '/');
    const newAssetDir = getAssetDirForArticleRel(newRelPath);
    if (fs.existsSync(oldAssetDir)) {
      fs.mkdirSync(path.dirname(newAssetDir), { recursive: true });
      fs.renameSync(oldAssetDir, newAssetDir);
    }
  } catch {}
  try { normalizeArticleOrDirAssetLinks(newPath); } catch {}
  rebuildAllArticles();
  fileCache.clear();
  dirCache.clear();
  return { success: true };
}

function movePaths({ items = [], targetDir = '' }) {
  if (!Array.isArray(items) || !items.length) {
    const err = new Error('缺少 items');
    err.statusCode = 400;
    throw err;
  }
  const results = [];
  for (const item of items) {
    results.push(movePath({ path: item.path, targetDir }));
  }
  return { success: true, moved: results.length };
}

function deletePath({ path: relPath, isDir }) {
  if (!relPath) { const err = new Error('缺少 path'); err.statusCode = 400; throw err; }
  if (String(relPath).replace(/\\/g, '/') === 'renwu.html') { const err = new Error('系统页面不可删除'); err.statusCode = 403; throw err; }
  if (String(relPath || '').replace(/\\/g, '/').startsWith('__system__/')) { const err = new Error('系统页面不可删除'); err.statusCode = 403; throw err; }
  const targetPath = path.resolve(ARTICLES_DIR, relPath);
  assertSafe(targetPath);
  if (!fs.existsSync(targetPath)) { const err = new Error('文件不存在'); err.statusCode = 404; throw err; }
  moveToRecycleBin(relPath, isDir);
  rebuildAllArticles();
  fileCache.clear();
  dirCache.clear();
  return { success: true };
}

function uploadFiles({ files, dir = '' }) {
  if (!Array.isArray(files) || files.length === 0) { const err = new Error('缺少文件'); err.statusCode = 400; throw err; }
  const dirPath = path.resolve(ARTICLES_DIR, dir);
  assertSafe(dirPath);
  for (const file of files) {
    let { name, content } = file;
    if (!name || typeof content !== 'string') continue;
    const ext = path.extname(name).toLowerCase();
    const finalName = name.endsWith('.md') ? name.replace(/\.md$/i, '.html') : name;
    const filePath = path.join(dirPath, finalName);
    assertSafe(filePath);
    let html;
    if (ext === '.md') {
      const title = extractTitle(content);
      const bodyHtml = mdParse(content, { breaks: true, gfm: true });
      html = buildHtml(title, bodyHtml, content, '', path.relative(ARTICLES_DIR, filePath).replace(/\\/g, '/'));
    } else {
      html = ensureSourceMd(content);
    }
    fs.writeFileSync(filePath, html, 'utf-8');
  }
  rebuildAllArticles();
  fileCache.clear();
  dirCache.clear();
  return { success: true };
}

function renderMarkdownFile(relPath) {
  if (!relPath) { const err = new Error('缺少 path'); err.statusCode = 400; throw err; }
  const filePath = path.resolve(ARTICLES_DIR, relPath);
  assertSafe(filePath);
  if (!fs.existsSync(filePath)) { const err = new Error('文件不存在'); err.statusCode = 404; throw err; }
  const content = fs.readFileSync(filePath, 'utf-8');
  const html = mdParse(content, { breaks: true, gfm: true });
  return { html };
}

function scanWikiLinkIssues() {
  return analyzeWikiLinks(extractSourceMd);
}

function repairWikiLinkIssues() {
  return repairWikiLinks(extractSourceMd, saveMarkdownFile);
}

function scanUnusedAssets() {
  const referenced = new Set();
  const assetFiles = [];
  function walk(dir, out = []) {
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, out);
      else out.push(full);
    }
    return out;
  }
  walk(FUJIAN_DIR, assetFiles);
  const articleFiles = [];
  walk(ARTICLES_DIR, articleFiles);
  articleFiles.filter(f => /\.html$/i.test(f)).forEach(file => {
    let html = '';
    try { html = fs.readFileSync(file, 'utf8'); } catch { return; }
    const md = extractSourceMd(ensureSourceMd(html));
    const re = /(?:!\[[^\]]*\]|\[[^\]]*\])\((\/fujian\/[^)\s]+)(?:\s+"[^"]*")?\)/g;
    let m;
    while ((m = re.exec(md))) {
      const webPath = decodeURIComponent(m[1]);
      const rel = webPath.replace(/^\/fujian\//, '').replace(/\//g, path.sep);
      referenced.add(path.resolve(FUJIAN_DIR, rel));
    }
  });
  const unused = assetFiles.filter(full => !referenced.has(path.resolve(full)));
  return {
    success: true,
    totalAssets: assetFiles.length,
    referencedAssets: referenced.size,
    unusedCount: unused.length,
    unused: unused.map(full => ({
      fullPath: full,
      relativePath: path.relative(FUJIAN_DIR, full).replace(/\\/g, '/'),
    })),
  };
}

function cleanupUnusedAssets() {
  const report = scanUnusedAssets();
  let moved = 0;
  report.unused.forEach(item => {
    try {
      moveAssetToRecycleBin(item.relativePath);
      moved += 1;
    } catch {}
  });
  return { success: true, moved, report: scanUnusedAssets() };
}

module.exports = {
  rebuildAllArticles,
  scanTree,
  listDir,
  readFileMarkdown,
  saveMarkdownFile,
  createFile,
  createDir,
  renamePath,
  movePath,
  movePaths,
  deletePath,
  uploadFiles,
  renderMarkdownFile,
  scanWikiLinkIssues,
  repairWikiLinkIssues,
  scanUnusedAssets,
  cleanupUnusedAssets,
};
