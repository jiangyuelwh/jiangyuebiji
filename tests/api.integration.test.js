const test = require('node:test');
const assert = require('node:assert/strict');
const { before, after } = require('node:test');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const {
  extractSourceMd,
  extractTitle,
  mdParse,
  buildHtml,
} = require('../src/services/markdown-service');
const { ARTICLES_DIR } = require('../src/config');
const { TODAY_CHROME } = require('../src/services/today-chrome');
const { REMINDER_CHROME } = require('../src/services/reminder-chrome');

const PORT = 8876;
const BASE = `http://127.0.0.1:${PORT}`;
function todayCN(){const df=new Intl.DateTimeFormat("zh-CN",{timeZone:"Asia/Shanghai",year:"numeric",month:"2-digit",day:"2-digit"});const p=df.formatToParts(new Date());return p.find(x=>x.type==="year").value+"-"+p.find(x=>x.type==="month").value+"-"+p.find(x=>x.type==="day").value}

let serverProc;
let createdPath = null;
let renamedPath = null;
let movedPath = null;
let addedTodayRaw = null;
let addedReminderRaw = null;
let createdDirs = [];
let uploadedPath = null;

function cleanupTaskLines(filePath, patterns) {
  if (!fs.existsSync(filePath)) return;
  const html = fs.readFileSync(filePath, 'utf-8');
  let md = extractSourceMd(html);
  md = md
    .split('\n')
    .filter((line) => !patterns.some((p) => p.test(line)))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');

  const title = extractTitle(md);
  const bodyHtml = mdParse(md, { breaks: true, gfm: true });
  // Preserve chrome from existing file
  var _ch = '';
  try { var _cm = html.match(/<article class="markdown-body">([\s\S]*?)<h1>/); if (_cm && (_cm[1].includes('addTaskBtn') || _cm[1].includes('addRemBtn') || _cm[1].includes('addTaskModal') || _cm[1].includes('addRemModal'))) _ch = _cm[1]; } catch(e){}
  const newHtml = buildHtml(title, bodyHtml, md, _ch);
  fs.writeFileSync(filePath, newHtml, 'utf-8');
}

async function waitForServer(url, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('server did not start in time');
}

before(async () => {
  serverProc = spawn(process.execPath, ['server.js', String(PORT)], {
    cwd: 'D:\\liruibiji',
    stdio: 'ignore',
    windowsHide: true,
  });
  await waitForServer(`${BASE}/api/list`);
});

after(async () => {
  const cleanupPaths = [movedPath, renamedPath, createdPath, uploadedPath].filter(Boolean);
  for (const cleanupPath of cleanupPaths) {
    try {
      await fetch(`${BASE}/api/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: cleanupPath, isDir: false }),
      });
    } catch {}
  }
  for (const dirPath of createdDirs) {
    try {
      await fetch(`${BASE}/api/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: dirPath, isDir: true }),
      });
    } catch {}
  }
  if (serverProc && !serverProc.killed) {
    serverProc.kill();
  }

  cleanupTaskLines(
    path.join(ARTICLES_DIR, '任务管理', '今日任务.html'),
    [/集成测试今日任务_/]
  );

  cleanupTaskLines(
    path.join(ARTICLES_DIR, '任务管理', '提醒事项.html'),
    [/集成测试提醒_/]
  );

  // Force chrome re-injection (belt-and-suspenders)
  [
    [ path.join(ARTICLES_DIR, '任务管理', '今日任务.html'), TODAY_CHROME ],
    [ path.join(ARTICLES_DIR, '任务管理', '提醒事项.html'), REMINDER_CHROME ]
  ].forEach(function(item) {
    try {
      var p = item[0], chrome = item[1];
      var c = fs.readFileSync(p, 'utf-8');
      if (!c.includes('addTaskBtn') && !c.includes('addRemBtn') && !c.includes('addTaskModal') && !c.includes('addRemModal')) {
        var m = extractSourceMd(c);
        var h = buildHtml(extractTitle(m), mdParse(m, { breaks: true, gfm: true }), m, chrome);
        fs.writeFileSync(p, h, 'utf-8');
      }
    } catch(e) {}
  });
});

test('GET /api/list should return files array', async () => {
  const res = await fetch(`${BASE}/api/list`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(Array.isArray(data.files));
});

test('POST /api/create-file then GET /api/read should work', async () => {
  const name = `__api_test_${Date.now()}.html`;
  const createRes = await fetch(`${BASE}/api/create-file`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, dir: '' }),
  });

  assert.equal(createRes.status, 200);
  const created = await createRes.json();
  assert.equal(created.success, true);
  createdPath = created.path;
  assert.ok(createdPath.endsWith('.html'));

  const readRes = await fetch(`${BASE}/api/read?path=${encodeURIComponent(createdPath)}`);
  assert.equal(readRes.status, 200);
  const readData = await readRes.json();
  assert.equal(readData.success, true);
  assert.match(readData.markdown, /# /);
});

