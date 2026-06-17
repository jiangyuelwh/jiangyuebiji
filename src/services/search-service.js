const fs = require('fs');
const path = require('path');
const { ARTICLES_DIR } = require('../config');

function searchFiles(q = '') {
  const keyword = String(q || '').trim().toLowerCase();
  if (!keyword) return { files: [] };
  const results = [];
  const seen = new Set();

  function walk(dir, prefix) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      const rel = prefix ? prefix + '/' + entry.name : entry.name;

      let matched = entry.name.toLowerCase().includes(keyword);
      let snippet = '';
      let matchType = 'filename';

      if (!matched && entry.isFile() && (entry.name.endsWith('.html') || entry.name.endsWith('.md'))) {
        try {
          const body = fs.readFileSync(full, 'utf-8');
          const lower = body.toLowerCase();
          const idx = lower.indexOf(keyword);
          if (idx !== -1) {
            matched = true;
            matchType = 'content';
            // Extract context around the match (up to 60 chars each side)
            const start = Math.max(0, idx - 60);
            const end = Math.min(body.length, idx + keyword.length + 60);
            let ctx = body.substring(start, end);
            // Try to clean up HTML tags from snippet
            ctx = ctx.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
            if (start > 0) ctx = '...' + ctx;
            if (end < body.length) ctx = ctx + '...';
            snippet = ctx;
          }
        } catch {}
      }

      if (matched && !seen.has(rel)) {
        seen.add(rel);
        results.push({
          name: entry.name,
          path: rel,
          isDir: entry.isDirectory(),
          dir: prefix || '',
          matchType,
          snippet,
          keyword
        });
      }

      if (entry.isDirectory()) walk(full, rel);
    }
  }

  walk(ARTICLES_DIR, '');
  return { files: results.slice(0, 50) };
}

module.exports = { searchFiles };
