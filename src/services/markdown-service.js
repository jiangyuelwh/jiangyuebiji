const { marked } = require('marked');
const TurndownService = require('turndown');
const { buildBacklinksMap, renderWikiLinksHtml, renderBacklinksHtml } = require('./wiki-service');

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
});

const MD_START = '<!--source-md';
const MD_END = '/source-md-->';

function preprocessMd(md) {
  md = md.replace(/\*\*(\S[^*]*?[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef])\*\*/g, '<strong>$1</strong>');
  return md;
}

function isExternalUrl(url) {
  return /^https?:\/\//i.test(String(url || '').trim());
}

function isLikelyInternalHref(url) {
  const value = String(url || '').trim();
  if (!value) return false;
  if (/^(\/|\.\/|\.\.\/|#)/.test(value)) return true;
  if (/^\/?(articles|fujian|system)\//i.test(value)) return true;
  if (/\.html?(?:[?#].*)?$/i.test(value)) return true;
  return false;
}

function normalizeExternalUrl(url) {
  const value = String(url || '').trim();
  if (!value) return '';
  if (isExternalUrl(value)) return value;
  if (/^(mailto:|tel:)/i.test(value)) return value;
  if (isLikelyInternalHref(value)) return value;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) return value;
  return 'https://' + value.replace(/^\/+/, '');
}

function normalizeExternalLinksInMarkdown(md) {
  return String(md || '').replace(/(^|[^!])\[([^\]]+)\]\(([^)\s]+)(\s+"[^"]*")?\)/g, function(all, prefix, text, href, titlePart){
    const normalized = normalizeExternalUrl(href);
    return prefix + '[' + text + '](' + normalized + (titlePart || '') + ')';
  });
}

function mdParse(text, opts) {
  return marked.parse(preprocessMd(text || ''), opts);
}

marked.use({
  renderer: {
    image(href, title, text) {
      const token = href && typeof href === 'object' && !Array.isArray(href) ? href : null;
      const src = token ? (token.href || '') : (typeof href === 'string' ? href : (href && href.href) || '');
      const alt = token ? (token.text || token.title || '') : (text || '');
      const tip = token ? token.title : title;
      return '<figure class="md-asset-image"><img src="' + escHtml(src || '') + '" alt="' + escHtml(alt) + '"' + (tip ? ' title="' + escHtml(tip) + '"' : '') + '><figcaption>' + escHtml(alt || pathLikeName(src || '图片')) + '</figcaption></figure>';
    },
    link(href, title, text) {
      const token = href && typeof href === 'object' && !Array.isArray(href) ? href : null;
      const url = token ? (token.href || '') : (typeof href === 'string' ? href : (href && href.href) || '');
      const label = token ? (token.text || text || url || '') : (text || url || '');
      const tip = token ? token.title : title;
      if (/^\/fujian\//.test(String(url || ''))) {
        return '<a class="md-asset-link" href="' + escHtml(url || '') + '" target="_blank" rel="noopener noreferrer">' +
          '<span class="md-asset-icon">📎</span><span class="md-asset-name">' + escHtml(label) + '</span></a>';
      }
      const externalAttrs = isExternalUrl(url) ? ' target="_blank" rel="noopener noreferrer"' : '';
      return '<a href="' + escHtml(url || '') + '"' + (tip ? ' title="' + escHtml(tip) + '"' : '') + externalAttrs + '>' + escHtml(label) + '</a>';
    }
  }
});

function pathLikeName(v) {
  return String(v || '').split('/').pop() || String(v || '');
}

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function extractTags(mdText) {
  const tags = [];
  const m = mdText.match(/<!--\s*tags?\s*:\s*(.+?)\s*-->/i);
  if (m) tags.push(...m[1].split(/[,，、\s]+/).filter(Boolean));
  return [...new Set(tags)];
}

function extractTitle(md) {
  const m = md.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : '无标题';
}

function hasTag(line, tag) {
  return line.includes('<!-- ' + tag + ' -->') || line.includes('%%' + tag + '%%');
}

function findLineIdx(lines, target) {
  const stripped = target.replace(/<!--[\s\S]*?-->/g, '').trim();
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].replace(/<!--[\s\S]*?-->/g, '').trim() === stripped) return i;
  }
  return -1;
}

