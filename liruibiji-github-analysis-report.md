# Liruibiji 项目 GitHub 竞品分析报告

> 生成时间：2026-06-13
> 目标：寻找可吸收经验的开源项目，为 liruibiji 查缺补漏

---

## 一、Liruibiji 核心需求回顾

根据历史对话梳理，liruibiji 的核心需求为：

| 维度 | 要求 |
|------|------|
| **存储方式** | 纯文件驱动（Markdown），零数据库 |
| **管理方式** | 前端操作，无独立后台管理面板 |
| **目录结构** | 支持 5 级目录层级 |
| **核心功能** | 笔记 CRUD、搜索、置顶、任务提醒 |
| **个人主页** | 面向个人的知识管理与任务展示 |
| **技术偏好** | 前端编辑（Monaco Editor / Tiptap），后端轻量 |

---

## 二、候选项目全景对比

### 第一梯队：高度匹配（文件驱动 + Markdown + 前端编辑）

#### 1. OtterWiki ⭐1442
- **仓库**: [redimp/otterwiki](https://github.com/redimp/otterwiki)
- **技术栈**: Python (Flask) + Markdown + Git
- **核心特性**:
  - ✅ 纯文件存储（Git 仓库即数据源）
  - ✅ CodeMirror 编辑器（Markdown 高亮、表格支持）
  - ✅ 深色模式
  - ✅ 用户认证
  - ✅ 页面附件
  - ✅ 完整变更日志和历史版本
  - ✅ 侧边栏自定义（菜单 + 页面索引）
  - ✅ 扩展 Markdown（脚注、代码块、Mermaid 图表）
  - ✅ Docker 一键部署
  - ⚠️ 实验性功能：Git HTTP 服务器（clone/pull/push）
- **可吸收经验**:
  - **Git 作为版本控制层**——无需自建数据库，利用 Git 天然实现历史追踪和回滚
  - **CodeMirror 编辑器集成**——轻量但功能完备的 Markdown 编辑体验
  - **极简架构**——Flask 微框架足够支撑 wiki 类应用

#### 2. MarkItUp PKM ⭐193
- **仓库**: [xclusive36/MarkItUp](https://github.com/xclusive36/MarkItUp)
- **技术栈**: Next.js (TypeScript) + TipTap
- **核心特性**:
  - ✅ WYSIWYG 编辑器（TipTap）
  - ✅ 双向链接（[[wikilinks]] + 反向链接）
  - ✅ 知识图谱可视化（3D 力导向图）
  - ✅ 全文搜索 + 语义搜索（Transformers.js 浏览器端嵌入）
  - ✅ 智能标签系统
  - ✅ AI 集成（OpenAI / Anthropic / Gemini / Ollama）
  - ✅ 间隔重复记忆（FSRS 算法）
  - ✅ 多用户认证
  - ✅ 实时协作（WebSocket + Socket.IO）
  - ✅ 插件系统
  - ✅ LaTeX 数学公式 + TikZ 图表
- **可吸收经验**:
  - **语义搜索浏览器化**——用 Transformers.js 在客户端做向量搜索，零服务端成本
  - **知识图谱可视化**——3D 力导向图展示笔记关联
  - **AI 辅助写作**——智能链接建议、上下文感知聊天、写作助手
  - **TipTap WYSIWYG**——比纯 Markdown 编辑器更友好的写作体验
  - **间隔重复系统**——将笔记转化为闪卡，科学记忆

#### 3. MarkdownManager ⭐13
- **仓库**: [Henkster72/MarkdownManager](https://github.com/Henkster72/MarkdownManager)
- **技术栈**: PHP（纯静态，零数据库）
- **核心特性**:
  - ✅ 纯文件存储，零数据库
  - ✅ 即时 Live Preview
  - ✅ 发布状态管理（CMS 工作流）
  - ✅ TOC 侧边栏
  - ✅ 导出 HTML
  - ✅ 无构建链，PHP 主机即可运行
- **可吸收经验**:
  - **发布状态机制**——草稿/已发布/归档状态管理
  - **元数据字段**——作者、副标题等 frontmatter 管理
  - **极简部署**——纯 PHP 零依赖，任何虚拟主机可用

### 第二梯队：部分匹配（有亮点但非纯文件驱动）

#### 4. MrDoc（觅思文档）⭐3220
- **仓库**: [zmister2016/MrDoc](https://github.com/zmister2016/MrDoc)
- **技术栈**: Python (Django) + SQLite
- **核心特性**:
  - ✅ 文集 + 文档两级管理
  - ✅ 多种编辑器（Editor.md / Vditor / iceEditor）
  - ✅ 多端支持（Web / 桌面 / 移动端 / 浏览器扩展）
  - ✅ 文集权限控制
  - ✅ PDF / EPUB 导出
  - ✅ 全文搜索
  - ✅ AI 写作辅助
  - ✅ Obsidian 同步插件
  - ⚠️ 依赖 SQLite 数据库
- **可吸收经验**:
  - **文集概念**——文档按"文集"分组，比扁平目录更合理
  - **多编辑器可选**——Editor.md（Markdown）、Vditor（现代）、iceEditor（富文本）
  - **多端生态**——浏览器扩展速记 + 桌面客户端 + 移动 APP
  - **文档模板**——预设模板快速创建文档
  - **Token API**——通过 API 批量操作文档

#### 5. Raneto ⭐2890
- **仓库**: [ryanlelek/Raneto](https://github.com/ryanlelek/Raneto)
- **技术栈**: Node.js + Markdown
- **核心特性**:
  - ✅ 纯文件存储（Markdown 文件）
  - ✅ 文件名和内容搜索
  - ✅ 浏览器内 Markdown 编辑器
  - ✅ 登录保护
  - ✅ 轻量简洁
  - ⚠️ 偏知识库/文档站，非个人笔记
- **可吸收经验**:
  - **极简架构**——Node.js + Express 即可跑起来
  - **环境变量配置**——无配置文件，全部通过环境变量控制
  - **登录保护**——基础认证防止未授权编辑

#### 6. Wiki.js ⭐28439
- **仓库**: [requarks/wiki](https://github.com/requarks/wiki)
- **技术栈**: Node.js (Vue) + PostgreSQL/MySQL/SQLite
- **核心特性**:
  - ✅ 强大的 Markdown 编辑
  - ✅ Git 同步
  - ✅ 多语言
  - ✅ 主题系统
  - ✅ 用户权限
  - ⚠️ 依赖数据库
- **可吸收经验**:
  - **Git 同步机制**——编辑保存后自动提交到 Git
  - **主题系统**——前端皮肤可定制

#### 7. TriliumNext Notes ⭐2920
- **仓库**: [TriliumNext/Notes](https://github.com/TriliumNext/Notes)
- **技术栈**: TypeScript (Electron) + SQLite
- **核心特性**:
  - ✅ 知识图谱
  - ✅ 笔记间链接
  - ✅ 本地优先
  - ✅ 丰富的笔记类型
  - ⚠️ 依赖 SQLite
- **可吸收经验**:
  - **笔记关系图谱**——可视化展示笔记间的链接关系

### 第三梯队：任务管理方向

#### 8. nt (navbytes) ⭐4
- **仓库**: [navbytes/nt](https://github.com/navbytes/nt)
- **技术栈**: Go（单二进制，零依赖）
- **核心特性**:
  - ✅ todo.txt 格式任务管理
  - ✅ Markdown 笔记
  - ✅ CLI + TUI + Web App 三合一
  - ✅ AI Agent 友好（结构化纯文本）
  - ✅ 无数据库
- **可吸收经验**:
  - **CLI + TUI + Web 三界面**——同一数据源，不同交互方式
  - **AI Agent 友好设计**——纯文本存储，AI 可直接读写

---

## 三、关键发现与可吸收经验

### 1. 存储方案

| 方案 | 代表项目 | 优势 | 劣势 |
|------|---------|------|------|
| **纯文件（Markdown）** | OtterWiki, Raneto, MarkdownManager | 零依赖、便携、Git 友好 | 搜索能力弱 |
| **文件 + Git 版本** | OtterWiki | 天然版本控制 | 需处理 Git 冲突 |
| **文件 + SQLite** | MrDoc, TriliumNext | 搜索强、关系丰富 | 有数据库依赖 |

**建议**：采用 **纯文件（Markdown）+ Git 版本控制** 方案，完全满足 liruibiji 需求。

### 2. 编辑器方案

| 方案 | 代表项目 | 特点 |
|------|---------|------|
| **CodeMirror** | OtterWiki | 轻量、Markdown 高亮、表格 |
| **TipTap (WYSIWYG)** | MarkItUp | 所见即所得、更友好 |
| **Editor.md** | MrDoc | 经典 Markdown 编辑器 |
| **Vditor** | MrDoc | 现代、TypeScript 原生 |

**建议**：考虑 **TipTap**（所见即所得）或 **Vditor**（Markdown 增强）作为编辑器。

### 3. 搜索方案

| 方案 | 代表项目 | 特点 |
|------|---------|------|
| **全文搜索（后端）** | Raneto, MrDoc | 简单可靠 |
| **语义搜索（浏览器端）** | MarkItUp | Transformers.js，零成本 |
| **全文搜索（前端）** | Wiki.js | 前端索引 |

**建议**：基础搜索用后端全文检索，高级搜索引入浏览器端语义搜索。

### 4. 任务提醒方案

| 方案 | 代表项目 | 特点 |
|------|---------|------|
| **cron 定时推送** | liruibiji 当前方案 | 简单有效 |
| **内置提醒系统** | MrDoc（定时文档） | 较重 |
| **todo.txt 格式** | nt | 纯文本、AI 友好 |

**建议**：保持当前 cron 推送方案，同时参考 nt 的 todo.txt 格式标准化任务存储。

### 5. 目录结构方案

| 方案 | 代表项目 | 特点 |
|------|---------|------|
| **文件系统目录** | OtterWiki, Raneto | 自然映射 |
| **文集 + 文档** | MrDoc | 逻辑分组 |
| **标签 + 文件夹** | MarkItUp | 灵活组织 |

**建议**：文件系统目录 + 标签补充，兼顾物理存储和逻辑分类。

---

## 四、liruibiji 当前缺失功能优先级

根据竞品分析，按优先级排序：

### 🔴 高优先级（核心功能补齐）

1. **版本历史/回滚**
   - 参考：OtterWiki 的 Git 版本控制
   - 实现：利用 Git 仓库天然实现，或文件级 MD5 快照

2. **双向链接 / 反向链接**
   - 参考：MarkItUp 的 [[wikilinks]] + 反向链接
   - 实现：解析 Markdown 中的 `[[xxx]]` 语法，建立链接索引

3. **知识图谱可视化**
   - 参考：MarkItUp 的 3D 力导向图
   - 实现：D3.js 或 Cytoscape.js

4. **搜索增强**
   - 参考：MarkItUp 的语义搜索
   - 实现：前端用 Fuse.js 做全文搜索，进阶加语义搜索

### 🟡 中优先级（体验提升）

5. **发布状态管理**
   - 参考：MarkdownManager 的草稿/已发布/归档
   - 实现：frontmatter 中添加 `status:` 字段

6. **文集/分组概念**
   - 参考：MrDoc 的文集
   - 实现：前端展示层面的分组，不影响文件存储

7. **深色模式**
   - 参考：所有竞品标配
   - 实现：CSS 变量 + toggle

8. **多编辑器切换**
   - 参考：MrDoc 的 Editor.md / Vditor / iceEditor
   - 实现：前端加载不同编辑器组件

### 🟢 低优先级（锦上添花）

9. **AI 辅助写作**
   - 参考：MarkItUp 的 AI 链接建议
   - 实现：接入 Ollama / OpenAI API

10. **多端支持**
    - 参考：MrDoc 的多端生态
    - 实现：渐进式，先保证 Web 端体验

11. **PDF/EPUB 导出**
    - 参考：MrDoc
    - 实现：puppeteer / wkhtmltopdf

12. **标签关系网络**
    - 参考：MrDoc
    - 实现：D3.js 力导向图

---

## 五、技术选型建议

### 推荐架构

```
┌─────────────────────────────────────────┐
│              Frontend (React/Vue)        │
│  ┌──────────┬──────────┬──────────────┐ │
│  │ Tiptap   │ Fuse.js  │ D3.js/Cyto   │ │
│  │ Editor   │ Search   │ Graph Viz    │ │
│  └──────────┴──────────┴──────────────┘ │
├─────────────────────────────────────────┤
│           Backend (Python FastAPI)       │
│  ┌──────────┬──────────┬──────────────┐ │
│  │ File CRUD│ Search   │ Git Ops      │ │
│  │ API      │ Engine   │ Wrapper      │ │
│  └──────────┴──────────┴──────────────┘ │
├─────────────────────────────────────────┤
│         Storage (Markdown Files)         │
│  ┌──────────┬──────────┬──────────────┐ │
│  │ .md Files│ Git Repo │ Frontmatter  │ │
│  └──────────┴──────────┴──────────────┘ │
└─────────────────────────────────────────┘
```

### 关键技术决策

| 决策点 | 推荐选择 | 理由 |
|--------|---------|------|
| 前端框架 | React + Vite | 生态成熟，Tiptap 原生支持 |
| 编辑器 | Tiptap (ProseMirror) | WYSIWYG + Markdown 导出 |
| 后端框架 | FastAPI | 异步、类型安全、自动生成 API 文档 |
| 搜索引擎 | Fuse.js (前端) | 零依赖、快速、支持模糊搜索 |
| 版本控制 | Git (python-git2) | 天然版本管理 |
| 知识图谱 | D3.js | 灵活、社区活跃 |
| 部署 | Docker Compose | 一键部署，用户友好 |

---

## 六、总结

### 最值得借鉴的项目

1. **OtterWiki** — 证明了 **Flask + Markdown + Git** 是最轻量的 wiki 架构
2. **MarkItUp** — 展示了 **Next.js + TipTap + 浏览器端 AI** 的现代 PKM 形态
3. **MrDoc** — 提供了 **文集概念 + 多端生态** 的完整参考
4. **nt** — 验证了 **纯文本 + AI Agent 友好** 的任务管理方向

### 核心结论

liruibiji 的定位介于 **OtterWiki**（轻量 wiki）和 **MarkItUp**（现代 PKM）之间。建议：

1. **架构上**走 OtterWiki 路线：Flask/FastAPI + Markdown + Git
2. **编辑器上**走 MarkItUp 路线：Tiptap WYSIWYG
3. **搜索上**先做 Fuse.js 全文搜索，后续加语义搜索
4. **任务系统**保持当前 cron 推送方案，参考 nt 标准化存储格式
5. **知识图谱**用 D3.js 实现双向链接可视化

这样既能保持轻量（零数据库），又能提供接近商业产品的用户体验。
