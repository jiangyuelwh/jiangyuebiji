const fs = require('fs');
const path = require('path');
const { ARTICLES_DIR, FUJIAN_DIR } = require('../config');
const { buildHtml, ensureSourceMd, extractSourceMd, mdParse } = require('./markdown-service');
const { TODAY_CHROME } = require('./today-chrome');
const { REMINDER_CHROME } = require('./reminder-chrome');

function getAssetDirForArticleRel(relPath) {
  return path.join(FUJIAN_DIR, ...String(relPath || '').replace(/\\/g, '/').replace(/\.html$/i, '').split('/').filter(Boolean));
}

function getAssetWebBaseForArticleRel(relPath) {
  const scope = String(relPath || '').replace(/\\/g, '/').replace(/\.html$/i, '').split('/').filter(Boolean).map(encodeURIComponent).join('/');
  return '/fujian/' + scope;
}

function normalizeAssetLinksForArticleMarkdown(markdown, articleRelPath) {
  const assetDir = getAssetDirForArticleRel(articleRelPath);
  let fileNames = new Set();
  try {
    if (fs.existsSync(assetDir)) {
      fileNames = new Set(fs.readdirSync(assetDir, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => e.name));
    }
  } catch {}
  if (!fileNames.size) return markdown;
  const targetBase = getAssetWebBaseForArticleRel(articleRelPath);
  return String(markdown || '').replace(
    /((?:!\[[^\]]*\]|\[[^\]]*\])\()(\s*)(\/fujian\/[^)\s]+)(\s*(?:"[^"]*")?\))/g,
    (all, prefix, gap, url, suffix) => {
      let decoded = '';
      try { decoded = decodeURIComponent(url); } catch { decoded = url; }
      const parts = decoded.replace(/^\/fujian\//, '').split('/').filter(Boolean);
      const fileName = parts.length ? parts[parts.length - 1] : '';
      if (!fileName || !fileNames.has(fileName)) return all;
      return prefix + gap + targetBase + '/' + encodeURIComponent(fileName) + suffix;
    }
  );
}

function preserveChromeHtml(existingHtml, relPath) {
  let chromeHtml = '';
  try {
    const m = String(existingHtml || '').match(/<article class="markdown-body">([\s\S]*?)<h1>/);
    if (m && (m[1].includes('addTaskBtn') || m[1].includes('addRemBtn') || m[1].includes('addTaskModal') || m[1].includes('addRemModal'))) chromeHtml = m[1];
  } catch {}
  if (!chromeHtml) {
    if (String(relPath || '').includes('今日任务')) chromeHtml = TODAY_CHROME;
    else if (String(relPath || '').includes('提醒事项')) chromeHtml = REMINDER_CHROME;
  }
  return chromeHtml;
}

function rewriteArticleAssetLinksAtPath(filePath, articleRelPath) {
  if (!/\.html$/i.test(String(filePath || '')) || !fs.existsSync(filePath)) return false;
  const rawHtml = fs.readFileSync(filePath, 'utf8');
  const html = ensureSourceMd(rawHtml);
  const markdown = extractSourceMd(html);
  const normalized = normalizeAssetLinksForArticleMarkdown(markdown, articleRelPath);
  if (normalized === markdown && html === rawHtml) return false;
  if (normalized === markdown) {
    if (html !== rawHtml) fs.writeFileSync(filePath, html, 'utf8');
    return false;
  }
  const title = path.basename(articleRelPath || '', '.html');
  const bodyHtml = mdParse(normalized, { breaks: true, gfm: true });
  const chromeHtml = preserveChromeHtml(rawHtml, articleRelPath);
  const rebuilt = buildHtml(title, bodyHtml, normalized, chromeHtml, articleRelPath);
  fs.writeFileSync(filePath, rebuilt, 'utf8');
  return true;
}

function walkArticleFiles(rootPath, out = []) {
  let entries = [];
  try { entries = fs.readdirSync(rootPath, { withFileTypes: true }); } catch { return out; }
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(rootPath, entry.name);
    if (entry.isDirectory()) walkArticleFiles(full, out);
    else if (/\.html$/i.test(entry.name) && entry.name !== 'renwu.html') out.push(full);
  }
  return out;
}

function normalizeArticleOrDirAssetLinks(targetPath) {
  if (!fs.existsSync(targetPath)) return 0;
  const stat = fs.statSync(targetPath);
  if (stat.isFile()) {
    const relPath = path.relative(ARTICLES_DIR, targetPath).replace(/\\/g, '/');
    return rewriteArticleAssetLinksAtPath(targetPath, relPath) ? 1 : 0;
  }
  const files = walkArticleFiles(targetPath, []);
  let changed = 0;
  for (const filePath of files) {
    const relPath = path.relative(ARTICLES_DIR, filePath).replace(/\\/g, '/');
    if (rewriteArticleAssetLinksAtPath(filePath, relPath)) changed += 1;
  }
  return changed;
}

module.exports = {
  getAssetDirForArticleRel,
  normalizeAssetLinksForArticleMarkdown,
  rewriteArticleAssetLinksAtPath,
  normalizeArticleOrDirAssetLinks,
};
