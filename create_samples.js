const fs = require('fs');
const { marked } = require('marked');

const ARTICLES_DIR = __dirname + '/articles';

const TITLE = (title, content) => `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/github-markdown-css@5.8.1/github-markdown.min.css">
<style>
  body { margin:0; background:#fff; }
  .markdown-body { box-sizing: border-box; min-width: 200px; max-width: 860px; margin: 0 auto; padding: 45px; }
  @media (max-width:767px) { .markdown-body { padding: 15px; } }
</style>
</head>
<body>
<article class="markdown-body">${content}</article>
</body>
</html>`;

const articles = {
  '技术笔记': [
    { title: 'Node.js 异步编程入门', md: '# Node.js 异步编程入门\n\n## 回调函数\n\nNode.js 使用异步非阻塞 I/O 模型。\n\n```js\nfs.readFile("file.txt", (err, data) => {\n  if (err) throw err;\n  console.log(data.toString());\n});\n```\n\n## Promise\n\n```js\nconst readFile = util.promisify(fs.readFile);\nawait readFile("file.txt");\n```\n\n> 异步编程是 Node.js 的核心竞争力。' },
    { title: 'Docker 容器网络详解', md: '# Docker 容器网络\n\n## 网络模式\n\n- **bridge**: 默认，独立网络栈\n- **host**: 共享宿主机网络\n- **none**: 无网络\n\n## 常用命令\n\n```bash\ndocker network ls\ndocker network create mynet\ndocker run --network mynet nginx\n```' },
    { title: 'Linux 性能调优笔记', md: '# Linux 性能调优\n\n## CPU\n\n```bash\ntop -bn1 | head -20\nmpstat -P ALL 1 3\n```\n\n## 内存\n\n检查内存使用：\n\n```bash\nfree -h\nvmstat 1 5\n```' },
  ],
  '项目管理': [
    { title: '2026年Q2项目复盘', md: '# Q2 项目复盘\n\n## 完成情况\n\n- ✅ 福建日报批量下载 — 16,679篇\n- ✅ Hermes Web UI 部署\n- ✅ 模型切换工具\n\n## 待改进\n\n- 下载速度受限于微信 API 限流\n- 需优化任务调度策略' },
    { title: '团队周报模板', md: '# 团队周报\n\n**本周（2026-06-01 ~ 2026-06-07）**\n\n## 重点工作\n\n1. \n2. \n3. \n\n## 风险与问题\n\n- \n\n## 下周计划\n\n- ' },
  ],
};

Object.entries(articles).forEach(([dir, items]) => {
  const dirPath = ARTICLES_DIR + '/' + dir;
  fs.mkdirSync(dirPath, { recursive: true });
  items.forEach(item => {
    const html = marked.parse(item.md, { breaks: true, gfm: true });
    const fullHtml = TITLE(item.title, html);
    fs.writeFileSync(dirPath + '/' + item.title + '.html', fullHtml, 'utf-8');
    fs.writeFileSync(dirPath + '/' + item.title + '.md', item.md, 'utf-8');
  });
});
console.log('done');
