const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const {
  safePath,
  resolveArticlePath,
} = require('../src/utils/path-utils');

const { ARTICLES_DIR } = require('../src/config');

test('safePath should allow path inside articles dir', () => {
  const target = path.join(ARTICLES_DIR, 'foo', 'bar.html');
  assert.equal(safePath(target, ARTICLES_DIR), true);
});

test('safePath should reject path outside articles dir', () => {
  const target = path.resolve(ARTICLES_DIR, '..', 'outside.txt');
  assert.equal(safePath(target, ARTICLES_DIR), false);
});

test('resolveArticlePath should resolve relative article path', () => {
  const target = resolveArticlePath('任务管理/今日任务.html');
  assert.equal(target.startsWith(ARTICLES_DIR), true);
});
