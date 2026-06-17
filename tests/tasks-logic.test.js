const test = require('node:test');
const assert = require('node:assert/strict');

const {
  replaceMdLineTagAware,
  findLineIdx,
  hasTag,
} = require('../src/services/markdown-service');

test('replaceMdLineTagAware should toggle unchecked task to checked and preserve html tag', () => {
  const md = [
    '# 今日任务',
    '- [ ] 学英语 📅 2026-06-14 <!-- 每日任务 -->',
  ].join('\n');

  const raw = '- [x] 学英语 📅 2026-06-14';
  const out = replaceMdLineTagAware(md, raw);

  assert.ok(out);
  assert.match(out, /- \[x\] 学英语 📅 2026-06-14 <!-- 每日任务 -->/);
});

test('replaceMdLineTagAware should toggle checked task to unchecked and preserve html tag', () => {
  const md = [
    '# 今日任务',
    '- [x] 学英语 📅 2026-06-14 <!-- 每日任务 -->',
  ].join('\n');

  const raw = '- [ ] 学英语 📅 2026-06-14';
  const out = replaceMdLineTagAware(md, raw);

  assert.ok(out);
  assert.match(out, /- \[ \] 学英语 📅 2026-06-14 <!-- 每日任务 -->/);
});

test('replaceMdLineTagAware should work with %% tag style', () => {
  const md = [
    '# 提醒事项',
    '- [ ] 开会 📅 2026-06-14 ～09:00%%提醒事项%%',
  ].join('\n');

  const raw = '- [x] 开会 📅 2026-06-14 ～09:00%%提醒事项%%';
  const out = replaceMdLineTagAware(md, raw);

  assert.ok(out);
  assert.match(out, /- \[x\] 开会 📅 2026-06-14 ～09:00%%提醒事项%%/);
});

test('findLineIdx should match line while ignoring html comment tag', () => {
  const lines = [
    '- [ ] 普通任务',
    '- [x] 每日任务 📅 2026-06-14 <!-- 每日任务 -->',
  ];

  const idx = findLineIdx(lines, '- [x] 每日任务 📅 2026-06-14');
  assert.equal(idx, 1);
});

test('hasTag should detect html comment tag and %% tag', () => {
  assert.equal(hasTag('- [ ] a <!-- 每日任务 -->', '每日任务'), true);
  assert.equal(hasTag('- [ ] a %%提醒事项%%', '提醒事项'), true);
  assert.equal(hasTag('- [ ] a', '提醒事项'), false);
});
