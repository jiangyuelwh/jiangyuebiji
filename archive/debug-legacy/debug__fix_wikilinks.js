const fs = require("fs");
let text = fs.readFileSync("D:/liruibiji/static/index-enhancements.js", "utf-8");
const start = text.indexOf("function parseWikiLinks(html) {");
const end = text.indexOf("// Hook into marked parse", start);
if (start < 0 || end < 0) throw new Error("parseWikiLinks block not found");
const replacement = `function parseWikiLinks(html) {
  return html.replace(/\\[\\[([^\\]]+)\\]\\]/g, function(m, name) {
    var raw = String(name || '').trim();
    var displayName = raw.replace(/\\.html$/i, '').split('/').pop();
    var filePath = raw;
    if (typeof resolveInternalLinkPath === 'function') {
      filePath = resolveInternalLinkPath(raw, currentFile || '');
    } else {
      if (!/\\.html$/i.test(filePath)) filePath += '.html';
    }
    return '<a class="wiki-link" href="javascript:void(0)" onclick="event.stopPropagation();viewFile(\\''
      + escAttr(displayName)
      + '\\',\\''
      + escAttr(filePath)
      + '\\')">'
      + esc(displayName)
      + '</a>';
  });
}

`;
text = text.slice(0, start) + replacement + text.slice(end);
fs.writeFileSync("D:/liruibiji/static/index-enhancements.js", text, "utf-8");
console.log("block rewritten");
