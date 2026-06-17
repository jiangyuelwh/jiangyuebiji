const fs = require('fs');
const path = require('path');

const { ARTICLES_DIR } = require('../config');
const { safePath } = require('../utils/path-utils');
const { saveSnapshot } = require('./history-service');
const {
  hasTag,
  mdParse,
  buildHtml,
  extractSourceMd,
  extractTitle,
  replaceMdLineTagAware,
  findLineIdx,
} = require('./markdown-service');
const { TODAY_CHROME } = require('./today-chrome');
const { REMINDER_CHROME } = require('./reminder-chrome');

function assertSafe(targetPath) {
  if (!safePath(targetPath, ARTICLES_DIR) && targetPath !== ARTICLES_DIR) {
    const err = new Error('非法路径');
    err.statusCode = 403;
    throw err;
  }
}

function scanTasks(filterFn) {
  const tasks = [];
  function walk(dir) {
    let entries;
    try { entries = fs.readdirSync(dir); } catch { return; }
    for (const entry of entries) {
      if (entry.startsWith('.')) continue;
      const full = path.join(dir, entry);
      let stat;
      try { stat = fs.statSync(full); } catch { continue; }
      if (stat.isDirectory()) { walk(full); continue; }
      if (!entry.endsWith('.html') && !entry.endsWith('.md')) continue;
      let content;
      try { content = fs.readFileSync(full, 'utf-8'); } catch { continue; }
      const text = entry.endsWith('.html') ? extractSourceMd(content) : content;
      for (const line of text.split('\n')) {
        if (!/^- \[( |x|X)\] /.test(line)) continue;
        if (!filterFn(line)) continue;
        const done = /\[[xX]\]/.test(line);
        const raw = line.trim();
        const dateMatch = raw.match(/📅 (\d{4}-\d{2}-\d{2})/);
        const timeMatch = raw.match(/～(\d{2}:\d{2})/);
        const cleanText = raw.replace(/^- \[( |x|X)\] /, '').replace(/<!--.*?-->/g, '').replace(/%%[^%]+%%/g, '').replace(/📅 \d{4}-\d{2}-\d{2}/, '').replace(/～\d{2}:\d{2}/, '').trim();
        tasks.push({ text: cleanText, due: dateMatch ? dateMatch[1] : null, time: timeMatch ? timeMatch[1] : null, file: path.relative(ARTICLES_DIR, full).replace(/\\/g, '/'), raw, done });
      }
    }
  }
  walk(ARTICLES_DIR);
  return tasks;
}

function getTodayTasks() { 
  const now = new Date();
  const df = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' });
  const parts = df.formatToParts(now);
  const dateStr = parts.find((p) => p.type === 'year').value + '-' + parts.find((p) => p.type === 'month').value + '-' + parts.find((p) => p.type === 'day').value;
  return scanTasks((line) => hasTag(line, '每日任务') && line.includes(dateStr));
}
function getOtherTasks() { return scanTasks((line) => !hasTag(line, '每日任务') && !hasTag(line, '提醒事项')); }
function getReminderTasks() { return scanTasks((line) => hasTag(line, '提醒事项')); }

