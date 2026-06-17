# liruibiji

个人知识库文件管理器 / 三栏 Markdown 笔记编辑器。  
核心模式是：

- **`.html` 作为唯一持久化格式**
- **Markdown 源码嵌入 HTML 注释**
- **编辑时读 Markdown，保存时重新渲染 HTML**

---

## 功能概览

- 三栏文件管理 + Markdown 编辑 + 预览
- 目录树 / 文件列表 / 新建 / 重命名 / 移动 / 删除 / 上传
- CodeMirror 6 编辑器
- 自动保存、最近打开、暗色模式
- 标签系统
- `[[文件名]]` 内部链接
- 今日任务 / 提醒事项 / 其他待办
- 历史快照与恢复

---

## 快速开始

### 环境要求

- Node.js `>= 18`
- npm

### 安装

```bash
npm install
```

### 启动

```bash
npm start
```

默认端口：

- `8765`

打开：

- [http://127.0.0.1:8765](http://127.0.0.1:8765)

### 运行测试

```bash
npm test
```

---

## 当前项目结构

```text
liruibiji/
├─ server.js
├─ package.json
├─ README.md
├─ src/
│  ├─ app.js
│  ├─ config.js
│  ├─ routes/
│  │  ├─ files.js
│  │  ├─ history.js
│  │  ├─ search.js
│  │  ├─ tags.js
│  │  └─ tasks.js
│  ├─ services/
│  │  ├─ cache-service.js
│  │  ├─ history-service.js
│  │  └─ markdown-service.js
│  └─ utils/
│     └─ path-utils.js
├─ templates/
│  └─ index.html
├─ static/
├─ articles/
├─ tests/
└─ docs/
```

---

## 核心设计

### 1. HTML 是唯一存储格式

系统不以 `.md` 文件作为主要持久化载体。  
所有文章最终都保存为 `.html`。

### 2. Markdown 源嵌在 HTML 末尾

每个文件末尾包含：

```html
<!--source-md
# 标题

Markdown 内容
/source-md-->
```

这样可以同时满足：

- 浏览器直接展示 HTML
- 编辑器继续读写 Markdown

### 3. 保存流程

```text
Markdown -> marked 渲染 -> buildHtml -> 写入 .html
```

### 4. 历史快照

写入前会将旧版本保存到：

- `.history/`

---

## 主要目录说明

### `articles/`

数据目录。  
**这是最重要、最需要备份的目录。**

### `templates/`

前端页面模板。

### `static/`

本地静态资源。

### `src/`

当前后端代码目录，已完成首轮模块化拆分。

### `tests/`

自动化测试。

### `docs/`

项目文档。

---

## 文档索引

- [架构说明](./docs/architecture.md)
- [接口文档](./docs/api.md)
- [测试说明](./docs/testing.md)

---

## 当前已完成的工程化改造

- `server.js` 启动壳拆分
- `src/app.js` 装配 Express
- files / tasks / history / tags / search 路由拆分
- markdown / history / cache / path 模块拆分
- 历史快照链路修复
- 自动化测试建立

---

## 当前测试覆盖

已覆盖：

- Markdown / HTML 协议
- 路径安全
- 历史快照
- 任务文本逻辑
- 文件主链路接口
- 任务添加 / 勾选切换接口

运行：

```bash
npm test
```

---

## 迁移与备份

如果迁移到新机器，优先备份：

```text
articles/
.history/   （可选，但建议保留）
```

其中：

- `articles/` = 核心数据
- `.history/` = 历史版本

---

## License

ISC
