const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');
const cheerio = require('cheerio');
const TurndownService = require('turndown');
let playwright = null;
try { playwright = require('playwright'); } catch {}

const { ARTICLES_DIR, FUJIAN_DIR, SNAPSHOTS_DIR } = require('../config');
const { mdParse, buildHtml } = require('./markdown-service');
const { rebuildAllArticles } = require('./file-service');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0 Safari/537.36';
const MAX_HTML_BYTES = 8 * 1024 * 1024;
const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '*',
});

turndown.addRule('figureImage', {
  filter: ['figure'],
  replacement(content, node) {
    const img = node.querySelector && node.querySelector('img');
    if (!img) return '\n\n' + content + '\n\n';
    const src = img.getAttribute('src') || img.getAttribute('data-src') || '';
    const alt = img.getAttribute('alt') || '';
    return '\n\n![' + alt + '](' + src + ')\n\n';
  }
});

turndown.addRule('preserveImage', {
  filter: ['img'],
  replacement(content, node) {
    const src = node.getAttribute('src') || node.getAttribute('data-src') || '';
    const alt = node.getAttribute('alt') || '';
    return src ? '\n\n![' + alt + '](' + src + ')\n\n' : '';
  }
});

function sanitizeName(name) {
  return String(name || '')
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function ensureHtmlName(name) {
  const clean = sanitizeName(name || '未命名文章').slice(0, 120) || '未命名文章';
  return clean.endsWith('.html') ? clean : clean + '.html';
}

function fetchText(url, timeout = 20000) {
  return new Promise(async (resolve, reject) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Cache-Control': 'no-cache',
        },
        redirect: 'follow',
        signal: controller.signal,
      });
      if (!res.ok) throw new Error('抓取失败：HTTP ' + res.status);
      const text = await res.text();
      if (Buffer.byteLength(text, 'utf8') > MAX_HTML_BYTES) throw new Error('网页过大，暂不支持收录');
      resolve({ text, finalUrl: res.url, contentType: res.headers.get('content-type') || '' });
    } catch (e) {
      reject(e);
    } finally {
      clearTimeout(timer);
    }
  });
}

function absolutizeUrl(base, target) {
  try { return new URL(target, base).toString(); } catch { return target; }
}

function htmlToMarkdown(html, baseUrl) {
  const $ = cheerio.load(String(html || ''));
  $('script,style,noscript,iframe,form,button,svg').remove();
  $('img').each((_, el) => {
    const $img = $(el);
    const src = $img.attr('src') || $img.attr('data-src') || $img.attr('data-original');
    if (src) $img.attr('src', absolutizeUrl(baseUrl, src));
  });
  $('a').each((_, el) => {
    const $a = $(el);
    const href = $a.attr('href');
    if (href) $a.attr('href', absolutizeUrl(baseUrl, href));
  });
  let out = '';
  try { out = turndown.turndown($.root().html() || ''); } catch { out = stripHtml($.root().text() || ''); }
  out = out.replace(/\n{3,}/g, '\n\n').trim();
  return out;
}

function decodeHtml(s) {
  return String(s || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripHtml(s) {
  return decodeHtml(String(s || '').replace(/<[^>]+>/g, ''));
}

function isWechatUrl(url) {
  try { return /(^|\.)mp\.weixin\.qq\.com$/i.test(new URL(url).hostname); } catch { return false; }
}

function contentScore(md) {
  const text = String(md || '').replace(/!\[[^\]]*\]\([^)]+\)/g, '').replace(/\[[^\]]*\]\([^)]+\)/g, '$1').trim();
  return text.length;
}

function extractWechat($, finalUrl) {
  const title = stripHtml($('#activity-name').text()) || stripHtml($('title').text()) || '未命名文章';
  const author = stripHtml($('#js_name').text()) || stripHtml($('[id*=js_name]').first().text());
  const publishedAt = stripHtml($('#publish_time').text()) || '';
  const node = $('#js_content').clone();
  if (!node.length) return null;
  node.find('script,style,.original_primary_card,.wx_profile_card_inner,.reward_area,.js_product_container,.qr_code_pc_outer,.mp_profile_iframe_wrp,.js_unread_area,.js_related_articles').remove();
  node.find('img').each((_, el) => {
    const $img = $(el);
    const src = $img.attr('data-src') || $img.attr('data-original') || $img.attr('src');
    if (src) $img.attr('src', absolutizeUrl(finalUrl, src));
  });
  const contentHtml = node.html() || '';
  return {
    title,
    author,
    publishedAt,
    siteName: '微信公众号',
    contentHtml,
    contentMarkdown: htmlToMarkdown(contentHtml, finalUrl),
  };
}

