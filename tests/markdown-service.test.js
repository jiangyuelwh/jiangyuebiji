const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildHtml,
  extractSourceMd,
  ensureSourceMd,
  extractTitle,
} = require('../src/services/markdown-service');

test('extractSourceMd should extract markdown from standard source-md block', () => {
  const html = `<!doctype html>
<html><body><article>x</article></body></html>
<!--source-md
# 标题

内容
/source-md-->`;

  const md = extractSourceMd(html);
  assert.equal(md, '# 标题\n\n内容');
});

test('buildHtml should keep source markdown at file end', () => {
  const md = '# 我的标题\n\n正文';
  const html = buildHtml('我的标题', '<h1>我的标题</h1><p>正文</p>', md);

  assert.match(html, /<!--source-md/);
  assert.match(html, /# 我的标题/);
  assert.match(html, /\/source-md-->/);
});

test('ensureSourceMd should inject source-md for plain html', () => {
  const html = `<!doctype html>
<html>
<head><title>测试页面</title></head>
<body><article><h1>测试页面</h1><p>hello</p></article></body>
</html>`;

  const out = ensureSourceMd(html);
  const md = extractSourceMd(out);

  assert.match(out, /<!--source-md/);
  assert.match(md, /# 测试页面/);
});

test('extractTitle should return first h1 title', () => {
  const md = 'abc\n# 一级标题\n\n内容';
  assert.equal(extractTitle(md), '一级标题');
});
