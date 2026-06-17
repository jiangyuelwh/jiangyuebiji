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
      return '<a href="' + escHtml(url || '') + '"' + (tip ? ' title="' + escHtml(tip) + '"' : '') + '>' + escHtml(label) + '</a>';
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
    + '  .markdown-body { box-sizing: border-box; min-width: 200px; max-width: 860px; margin: 0 auto; padding: 45px 45px 96px; }\n'
    + '  .wiki-link { color:#1a73e8; text-decoration:none; border-bottom:1px dashed #1a73e8; }\n'
    + '  .wiki-link:hover { border-bottom-style:solid; }\n'
    + '  .md-asset-link { display:inline-flex; align-items:center; gap:8px; padding:10px 12px; margin:6px 0; border:1px solid #dbe2ea; border-radius:10px; background:#f8fafc; color:#0f172a; text-decoration:none; max-width:100%; }\n'
    + '  .md-asset-link:hover { background:#eef6ff; border-color:#bfd3ea; }\n'
    + '  .md-asset-icon { font-size:16px; }\n'
    + '  .md-asset-name { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }\n'
    + '  .md-asset-image { margin:12px 0; }\n'
    + '  .md-asset-image img { max-width:100%; height:auto; border-radius:10px; border:1px solid #e5e7eb; display:block; cursor:zoom-in; }\n'
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
    + '  @media (max-width:767px) { .markdown-body { padding: 15px 15px 72px; } .markdown-body pre { padding:12px; font-size:12px; } .markdown-body table { font-size:12px; } }\n'
    + '</style>\n</head>\n<body>\n'
    + '<article class="markdown-body">' + (chromeHtml || '') + visibleBody + backlinksHtml + '</article>\n'
    + '<div id="imageLightbox" class="image-lightbox" aria-hidden="true"><div class="image-lightbox-inner"><button type="button" class="image-lightbox-close" aria-label="关闭">×</button><img id="imageLightboxImg" src="" alt=""></div></div>\n'
    + scriptBlocks.join('\n') + '\n'
    + '<button onclick="copyLink(this)" style="position:fixed;top:12px;right:12px;z-index:999;border:1px solid rgba(208,215,222,.9);background:rgba(255,255,255,0.72);border-radius:10px;padding:10px 14px;cursor:pointer;font-size:14px;font-weight:600;box-shadow:0 2px 10px rgba(0,0,0,0.08);line-height:1.2;backdrop-filter:blur(6px);opacity:.86" title="复制文章链接">\n  🔗\n</button>\n'
    + '<script>function copyLink(b){var text=window.location.href||"";function done(ok){b.innerHTML=ok?"\\u2713 \\u5df2\\u590d\\u5236":"\\u2717 \\u590d\\u5236\\u5931\\u8d25";setTimeout(function(){b.innerHTML="\\ud83d\\udd17"},2000)}function showManual(){try{window.prompt("\\u8bf7\\u590d\\u5236\\u8fd9\\u4e2a\\u94fe\\u63a5",text)}catch(e){alert(text)}done(false)}if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(text).then(function(){done(true)}).catch(function(){fallback()});return}fallback();function fallback(){var ta=document.createElement("textarea");ta.value=text;ta.setAttribute("readonly","readonly");ta.style.position="fixed";ta.style.top="0";ta.style.left="-9999px";ta.style.opacity="0";document.body.appendChild(ta);ta.focus();ta.select();ta.setSelectionRange(0,ta.value.length);var ok=false;try{ok=document.execCommand("copy")}catch(e){ok=false}document.body.removeChild(ta);if(ok){done(true)}else{showManual()}}}function _openWikiLink(path,name){try{if(window.parent&&window.parent!==window&&typeof window.parent.viewFile===\'function\'){window.parent.viewFile(name,path);return}}catch(e){} location.href=\'/?view=\'+encodeURIComponent(path)}(function(){var box=document.getElementById("imageLightbox");var img=document.getElementById("imageLightboxImg");if(!box||!img)return;function closeBox(){box.classList.remove("open");box.setAttribute("aria-hidden","true");img.src="";img.alt=""}document.addEventListener("click",function(e){var t=e.target;if(t&&t.closest&&t.closest(".md-asset-image img")){var im=t.closest(".md-asset-image img");img.src=im.getAttribute("src")||"";img.alt=im.getAttribute("alt")||"";box.classList.add("open");box.setAttribute("aria-hidden","false");e.preventDefault();return}if(t===box||t.closest(".image-lightbox-close"))closeBox()});document.addEventListener("keydown",function(e){if(e.key==="Escape")closeBox()})})();</script>\n'
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
    + '  .markdown-body { box-sizing: border-box; min-width: 200px; max-width: 860px; margin: 0 auto; padding: 45px 45px 96px; }\n'
    + '  .markdown-body pre { overflow-x:auto; padding:14px 16px; border-radius:10px; background:#f6f8fa; }\n'
    + '  .markdown-body code { word-break:break-word; }\n'
    + '  .markdown-body table { display:block; width:max-content; max-width:100%; overflow-x:auto; border-collapse:collapse; }\n'
    + '  .markdown-body th, .markdown-body td { white-space:nowrap; }\n'
    + '  @media (max-width:767px) { .markdown-body { padding: 15px 15px 72px; } .markdown-body pre { padding:12px; font-size:12px; } .markdown-body table { font-size:12px; } }\n'
    + '</style>\n</head>\n<body>\n'
    + '<article class="markdown-body">' + bodyHtml + '</article>\n'
    + '</body>\n</html>\n'
    + MD_START + '\n' + mdText + '\n' + MD_END;
}

module.exports = {
  MD_START,
  MD_END,
  preprocessMd,
  mdParse,
  escHtml,
  extractTags,
  extractTitle,
  hasTag,
  findLineIdx,
  replaceMdLineTagAware,
  buildHtml,
  extractSourceMd,
  ensureSourceMd,
};