function extractGeneric(html, finalUrl) {
  const dom = new JSDOM(html, { url: finalUrl });
  const article = new Readability(dom.window.document).parse();
  const $ = cheerio.load(html);
  const title = sanitizeName(article && article.title) || stripHtml($('meta[property="og:title"]').attr('content')) || stripHtml($('title').text()) || '未命名文章';
  const siteName = stripHtml($('meta[property="og:site_name"]').attr('content')) || stripHtml($('meta[name="site_name"]').attr('content')) || '';
  const author = stripHtml($('meta[name="author"]').attr('content')) || stripHtml($('[rel="author"]').first().text()) || '';
  const publishedAt = stripHtml($('meta[property="article:published_time"]').attr('content')) || stripHtml($('time').first().attr('datetime')) || stripHtml($('time').first().text()) || '';
  const contentHtml = (article && article.content) || $('article').first().html() || $('.article').first().html() || $('.content').first().html() || $.root().html() || '';
  return {
    title,
    author,
    publishedAt,
    siteName,
    contentHtml,
    contentMarkdown: htmlToMarkdown(contentHtml, finalUrl),
  };
}

async function fetchRendered(url) {
  if (!playwright) return null;
  let browser;
  try {
    browser = await playwright.chromium.launch({ headless: true });
    const page = await browser.newPage({ userAgent: USER_AGENT, viewport: { width: 1440, height: 2200 } });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2500);
    const html = await page.content();
    const screenshot = await page.screenshot({ fullPage: true, type: 'png' });
    return { html, finalUrl: page.url(), screenshot };
  } catch {
    return null;
  } finally {
    try { if (browser) await browser.close(); } catch {}
  }
}

async function extractBest(url) {
  const fetched = await fetchText(url);
  const $ = cheerio.load(fetched.text);
  let meta = isWechatUrl(fetched.finalUrl) ? extractWechat($, fetched.finalUrl) : extractGeneric(fetched.text, fetched.finalUrl);
  let rendered = null;
  if (!meta || contentScore(meta.contentMarkdown) < 280) {
    rendered = await fetchRendered(fetched.finalUrl);
    if (rendered && rendered.html) {
      const $r = cheerio.load(rendered.html);
      const renderedMeta = isWechatUrl(rendered.finalUrl) ? extractWechat($r, rendered.finalUrl) : extractGeneric(rendered.html, rendered.finalUrl);
      if (renderedMeta && contentScore(renderedMeta.contentMarkdown) > contentScore(meta && meta.contentMarkdown)) {
        meta = renderedMeta;
      }
    }
  }
  if (!meta || !meta.contentMarkdown) throw new Error('未能提取正文内容');
  return {
    fetched,
    meta,
    rendered,
  };
}

function buildFrontMatter(meta) {
  const lines = [];
  if (meta.siteName) lines.push('> 来源：' + meta.siteName);
  if (meta.url) lines.push('> 原文链接：' + meta.url);
  if (meta.author) lines.push('> 作者：' + meta.author);
  if (meta.publishedAt) lines.push('> 发布时间：' + meta.publishedAt);
  lines.push('> 收录时间：' + new Date().toLocaleString('zh-CN', { hour12: false }));
  return lines.join('\n');
}

async function downloadBinary(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, 'Referer': url },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error('下载资源失败：HTTP ' + res.status);
  const buf = Buffer.from(await res.arrayBuffer());
  return { buf, contentType: res.headers.get('content-type') || '' };
}

function guessExtFromContentType(type) {
  if (/png/i.test(type)) return '.png';
  if (/jpe?g/i.test(type)) return '.jpg';
  if (/gif/i.test(type)) return '.gif';
  if (/webp/i.test(type)) return '.webp';
  if (/svg/i.test(type)) return '.svg';
  return '';
}