function toggleTask({ file, raw }) {
  if (!file || !raw) { const err = new Error('缺少参数'); err.statusCode = 400; throw err; }
  const filePath = path.resolve(ARTICLES_DIR, file);
  assertSafe(filePath);
  if (!fs.existsSync(filePath)) { const err = new Error('文件不存在'); err.statusCode = 404; throw err; }
  if (file.endsWith('.html')) {
    const html = fs.readFileSync(filePath, 'utf-8');
    const mdText = extractSourceMd(html);
    const newMdText = replaceMdLineTagAware(mdText, raw);
    if (!newMdText) { const err = new Error('未找到对应任务行'); err.statusCode = 404; throw err; }
    const title = extractTitle(newMdText);
    const bodyHtml = mdParse(newMdText, { breaks: true, gfm: true });
    var chromeForTask = '';
    try { var _m = html.match(/<article class="markdown-body">([\s\S]*?)<h1>/); if (_m && (_m[1].includes('addTaskBtn') || _m[1].includes('addRemBtn') || _m[1].includes('addTaskModal') || _m[1].includes('addRemModal'))) chromeForTask = _m[1]; } catch(e){}
    if (!chromeForTask) {
      if (filePath.includes('今日任务')) chromeForTask = TODAY_CHROME;
      else if (filePath.includes('提醒事项')) chromeForTask = REMINDER_CHROME;
    }
    const newHtml = buildHtml(title, bodyHtml, newMdText, chromeForTask, path.relative(ARTICLES_DIR, filePath).replace(/\\/g, '/'));
    saveSnapshot(filePath);
    fs.writeFileSync(filePath, newHtml, 'utf-8');
    return { success: true };
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const oldRaw = /\[x\]/i.test(raw) ? raw.replace(/\[x\]/i, '[ ]') : raw.replace('[ ]', '[x]');
  const idx = findLineIdx(lines, oldRaw);
  if (idx === -1) { const err = new Error('未找到对应任务行'); err.statusCode = 404; throw err; }
  lines[idx] = raw;
  saveSnapshot(filePath);
  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
  return { success: true };
}



function getTaskTemplate() {
  const now = new Date();
  const df = new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" });
  const parts = df.formatToParts(now);
  const dateStr = parts.find((p) => p.type === "year").value + "-" + parts.find((p) => p.type === "month").value + "-" + parts.find((p) => p.type === "day").value;
  const templatePath = path.join(ARTICLES_DIR, "任务管理/每日任务模板.html");
  const items = [];
  if (fs.existsSync(templatePath)) {
    const html = fs.readFileSync(templatePath, "utf-8");
    const mdText = extractSourceMd(html);
    for (const raw of mdText.split("\n")) {
      const trimmed = raw.trim();
      const m = trimmed.match(/^- (.+)$/);
      if (m) items.push(m[1].trim());
    }
  }
  return { items: items, date: dateStr };
}

function generateTodayTasks() {
  const now = new Date();
  const df = new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" });
  const parts = df.formatToParts(now);
  const dateStr = parts.find((p) => p.type === "year").value + "-" + parts.find((p) => p.type === "month").value + "-" + parts.find((p) => p.type === "day").value;
  const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
  const weekday = weekdays[new Date(dateStr + 'T12:00:00+08:00').getDay()];
  const dailyPath = path.join(ARTICLES_DIR, "任务管理/今日任务.html");
  const templatePath = path.join(ARTICLES_DIR, "任务管理/每日任务模板.html");
  if (!fs.existsSync(dailyPath)) { const err = new Error("今日任务.html 不存在"); err.statusCode = 404; throw err; }
  if (!fs.existsSync(templatePath)) { const err = new Error("每日任务模板.html 不存在"); err.statusCode = 404; throw err; }
  const templateHtml = fs.readFileSync(templatePath, "utf-8");
  const templateMd = extractSourceMd(templateHtml);
  const items = [];
  for (const raw of templateMd.split("\n")) { var trimmed = raw.trim(); var mm = trimmed.match(/^- (.+)$/); if (mm) items.push(mm[1].trim()); }
  if (items.length === 0) { const err = new Error("模板中未找到任务项"); err.statusCode = 400; throw err; }
  const html = fs.readFileSync(dailyPath, "utf-8");
  let mdText = extractSourceMd(html);
  const hour = parseInt(new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',hour:'numeric',hour12:false}).format(now));
  const weather = hour < 6 ? "\uD83C\uDF19" : hour < 12 ? "\uD83C\uDF1E" : hour < 18 ? "\u26C5" : "\uD83C\uDF06";
  const newLines = items.map((item) => "- [ ] " + item + " \uD83D\uDCC5 " + dateStr + "%%\u6BCF\u65E5\u4EFB\u52A1%%");

  // 检查今日任务是否已存在，存在则追加，不存在则新增
  const todayPattern = new RegExp("^.*" + dateStr.replace(/-/g, "\\-") + ".*$", "m");
  const todayMatch = mdText.match(todayPattern);
  
  if (todayMatch && todayMatch[0].includes(dateStr)) {
    // 今日已存在：追加模板项到当天任务末尾
    const lines = mdText.split("\n");
    let insertIdx = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].includes(dateStr) && /^- \[.\] /.test(lines[i]) && lines[i].includes("%%\u6BCF\u65E5\u4EFB\u52A1%%")) {
        insertIdx = i + 1; break;
      }
    }
    if (insertIdx < 0) { mdText = mdText.trim() + "\n" + newLines.join("\n"); }
    else { lines.splice(insertIdx, 0, ...newLines); mdText = lines.join("\n"); }
  } else {
    // 今日不存在：新增完整区块
    const newSection = weather + " " + dateStr + " | " + weekday + "\n\u2728 \u4ECA\u65E5\u8BA1\u5212\n" + newLines.join("\n");
    const headingMatch = mdText.match(/^(# .+)$/m);
    if (headingMatch) {
      const idx = headingMatch.index + headingMatch[0].length;
      mdText = mdText.substring(0, idx) + "\n\n" + newSection + "\n\n---\n\n" + mdText.substring(idx).trim();
    } else {
      mdText = mdText.trim() + "\n\n" + newSection;
    }
  }
  const title = extractTitle(mdText);
  const bodyHtml = mdParse(mdText, { breaks: true, gfm: true });
  const newHtml = buildHtml(title, bodyHtml, mdText, TODAY_CHROME, path.relative(ARTICLES_DIR, dailyPath).replace(/\\/g, '/'));
  saveSnapshot(dailyPath);
  fs.writeFileSync(dailyPath, newHtml, "utf-8");
  return { success: true, count: newLines.length, date: dateStr };
}

function addTodayTaskItem({ content, date }) {
  if (!content || !date) { const err = new Error('缺少任务内容或日期'); err.statusCode = 400; throw err; }
  const dailyPath = path.join(ARTICLES_DIR, '任务管理/今日任务.html');
  if (!fs.existsSync(dailyPath)) { const err = new Error('今日任务.html 不存在'); err.statusCode = 404; throw err; }
  const html = fs.readFileSync(dailyPath, 'utf-8');
  let mdText = extractSourceMd(html);
  const line = '- [ ] ' + content + ' 📅 ' + date + '%%每日任务%%';
  // 插入到文件开头（跳过标题和按钮HTML，插到第一个任务行之前）
  const lines = mdText.split('\n');
  let insertIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^- \[/.test(lines[i]) && lines[i].includes(date) && lines[i].includes('%%每日任务%%')) { insertIdx = i; break; }
  }
  if (insertIdx < 0) {
    // 没找到当天任务行，找第一个任务行
    for (let i = 0; i < lines.length; i++) { if (/^- \[/.test(lines[i])) { insertIdx = i; break; } }
  }
  if (insertIdx < 0) mdText = mdText.trim() + '\n' + line;
  else { lines.splice(insertIdx, 0, line); mdText = lines.join('\n'); }
  const title = extractTitle(mdText);
  const bodyHtml = mdParse(mdText, { breaks: true, gfm: true });
  const newHtml = buildHtml(title, bodyHtml, mdText, TODAY_CHROME, path.relative(ARTICLES_DIR, dailyPath).replace(/\\/g, '/')); 
  saveSnapshot(dailyPath);
  fs.writeFileSync(dailyPath, newHtml, 'utf-8');
  return { line };
}

function addReminderItemsFromTemplate() {
  const remPath = path.join(ARTICLES_DIR, '任务管理/提醒事项.html');
  if (!fs.existsSync(remPath)) { const err = new Error('提醒事项.html 不存在'); err.statusCode = 404; throw err; }
  const html = fs.readFileSync(remPath, 'utf-8');
  let mdText = extractSourceMd(html);
  const lines = mdText.split('\n');
  const newItems = [];
  for (const line of lines) if (hasTag(line, '提醒事项')) newItems.push(line.replace(/\[[xX]\]/, '[ ]'));
  if (newItems.length === 0) { const err = new Error('模板中未找到提醒事项行'); err.statusCode = 400; throw err; }
  mdText += '\n' + newItems.join('\n');
  const title = extractTitle(mdText);
  const bodyHtml = mdParse(mdText, { breaks: true, gfm: true });
  const newHtml = buildHtml(title, bodyHtml, mdText, REMINDER_CHROME, path.relative(ARTICLES_DIR, remPath).replace(/\\/g, '/'));
  saveSnapshot(remPath);
  fs.writeFileSync(remPath, newHtml, 'utf-8');
  return { count: newItems.length };
}

function addReminderItem({ content, date, time }) {
  if (!content || !date) { const err = new Error('缺少提醒内容或日期'); err.statusCode = 400; throw err; }
  const remPath = path.join(ARTICLES_DIR, '任务管理/提醒事项.html');
  if (!fs.existsSync(remPath)) { const err = new Error('提醒事项.html 不存在'); err.statusCode = 404; throw err; }
  const html = fs.readFileSync(remPath, 'utf-8');
  const mdText = extractSourceMd(html);
  const line = '- [ ] ' + content + ' 📅 ' + date + (time ? ' ～' + time : '') + '%%提醒事项%%';
  const itemIdx = mdText.indexOf('\n- [');
  let newMdText;
  if (itemIdx >= 0) newMdText = mdText.substring(0, itemIdx).trim() + '\n' + line + '\n' + mdText.substring(itemIdx).trim();
  else {
    const scriptIdx = mdText.indexOf('<script>');
    if (scriptIdx >= 0) newMdText = mdText.substring(0, scriptIdx).trim() + '\n\n' + line + '\n\n' + mdText.substring(scriptIdx);
    else newMdText = mdText.trim() + '\n\n' + line;
  }
  const title = extractTitle(newMdText);
  const bodyHtml = mdParse(newMdText, { breaks: true, gfm: true });
  const newHtml = buildHtml(title, bodyHtml, newMdText, REMINDER_CHROME, path.relative(ARTICLES_DIR, remPath).replace(/\\/g, '/'));
  saveSnapshot(remPath);
  fs.writeFileSync(remPath, newHtml, 'utf-8');
  return { line };
}

function ensureTodayPage() {
  const dailyPath = path.join(ARTICLES_DIR, '任务管理/今日任务.html');
  if (!fs.existsSync(dailyPath)) {
    fs.mkdirSync(path.dirname(dailyPath), { recursive: true });
    const mdText = '# 今日任务\n\n';
    const bodyHtml = mdParse(mdText, { breaks: true, gfm: true });
    const newHtml = buildHtml('今日任务', bodyHtml, mdText, TODAY_CHROME, '任务管理/今日任务.html');
    fs.writeFileSync(dailyPath, newHtml, 'utf-8');
  }
  return { success: true, path: '任务管理/今日任务.html' };
}

function ensureReminderPage() {
  const remPath = path.join(ARTICLES_DIR, '任务管理/提醒事项.html');
  if (!fs.existsSync(remPath)) {
    fs.mkdirSync(path.dirname(remPath), { recursive: true });
    const mdText = '# 提醒事项\n\n';
    const bodyHtml = mdParse(mdText, { breaks: true, gfm: true });
    const newHtml = buildHtml('提醒事项', bodyHtml, mdText, REMINDER_CHROME, '任务管理/提醒事项.html');
    fs.writeFileSync(remPath, newHtml, 'utf-8');
  }
  return { success: true, path: '任务管理/提醒事项.html' };
}

module.exports = {
  scanTasks,
  getTodayTasks,
  getOtherTasks,
  getReminderTasks,
  toggleTask,
  getTaskTemplate,
  generateTodayTasks,
  addTodayTaskItem,
  addReminderItemsFromTemplate,
  addReminderItem,
  ensureTodayPage,
  ensureReminderPage,
};
