const fs = require("fs");
const path = require("path");
const { ARTICLES_DIR } = require("../config");

function normalizeArticlePath(p) {
  const parts = [];
  String(p || "").replace(/\\/g, "/").split("/").forEach((seg) => {
    if (!seg || seg === ".") return;
    if (seg === "..") { if (parts.length) parts.pop(); return; }
    parts.push(seg);
  });
  return parts.join("/");
}

function resolveWikiTarget(raw, currentRelPath) {
  let target = String(raw || "").trim().replace(/\\/g, "/");
  if (!target) return "";
  if (!/\.html$/i.test(target)) target += ".html";

  const current = normalizeArticlePath(String(currentRelPath || "").replace(/\\/g, "/"));
  const baseParts = current ? current.split("/") : [];
  if (baseParts.length) baseParts.pop();

  if (/^(\.\/|\.\.\/)/.test(target)) {
    return normalizeArticlePath(baseParts.concat(target.split("/")).join("/"));
  }

  if (target.includes("/")) {
    return normalizeArticlePath(target);
  }

  const relativeTarget = normalizeArticlePath(baseParts.concat([target]).join("/"));
  const relativeFullPath = path.join(ARTICLES_DIR, relativeTarget);
  if (fs.existsSync(relativeFullPath)) return relativeTarget;

  const allMatches = scanAllArticles()
    .map((item) => item.rel)
    .filter((rel) => rel.split("/").pop().toLowerCase() === target.toLowerCase());
  if (allMatches.length === 1) return allMatches[0];

  return relativeTarget;
}

function extractWikiLinks(mdText, currentRelPath) {
  const out = [];
  const re = /\[\[([^\]]+)\]\]/g;
  let m;
  while ((m = re.exec(String(mdText || "")))) {
    const rel = resolveWikiTarget(m[1], currentRelPath);
    if (rel) out.push(rel);
  }
  return [...new Set(out)];
}

function scanAllArticles() {
  const files = [];
  function walk(dir, prefix) {
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name.startsWith(".")) continue;
      const full = path.join(dir, e.name);
      const rel = prefix ? prefix + "/" + e.name : e.name;
      if (e.isDirectory()) walk(full, rel);
      else if (/\.html$/i.test(e.name)) files.push({ full, rel });
    }
  }
  walk(ARTICLES_DIR, "");
  return files;
}

function buildBacklinksMap(extractSourceMd) {
  const map = new Map();
  const files = scanAllArticles();
  for (const file of files) {
    let html = "";
    try { html = fs.readFileSync(file.full, "utf-8"); } catch { continue; }
    const md = extractSourceMd(html);
    const links = extractWikiLinks(md, file.rel);
    for (const target of links) {
      if (!map.has(target)) map.set(target, []);
      map.get(target).push(file.rel);
    }
  }
  for (const [k, arr] of map.entries()) map.set(k, [...new Set(arr)]);
  return map;
}

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
}

function renderWikiLinksHtml(html, currentRelPath) {
  return String(html || "").replace(/\[\[([^\]]+)\]\]/g, (_, raw) => {
    const targetRel = resolveWikiTarget(raw, currentRelPath);
    const display = String(raw || "").trim().replace(/\.html$/i, "").split("/").pop();
    return '<a class="wiki-link" href="javascript:void(0)" onclick="_openWikiLink(\'' + esc(targetRel) + '\',\'' + esc(display) + '\')">' + esc(display) + '</a>';
  });
}

function renderBacklinksHtml(currentRelPath, backlinksMap) {
  const refs = (backlinksMap && backlinksMap.get(currentRelPath)) || [];
  if (!refs.length) return "";
  const items = refs.map((rel) => {
    const name = rel.replace(/\.html$/i, "").split("/").pop();
    return '<li style="margin:0 0 8px"><a class="wiki-link" href="javascript:void(0)" onclick="_openWikiLink(\'' + esc(rel) + '\',\'' + esc(name) + '\')">' + esc(name) + '</a><span style="color:#64748b;font-size:12px"> · ' + esc(rel) + '</span></li>';
  }).join("");
  return '<section style="margin-top:32px;padding:16px 18px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 1px 2px rgba(15,23,42,.04)"><h3 style="margin:0 0 12px;font-size:17px;color:#334155">反向链接</h3><ul style="margin:0;padding-left:20px">' + items + '</ul></section>';
}

module.exports = {
  normalizeArticlePath,
  resolveWikiTarget,
  extractWikiLinks,
  scanAllArticles,
  buildBacklinksMap,
  renderWikiLinksHtml,
  renderBacklinksHtml,
};
