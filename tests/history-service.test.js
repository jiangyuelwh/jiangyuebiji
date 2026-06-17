const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { saveSnapshot, listHistory } = require('../src/services/history-service');
const { ARTICLES_DIR, HISTORY_DIR } = require('../src/config');

test('saveSnapshot should create a history file that listHistory can find', () => {
  const testDir = path.join(ARTICLES_DIR, '__test_history__');
  const testFile = path.join(testDir, 'sample.html');

  fs.mkdirSync(testDir, { recursive: true });
  fs.writeFileSync(testFile, '<html><title>x</title></html>', 'utf-8');

  saveSnapshot(testFile);

  const relPath = path.relative(ARTICLES_DIR, testFile);
  const versions = listHistory(relPath);

  assert.ok(Array.isArray(versions));
  assert.ok(versions.length >= 1);
  assert.match(versions[0].file, /sample\.html\./);

  try {
    fs.rmSync(testDir, { recursive: true, force: true });
    fs.rmSync(path.join(HISTORY_DIR, '__test_history__'), { recursive: true, force: true });
  } catch {}
});