test('POST /api/save should update markdown and title', async () => {
  assert.ok(createdPath, 'createdPath should exist from previous test');

  const markdown = '# API 集成测试标题\n\n这是正文内容。';
  const saveRes = await fetch(`${BASE}/api/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: createdPath, markdown }),
  });

  assert.equal(saveRes.status, 200);
  const saveData = await saveRes.json();
  assert.equal(saveData.success, true);
  assert.equal(saveData.title, 'API 集成测试标题');

  const readRes = await fetch(`${BASE}/api/read?path=${encodeURIComponent(createdPath)}`);
  const readData = await readRes.json();
  assert.equal(readData.title, 'API 集成测试标题');
  assert.equal(readData.markdown, markdown);
});

test('GET /api/history should return at least one version after save', async () => {
  assert.ok(createdPath, 'createdPath should exist from previous test');

  const histRes = await fetch(`${BASE}/api/history?path=${encodeURIComponent(createdPath)}`);
  assert.equal(histRes.status, 200);
  const histData = await histRes.json();
  assert.equal(histData.success, true);
  assert.ok(Array.isArray(histData.versions));
  assert.ok(histData.versions.length >= 1);
});

test('POST /api/history/restore should restore previous saved content', async () => {
  assert.ok(createdPath, 'createdPath should exist from previous test');

  const originalMarkdown = '# API 集成测试标题\n\n这是正文内容。';
  const updatedMarkdown = '# API 第二版标题\n\n这是第二版内容。';

  const saveRes = await fetch(`${BASE}/api/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: createdPath, markdown: updatedMarkdown }),
  });
  assert.equal(saveRes.status, 200);

  const histRes = await fetch(`${BASE}/api/history?path=${encodeURIComponent(createdPath)}`);
  assert.equal(histRes.status, 200);
  const histData = await histRes.json();
  assert.equal(histData.success, true);
  assert.ok(histData.versions.length >= 1);

  const version = histData.versions[0].file.split('.').slice(2).join('.');
  const restoreRes = await fetch(`${BASE}/api/history/restore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: createdPath, version }),
  });
  assert.equal(restoreRes.status, 200);
  const restoreData = await restoreRes.json();
  assert.equal(restoreData.success, true);

  const readRes = await fetch(`${BASE}/api/read?path=${encodeURIComponent(createdPath)}`);
  assert.equal(readRes.status, 200);
  const readData = await readRes.json();
  assert.equal(readData.markdown, originalMarkdown);
  assert.equal(readData.title, 'API 集成测试标题');
});

test('POST /api/rename should rename created file', async () => {
  assert.ok(createdPath, 'createdPath should exist from previous test');

  const newName = `__api_test_renamed_${Date.now()}.html`;
  const renameRes = await fetch(`${BASE}/api/rename`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: createdPath, newName }),
  });

  assert.equal(renameRes.status, 200);
  const renameData = await renameRes.json();
  assert.equal(renameData.success, true);

  renamedPath = newName;

  const readRes = await fetch(`${BASE}/api/read?path=${encodeURIComponent(renamedPath)}`);
  assert.equal(readRes.status, 200);
  const readData = await readRes.json();
  assert.equal(readData.success, true);
  assert.equal(readData.title, 'API 集成测试标题');
});

test('POST /api/create-dir and /api/move should move renamed file into new dir', async () => {
  assert.ok(renamedPath, 'renamedPath should exist from previous test');

  const dirName = `__api_dir_${Date.now()}`;
  const createDirRes = await fetch(`${BASE}/api/create-dir`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: dirName, dir: '' }),
  });
  assert.equal(createDirRes.status, 200);
  const createDirData = await createDirRes.json();
  assert.equal(createDirData.success, true);
  createdDirs.push(dirName);

  const moveRes = await fetch(`${BASE}/api/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: renamedPath, targetDir: dirName }),
  });
  assert.equal(moveRes.status, 200);
  const moveData = await moveRes.json();
  assert.equal(moveData.success, true);

  movedPath = `${dirName}/${renamedPath}`;

  const readRes = await fetch(`${BASE}/api/read?path=${encodeURIComponent(movedPath)}`);
  assert.equal(readRes.status, 200);
  const readData = await readRes.json();
  assert.equal(readData.success, true);
  assert.equal(readData.title, 'API 集成测试标题');
});