function replaceMdLineTagAware(mdText, raw) {
  const oldRaw = /\[x\]/i.test(raw) ? raw.replace(/\[x\]/i, '[ ]') : raw.replace('[ ]', '[x]');
  const lines = mdText.split('\n');
  const strippedOld = oldRaw.replace(/<!--[\s\S]*?-->/g, '').trim();
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].replace(/<!--[\s\S]*?-->/g, '').trim() === strippedOld) {
      const tagMatch = lines[i].match(/<!--[\s\S]*?-->/);
      let newLine = raw;
      if (tagMatch && !raw.includes('<!--')) newLine = raw.trim() + ' ' + tagMatch[0];
      lines[i] = newLine;
      return lines.join('\n');
    }
  }
  return null;
}

function buildHtml(title, bodyHtml, sourceMd, chromeHtml, currentRelPath) {
  const scriptBlocks = [];
  String(bodyHtml || '').replace(/<script[\s\S]*?<\/script>/gi, (m) => {
    scriptBlocks.push(m);
    return m;
  });
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
    + '  body.view-font-lg .markdown-body{font-size:20px;line-height:2}\n'
    + '  body.view-font-sm .markdown-body{font-size:17px;line-height:1.85}\n'
    + '  .view-actions{position:fixed;top:14px;right:14px;z-index:1200;display:flex;gap:8px;align-items:center}\n'
    + '  .view-font-btn{height:38px;min-width:38px;padding:0 12px;border:1px solid rgba(208,215,222,.95);background:rgba(255,255,255,.86);border-radius:10px;cursor:pointer;font-size:18px;font-weight:700;color:#0f172a;box-shadow:0 2px 10px rgba(0,0,0,.08);backdrop-filter:blur(6px)}\n'
    + '  .view-font-btn:hover{background:#fff;border-color:#bfd3ea}\n'
    + '  .article-spacer{height:1.4em;flex:0 0 auto}\n'
    + '  .markdown-body { box-sizing: border-box; min-width: 200px; max-width: 860px; margin: 0 auto; padding: 45px 45px 96px; font-size:18px; line-height:1.9; }\n'
    + '  .wiki-link { color:#1a73e8; text-decoration:none; border-bottom:1px dashed #1a73e8; }\n'
    + '  .wiki-link:hover { border-bottom-style:solid; }\n'
    + '  .md-asset-link { display:inline-flex; align-items:center; gap:8px; padding:10px 12px; margin:6px 0; border:1px solid #dbe2ea; border-radius:10px; background:#f8fafc; color:#0f172a; text-decoration:none; max-width:100%; }\n'
    + '  .md-asset-link:hover { background:#eef6ff; border-color:#bfd3ea; }\n'
    + '  .md-asset-icon { font-size:16px; }\n'
    + '  .md-asset-name { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }\n'
    + '  .md-asset-image { margin:12px 0; }\n'
    + '  .md-asset-image img { max-width:100%; width:auto; height:auto; border-radius:10px; border:1px solid #e5e7eb; display:block; cursor:zoom-in; }\n'
    + '  .md-asset-image figcaption { margin-top:6px; font-size:12px; color:#64748b; }\n'
    + '  .markdown-body pre { overflow-x:auto; padding:14px 16px; border-radius:10px; background:#f6f8fa; }\n'
    + '  .markdown-body code { word-break:break-word; }\n'
    + '  .markdown-body table { display:block; width:max-content; max-width:100%; overflow-x:auto; border-collapse:collapse; }\n'
    + '  .markdown-body th, .markdown-body td { white-space:nowrap; }\n'
    + '  .image-lightbox { position:fixed; inset:0; background:rgba(15,23,42,.82); display:none; align-items:center; justify-content:center; z-index:3000; padding:24px; }\n'
    + '  .image-lightbox.open { display:flex; }\n'
    + '  .image-lightbox-inner { position:relative; max-width:min(96vw,1400px); max-height:92vh; display:flex; align-items:center; justify-content:center; }\n'
    + '  .image-lightbox img { max-width:96vw; max-height:88vh; width:auto; height:auto; border-radius:12px; box-shadow:0 20px 60px rgba(0,0,0,.35); background:#fff; }\n'
    + '  .image-lightbox-close { position:absolute; top:-14px; right:-14px; width:36px; height:36px; border:none; border-radius:999px; background:#fff; color:#0f172a; font-size:22px; line-height:1; cursor:pointer; box-shadow:0 8px 30px rgba(0,0,0,.2); }\n'
    + '  @media (max-width:767px) { .view-actions{top:10px;right:10px}.view-font-btn{height:36px;min-width:36px;padding:0 10px;font-size:17px}.markdown-body { padding: 15px 15px 72px; } .markdown-body pre { padding:12px; font-size:12px; } .markdown-body table { font-size:12px; } }\n'
    + '</style>\n</head>\n<body>\n'
    + '<div class="view-actions"><button type="button" class="view-font-btn" id="fontMinusBtn" aria-label="字体变小" title="字体变小">A-</button><button type="button" class="view-font-btn" id="fontPlusBtn" aria-label="字体变大" title="字体变大">A+</button></div>\n'
    + '<article class="markdown-body"><div class="article-spacer" aria-hidden="true"></div>' + (chromeHtml || '') + visibleBody + backlinksHtml + '</article>\n'
    + '<div id="imageLightbox" class="image-lightbox" aria-hidden="true"><div class="image-lightbox-inner"><button type="button" class="image-lightbox-close" aria-label="关闭">×</button><img id="imageLightboxImg" src="" alt=""></div></div>\n'
    + scriptBlocks.join('\n') + '\n'
    + '<script>function _openWikiLink(path,name){try{if(window.parent&&window.parent!==window&&typeof window.parent.viewFile===\'function\'){window.parent.viewFile(name,path);return}}catch(e){} location.href=\'/?view=\'+encodeURIComponent(path)}(function(){var box=document.getElementById("imageLightbox");var img=document.getElementById("imageLightboxImg");var plus=document.getElementById("fontPlusBtn");var minus=document.getElementById("fontMinusBtn");var key="liruibiji_view_font";if(plus&&minus){function applyFont(mode){document.body.classList.remove("view-font-sm","view-font-lg");if(mode==="lg")document.body.classList.add("view-font-lg");else if(mode==="sm")document.body.classList.add("view-font-sm");try{localStorage.setItem(key,mode||"md")}catch(e){}}try{applyFont(localStorage.getItem(key)||"md")}catch(e){}plus.addEventListener("click",function(){if(document.body.classList.contains("view-font-sm"))applyFont("md");else applyFont("lg")});minus.addEventListener("click",function(){if(document.body.classList.contains("view-font-lg"))applyFont("md");else applyFont("sm")})}if(!box||!img)return;function closeBox(){box.classList.remove("open");box.setAttribute("aria-hidden","true");img.src="";img.alt=""}document.addEventListener("click",function(e){var t=e.target;if(t&&t.closest&&t.closest(".md-asset-image img")){var im=t.closest(".md-asset-image img");img.src=im.getAttribute("src")||"";img.alt=im.getAttribute("alt")||"";box.classList.add("open");box.setAttribute("aria-hidden","false");e.preventDefault();return}if(t===box||t.closest(".image-lightbox-close"))closeBox()});document.addEventListener("keydown",function(e){if(e.key==="Escape")closeBox()})})();</script>\n'
    + '</body>\n</html>\n'
    + MD_START + '\n' + sourceMd + '\n' + MD_END;
}

