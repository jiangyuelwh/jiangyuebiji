const fs = require("fs");
let text = fs.readFileSync("D:/liruibiji/src/services/markdown-service.js", "utf-8");

if (!text.includes("require('./wiki-service')")) {
  text = text.replace(
    "const TurndownService = require('turndown');",
    "const TurndownService = require('turndown');\nconst { buildBacklinksMap, renderWikiLinksHtml, renderBacklinksHtml } = require('./wiki-service');"
  );
}

const start = text.indexOf("function buildHtml(title, bodyHtml, sourceMd, chromeHtml) {");
const end = text.indexOf("function extractSourceMd(html) {");
if (start < 0 || end < 0) throw new Error("buildHtml block not found");

const replacement = `function buildHtml(title, bodyHtml, sourceMd, chromeHtml, currentRelPath) {
  const scriptBlocks = [];
  sourceMd.replace(/<script[\s\S]*?<\/script>/gi, (m) => { scriptBlocks.push(m); return ''; });
  const cleanBody = bodyHtml.replace(/<script[\s\S]*?<\/script>/gi, '');
  let visibleBody = cleanBody
    .replace(/%%提醒事项%%/g, '<!-- 提醒事项 -->')
    .replace(/%%每日任务%%/g, '<!-- 每日任务 -->')
    .replace(/%%每日任务模板%%/g, '<!-- 每日任务模板 -->');

  const backlinksMap = buildBacklinksMap(extractSourceMd);
  visibleBody = renderWikiLinksHtml(visibleBody, currentRelPath || '');
  const backlinksHtml = renderBacklinksHtml(currentRelPath || '', backlinksMap);

  return '<!DOCTYPE html>\n'
    + '<html lang="zh-CN">\n<head>\n'
    + '<meta charset="utf-8">\n'
    + '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
    + '<title>' + escHtml(title) + '</title>\n'
    + '<link rel="stylesheet" href="/static/github-markdown.min.css">\n'
    + '<style>\n  body { margin:0; background:#fff; }\n'
    + '  .markdown-body { box-sizing: border-box; min-width: 200px; max-width: 860px; margin: 0 auto; padding: 45px; }\n'
    + '  .wiki-link { color:#1a73e8; text-decoration:none; border-bottom:1px dashed #1a73e8; }\n'
    + '  .wiki-link:hover { border-bottom-style:solid; }\n'
    + '  @media (max-width:767px) { .markdown-body { padding: 15px; } }\n'
    + '</style>\n</head>\n<body>\n'
    + '<article class="markdown-body">' + (chromeHtml || '') + visibleBody + backlinksHtml + '</article>\n'
    + '<button onclick="copyLink(this)" style="position:fixed;top:8px;right:8px;z-index:999;border:1px solid #e0e0e0;background:#fff;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:13px;box-shadow:0 1px 4px rgba(0,0,0,0.08);line-height:1" title="复制文章链接">\n  🔗\n</button>\n'
    + '<script>function copyLink(b){navigator.clipboard.writeText(window.location.href).then(function(){b.innerHTML="\\u2713 \\u5df2\\u590d\\u5236";setTimeout(function(){b.innerHTML="\\ud83d\\udd17"},2000)}).catch(function(){b.innerHTML="\\u2717 \\u590d\\u5236\\u5931\\u8d25"})}function _openWikiLink(path,name){try{if(window.parent&&window.parent!==window&&typeof window.parent.viewFile==='function'){window.parent.viewFile(name,path);return}}catch(e){} location.href='/?view='+encodeURIComponent(path)}</script>\n'
    + '</body>\n</html>\n'
    + MD_START + '\n' + sourceMd + '\n' + MD_END;
}

`;

text = text.slice(0, start) + replacement + text.slice(end);
fs.writeFileSync("D:/liruibiji/src/services/markdown-service.js", text, "utf-8");
console.log("markdown-service buildHtml patched");