test('POST /api/delete should delete moved file', async () => {
  assert.ok(movedPath, 'movedPath should exist from previous test');

  const delRes = await fetch(`${BASE}/api/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: movedPath, isDir: false }),
  });
  assert.equal(delRes.status, 200);
  const delData = await delRes.json();
  assert.equal(delData.success, true);

  const readRes = await fetch(`${BASE}/api/read?path=${encodeURIComponent(movedPath)}`);
  assert.equal(readRes.status, 404);

  movedPath = null;
});

test('POST /api/tasks/today/add-item should add a today task', async () => {
  const body = {
    content: `集成测试今日任务_${Date.now()}`,
    date: todayCN(),
  };

  const res = await fetch(`${BASE}/api/tasks/today/add-item`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.match(data.line, /%%每日任务%%/);
  addedTodayRaw = data.line;

  const listRes = await fetch(`${BASE}/api/tasks/today`);
  assert.equal(listRes.status, 200);
  const listData = await listRes.json();
  assert.equal(listData.success, true);
  assert.ok(listData.tasks.some((t) => t.raw === addedTodayRaw));
});

test('POST /api/tasks/today/save should toggle added today task', async () => {
  assert.ok(addedTodayRaw, 'addedTodayRaw should exist from previous test');

  const toggledRaw = addedTodayRaw.replace('- [ ]', '- [x]');
  const res = await fetch(`${BASE}/api/tasks/today/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      file: '任务管理/今日任务.html',
      raw: toggledRaw,
    }),
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);

  const listRes = await fetch(`${BASE}/api/tasks/today`);
  const listData = await listRes.json();
  const task = listData.tasks.find((t) => t.raw === toggledRaw);
  assert.ok(task);
  assert.equal(task.done, true);
});

test('POST /api/tasks/reminders/add-item should add a reminder', async () => {
  const body = {
    content: `集成测试提醒_${Date.now()}`,
    date: '2026-06-14',
    time: '22:30',
  };

  const res = await fetch(`${BASE}/api/tasks/reminders/add-item`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.match(data.line, /%%提醒事项%%/);
  addedReminderRaw = data.line;

  const listRes = await fetch(`${BASE}/api/tasks/reminders`);
  const listData = await listRes.json();
  assert.equal(listData.success, true);
  assert.ok(listData.tasks.some((t) => t.raw === addedReminderRaw));
});

test('POST /api/tasks/reminders/save should toggle added reminder task', async () => {
  assert.ok(addedReminderRaw, 'addedReminderRaw should exist from previous test');

  const toggledRaw = addedReminderRaw.replace('- [ ]', '- [x]');
  const res = await fetch(`${BASE}/api/tasks/reminders/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      file: '任务管理/提醒事项.html',
      raw: toggledRaw,
    }),
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);

  const listRes = await fetch(`${BASE}/api/tasks/reminders`);
  const listData = await listRes.json();
  const task = listData.tasks.find((t) => t.raw === toggledRaw);
  assert.ok(task);
  assert.equal(task.done, true);
});

test('POST /api/upload should upload markdown as html and GET /api/read should read it', async () => {
  const name = `__upload_test_${Date.now()}.md`;
  const markdown = '# 上传测试标题\n\n上传正文';

  const res = await fetch(`${BASE}/api/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dir: '',
      files: [{ name, content: markdown }],
    }),
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);

  uploadedPath = name.replace(/\.md$/i, '.html');
  const readRes = await fetch(`${BASE}/api/read?path=${encodeURIComponent(uploadedPath)}`);
  assert.equal(readRes.status, 200);
  const readData = await readRes.json();
  assert.equal(readData.success, true);
  assert.equal(readData.title, '上传测试标题');
  assert.equal(readData.markdown, markdown);
});

test('GET /api/render-md should render uploaded markdown html file content', async () => {
  assert.ok(uploadedPath, 'uploadedPath should exist from previous test');

  const res = await fetch(`${BASE}/api/render-md?path=${encodeURIComponent(uploadedPath)}`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.match(data.html, /上传测试标题/);
});

test('GET /api/search should find uploaded file by name', async () => {
  assert.ok(uploadedPath, 'uploadedPath should exist from previous test');

  const keyword = uploadedPath.replace(/\.html$/i, '');
  const res = await fetch(`${BASE}/api/search?q=${encodeURIComponent(keyword)}`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.files.some((f) => f.path === uploadedPath));
});

test('GET /api/tags should return success shape', async () => {
  const res = await fetch(`${BASE}/api/tags`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(Array.isArray(data.tags));
});