function extractSourceMd(html) {
  const newMatch = html.match(/<!--source-md\s*([\s\S]*?)\s*\/source-md-->/);
  if (newMatch) return newMatch[1].trim();
  const oldMatch = html.match(/<!--source-md-->([\s\S]*?)<!--\/source-md-->/);
  if (oldMatch) return oldMatch[1].trim();
  const tm = html.match(/<title>(.+?)<\/title>/);
  const title = tm ? tm[1] : '无标题';
  return '# ' + title + '\n\n<!-- markdown源丢失 -->\n';
}

function ensureSourceMd(html) {
  if (/<!--source-md[\s\S]*?\/source-md-->/.test(html)) return html;
  if (/<!--source-md-->[\s\S]*?<!--\/source-md-->/.test(html)) return html;

  const scriptBlocks = [];
  const bodyMatchAll = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatchAll) bodyMatchAll[1].replace(/<script[\s\S]*?<\/script>/gi, (m) => { scriptBlocks.push(m); });

  let mdText = '';
  try {
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    const articleMatch = html.match(/<article[^>]*>([\s\S]*)<\/article>/i);
    const bodyContent = articleMatch ? articleMatch[1] : (bodyMatch ? bodyMatch[1] : html);
    mdText = turndown.turndown(bodyContent).trim();
  } catch {
    const tm = html.match(/<title>(.+?)<\/title>/);
    const title = tm ? tm[1] : '无标题';
    mdText = '# ' + title + '\n\n> 自动从 HTML 转换\n';
  }

  if (scriptBlocks.length > 0) mdText += '\n\n' + scriptBlocks.join('\n');
  const tm = html.match(/<title>(.+?)<\/title>/);
  const title = tm ? tm[1] : '无标题';
  if (!/^#\s/m.test(mdText)) mdText = '# ' + title + '\n\n' + mdText;
  const bodyHtml = mdParse(mdText, { breaks: true, gfm: true });

  return '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n'
    + '<meta charset="utf-8">\n'
    + '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
    + '<title>' + escHtml(title) + '</title>\n'
    + '<link rel="stylesheet" href="/static/github-markdown.min.css">\n'
    + '<style>\n  body { margin:0; background:#fff; }\n'
    + '  body.view-font-lg .markdown-body{font-size:20px;line-height:2}\n'
    + '  body.view-font-sm .markdown-body{font-size:17px;line-height:1.85}\n'
    + '  .view-actions{position:fixed;top:14px;right:14px;z-index:1200;display:flex;gap:8px;align-items:center}\n'
    + '  .view-font-btn{height:38px;min-width:38px;padding:0 12px;border:1px solid rgba(208,215,222,.95);background:rgba(255,255,255,.86);border-radius:10px;cursor:pointer;font-size:18px;font-weight:700;color:#0f172a;box-shadow:0 2px 10px rgba(0,0,0,.08);backdrop-filter:blur(6px)}\n'
    + '  .view-font-btn:hover{background:#fff;border-color:#bfd3ea}\n'
    + '  .article-spacer{height:1.4em;flex:0 0 auto}\n'
    + '  .markdown-body { box-sizing: border-box; min-width: 200px; max-width: 860px; margin: 0 auto; padding: 45px 45px 96px; font-size:18px; line-height:1.9; }\n'
    + '  .markdown-body pre { overflow-x:auto; padding:14px 16px; border-radius:10px; background:#f6f8fa; }\n'
    + '  .markdown-body code { word-break:break-word; }\n'
    + '  .markdown-body table { display:block; width:max-content; max-width:100%; overflow-x:auto; border-collapse:collapse; }\n'
    + '  .markdown-body th, .markdown-body td { white-space:nowrap; }\n'
    + '  @media (max-width:767px) { .view-actions{top:10px;right:10px}.view-font-btn{height:36px;min-width:36px;padding:0 10px;font-size:17px}.markdown-body { padding: 15px 15px 72px; } .markdown-body pre { padding:12px; font-size:12px; } .markdown-body table { font-size:12px; } }\n'
    + '</style>\n</head>\n<body>\n'
    + '<div class="view-actions"><button type="button" class="view-font-btn" id="fontMinusBtn" aria-label="字体变小" title="字体变小">A-</button><button type="button" class="view-font-btn" id="fontPlusBtn" aria-label="字体变大" title="字体变大">A+</button></div>\n'
    + '<article class="markdown-body"><div class="article-spacer" aria-hidden="true"></div>' + bodyHtml + '</article>\n'
    + '<script>(function(){var plus=document.getElementById("fontPlusBtn");var minus=document.getElementById("fontMinusBtn");var key="liruibiji_view_font";if(!plus||!minus)return;function applyFont(mode){document.body.classList.remove("view-font-sm","view-font-lg");if(mode==="lg")document.body.classList.add("view-font-lg");else if(mode==="sm")document.body.classList.add("view-font-sm");try{localStorage.setItem(key,mode||"md")}catch(e){}}try{applyFont(localStorage.getItem(key)||"md")}catch(e){}plus.addEventListener("click",function(){if(document.body.classList.contains("view-font-sm"))applyFont("md");else applyFont("lg")});minus.addEventListener("click",function(){if(document.body.classList.contains("view-font-lg"))applyFont("md");else applyFont("sm")})})();</script>\n'
    + '</body>\n</html>\n'
    + MD_START + '\n' + mdText + '\n' + MD_END;
}

module.exports = {
  MD_START,
  MD_END,
  preprocessMd,
  mdParse,
  escHtml,
  isExternalUrl,
  normalizeExternalUrl,
  normalizeExternalLinksInMarkdown,
  extractTags,
  extractTitle,
  hasTag,
  findLineIdx,
  replaceMdLineTagAware,
  buildHtml,
  extractSourceMd,
  ensureSourceMd,
};




