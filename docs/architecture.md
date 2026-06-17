# 架构说明

## 1. 总体定位

liruibiji 是一个：

- 单机优先
- 文件驱动
- 本地优先
- 面向个人知识管理

的知识库系统。

它不是数据库中心系统，也不是多人协作平台。

---

## 2. 核心架构

```text
浏览器
  ↓
Express 路由层
  ↓
services / utils
  ↓
articles/ + .history/
```

---

## 3. 核心存储模型

### 唯一持久化格式

所有文章最终都存为 `.html`。

### Markdown 数据源

Markdown 放在 HTML 末尾的注释块中：

```html
<!--source-md
# 标题

正文
/source-md-->
```

---

## 4. 保存流程

```text
读取 source-md
  ↓
用户编辑 Markdown
  ↓
marked 渲染 HTML
  ↓
buildHtml()
  ↓
写回 .html
  ↓
保存历史快照
```

---

## 5. 当前后端结构

```text
src/
├─ app.js
├─ config.js
├─ routes/
├─ services/
└─ utils/
```

### routes

负责：

- 接收请求
- 参数解析
- 返回响应

### services

负责：

- Markdown / HTML 协议
- 缓存
- 历史版本

### utils

负责：

- 路径安全

---

## 6. 关键模块

### `markdown-service.js`

负责：

- `extractSourceMd`
- `ensureSourceMd`
- `buildHtml`
- `extractTitle`
- 标签 / 任务文本处理

这是项目最核心的协议层。

### `history-service.js`

负责：

- `saveSnapshot`
- `listHistory`

### `path-utils.js`

负责：

- 路径范围校验
- 防止越界访问 `articles/` 外部内容

---

## 7. 任务系统

任务通过 Markdown 行表达：

```md
- [ ] 任务内容 📅 2026-06-14%%每日任务%%
```

主要分类：

- `%%每日任务%%`
- `%%提醒事项%%`
- 无标签任务 = 其他待办

---

## 8. 历史快照

写操作前保存旧版本到：

```text
.history/
```

命名模式：

```text
原文件名 + 时间戳
```

---

## 9. 当前已完成重构

### 已完成

- 单体大文件初步拆分
- 路由拆分
- 基础 service 拆分
- 历史链路修复
- 测试体系建立

### 尚未完成

- `files.js` / `tasks.js` 业务继续下沉到 service
- 文档继续细化
- 更多接口级测试

---

## 10. 后续建议

优先顺序：

1. 继续下沉 route 业务逻辑
2. 补更多接口测试
3. 细化 docs
