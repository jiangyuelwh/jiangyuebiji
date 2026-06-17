const fs = require('fs');
const path = require('path');
const { ARTICLES_DIR } = require('../config');
const { extractTags } = require('./markdown-service');

function listTags(tag = '') {
  const results = [];

  function walk(dir, prefix) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      const rel = prefix ? prefix + '/' + entry.name : entry.name;
      if (entry.isDirectory()) { walk(full, rel); continue; }
      if (!entry.name.endsWith('.html') && !entry.name.endsWith('.md')) continue;
      try {
        const content = fs.readFileSync(full, 'utf-8');
        const tags = extractTags(content);
        if (!tag || tags.some((t) => t.toLowerCase().includes(tag.toLowerCase()))) {
          let title = entry.name.replace(/\.(html|md)$/i, '');
          const tm = content.match(/<title>(.+?)<\/title>/i);
          if (tm) title = tm[1];
          results.push({ name: entry.name, path: rel, title, tags });
        }
      } catch {}
    }
  }

  walk(ARTICLES_DIR, '');
  if (!tag) return { tags: [...new Set(results.flatMap((r) => r.tags))].sort() };
  return { files: results.slice(0, 50) };
}

module.exports = { listTags };