async function localizeImages(markdown, articleRelPath, baseUrl) {
  let md = String(markdown || '');
  const imageRe = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  const articleAssetDir = path.join(FUJIAN_DIR, ...String(articleRelPath || '').replace(/\\/g, '/').replace(/\.html$/i, '').split('/').filter(Boolean));
  fs.mkdirSync(articleAssetDir, { recursive: true });
  const seen = new Map();
  const matches = [...md.matchAll(imageRe)];
  for (const match of matches) {
    const alt = match[1] || '';
    const rawUrl = match[2] || '';
    const absUrl = absolutizeUrl(baseUrl, rawUrl);
    if (!/^https?:\/\//i.test(absUrl)) continue;
    let localUrl = seen.get(absUrl);
    if (!localUrl) {
      try {
        const { buf, contentType } = await downloadBinary(absUrl);
        const parsed = new URL(absUrl);
        let fileName = path.basename(parsed.pathname) || ('image_' + Date.now());
        fileName = sanitizeName(decodeURIComponent(fileName)).replace(/\s+/g, ' ');
        let ext = path.extname(fileName);
        if (!ext) ext = guessExtFromContentType(contentType);
        const stem = sanitizeName(fileName.replace(/\.[^.]+$/, '')) || ('image_' + Date.now());
        const finalName = stem + '_' + Date.now() + ext;
        const filePath = path.join(articleAssetDir, finalName);
        fs.writeFileSync(filePath, buf);
        localUrl = '/fujian/' + String(articleRelPath || '').replace(/\\/g, '/').replace(/\.html$/i, '').split('/').filter(Boolean).map(encodeURIComponent).join('/') + '/' + encodeURIComponent(finalName);
        seen.set(absUrl, localUrl);
      } catch {}
    }
    if (localUrl) md = md.replace(match[0], '![' + alt + '](' + localUrl + ')');
  }
  return md;
}

function snapshotDirForArticle(relPath) {
  return path.join(SNAPSHOTS_DIR, ...String(relPath || '').replace(/\\/g, '/').replace(/\.html$/i, '').split('/').filter(Boolean));
}

function uniqueArticleRel(dir, title) {
  const cleanName = ensureHtmlName(title);
  let rel = (dir ? dir.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '') + '/' : '') + cleanName;
  let full = path.join(ARTICLES_DIR, ...rel.split('/'));
  if (!fs.existsSync(full)) return rel;
  const stem = cleanName.replace(/\.html$/i, '');
  let i = 2;
  while (true) {
    rel = (dir ? dir.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '') + '/' : '') + stem + '_' + i + '.html';
    full = path.join(ARTICLES_DIR, ...rel.split('/'));
    if (!fs.existsSync(full)) return rel;
    i++;
  }
}

async function previewClip(url) {
  if (!url) throw new Error('缺少 URL');
  const { fetched, meta } = await extractBest(url);
  return {
    success: true,
    url: fetched.finalUrl,
    title: sanitizeName(meta.title) || '未命名文章',
    siteName: meta.siteName || '',
    author: meta.author || '',
    publishedAt: meta.publishedAt || '',
    markdown: meta.contentMarkdown,
    contentHtml: meta.contentHtml || '',
    contentType: fetched.contentType || '',
  };
}

async function saveClip({ url, dir = '' }) {
  const { fetched, meta, rendered } = await extractBest(url);
  const preview = {
    url: fetched.finalUrl,
    title: sanitizeName(meta.title) || '未命名文章',
    siteName: meta.siteName || '',
    author: meta.author || '',
    publishedAt: meta.publishedAt || '',
    markdown: meta.contentMarkdown,
    contentType: fetched.contentType || '',
  };
  const relPath = uniqueArticleRel(dir, preview.title);
  const localizedMd = await localizeImages(preview.markdown, relPath, preview.url);
  const markdown = '# ' + preview.title + '\n\n' + buildFrontMatter(preview) + '\n\n' + localizedMd.trim() + '\n\n\n\n';
  const bodyHtml = mdParse(markdown, { breaks: true, gfm: true });
  const fullPath = path.join(ARTICLES_DIR, ...relPath.split('/'));
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, buildHtml(preview.title, bodyHtml, markdown, '', relPath), 'utf8');

  const snapDir = snapshotDirForArticle(relPath);
  fs.mkdirSync(snapDir, { recursive: true });
  fs.writeFileSync(path.join(snapDir, 'source.html'), fetched.text, 'utf8');
  if (rendered && rendered.html) fs.writeFileSync(path.join(snapDir, 'rendered.html'), rendered.html, 'utf8');
  if (rendered && rendered.screenshot) fs.writeFileSync(path.join(snapDir, 'page.png'), rendered.screenshot);
  fs.writeFileSync(path.join(snapDir, 'meta.json'), JSON.stringify({
    url: preview.url,
    title: preview.title,
    siteName: preview.siteName || '',
    author: preview.author || '',
    publishedAt: preview.publishedAt || '',
    fetchedAt: new Date().toISOString(),
    contentType: preview.contentType || '',
    hash: crypto.createHash('sha1').update(fetched.text).digest('hex'),
    hasRenderedSnapshot: !!(rendered && rendered.html),
    hasScreenshot: !!(rendered && rendered.screenshot),
  }, null, 2), 'utf8');

  rebuildAllArticles();
  return {
    success: true,
    path: relPath,
    title: preview.title,
    snapshotDir: path.relative(path.resolve(__dirname, '..', '..'), snapDir).replace(/\\/g, '/'),
  };
}

module.exports = {
  previewClip,
  saveClip,
};
