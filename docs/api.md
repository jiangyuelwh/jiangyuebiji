# API 文档

本文档记录 liruibiji 当前主要 HTTP 接口。  
默认服务地址：

- `http://127.0.0.1:8765`

---

## 1. 文件接口

### `GET /api/dirs`

获取目录树。

#### 返回

```json
[
  {
    "type": "dir",
    "name": "任务管理",
    "path": "任务管理",
    "children": []
  }
]
```

---

### `GET /api/list?dir=`

列出指定目录下的文件和子目录。

#### 参数

- `dir`：相对 `articles/` 的目录路径，可为空

#### 返回

```json
{
  "success": true,
  "files": [
    {
      "name": "今日任务.html",
      "title": "今日任务",
      "path": "任务管理/今日任务.html",
      "isDir": false,
      "size": 1234,
      "mtime": 1710000000000
    }
  ]
}
```

---

### `GET /api/read?path=`

读取文件内容，返回 Markdown 源、标题和标签。

#### 参数

- `path`：相对 `articles/` 的文件路径

#### 返回

```json
{
  "success": true,
  "markdown": "# 标题\n\n正文",
  "title": "标题",
  "path": "任务管理/今日任务.html",
  "tags": []
}
```

---

### `POST /api/save`

保存 Markdown 到指定文件。

#### 请求体

```json
{
  "path": "任务管理/今日任务.html",
  "markdown": "# 标题\n\n正文"
}
```

#### 返回

```json
{
  "success": true,
  "title": "标题",
  "path": "任务管理/今日任务.html"
}
```

---

### `POST /api/create-file`

新建文件。

#### 请求体

```json
{
  "name": "新文件.html",
  "dir": "",
  "content": "# 新文件\n\n"
}
```

#### 说明

- `content` 可选
- `name` 不带 `.html` 时会自动补上

---

### `POST /api/create-dir`

新建目录。

#### 请求体

```json
{
  "name": "新目录",
  "dir": ""
}
```

---

### `POST /api/rename`

重命名文件或目录。

#### 请求体

```json
{
  "path": "旧文件.html",
  "newName": "新文件.html"
}
```

---

### `POST /api/move`

移动文件到目标目录。

#### 请求体

```json
{
  "path": "旧目录/文件.html",
  "targetDir": "新目录"
}
```

---

### `POST /api/delete`

删除文件或目录。

#### 请求体

```json
{
  "path": "任务管理/今日任务.html",
  "isDir": false
}
```

---

### `POST /api/upload`

上传文件内容。

#### 请求体

```json
{
  "dir": "",
  "files": [
    {
      "name": "demo.md",
      "content": "# 标题\n\n内容"
    }
  ]
}
```

#### 说明

- 支持 `.md`
- 支持 `.html`
- `.md` 会自动转成 `.html`

---

### `GET /api/render-md?path=`

将指定 Markdown 文件渲染为 HTML 片段返回。

#### 参数

- `path`：相对 `articles/` 的路径

---

## 2. 标签与搜索

### `GET /api/tags`

获取所有标签。

#### 返回

```json
{
  "success": true,
  "tags": ["学习", "任务"]
}
```

---

### `GET /api/tags?tag=关键词`

按标签关键词搜索文件。

#### 返回

```json
{
  "success": true,
  "files": [
    {
      "name": "demo.html",
      "path": "demo.html",
      "title": "demo",
      "tags": ["学习"]
    }
  ]
}
```

---

### `GET /api/search?q=关键词`

按文件名或目录名搜索。

#### 返回

```json
{
  "success": true,
  "files": [
    {
      "name": "任务管理",
      "path": "任务管理",
      "isDir": true,
      "dir": ""
    }
  ]
}
```

---

## 3. 历史版本接口

### `GET /api/history?path=`

获取指定文件的历史快照列表。

#### 参数

- `path`：相对 `articles/` 的文件路径

#### 返回

```json
{
  "success": true,
  "versions": [
    {
      "file": "今日任务.html.2026-06-14T02-23-12-574Z",
      "time": "2026:06:14 02:23:12:574",
      "size": 10349
    }
  ]
}
```

---

### `GET /api/history/view?path=&version=`

查看某个历史版本内容。

#### 参数

- `path`
- `version`

#### 返回

```json
{
  "success": true,
  "content": "<!DOCTYPE html>..."
}
```

---

### `POST /api/history/restore`

将指定历史版本恢复回原文件。

#### 请求体

```json
{
  "path": "任务管理/今日任务.html",
  "version": "2026-06-14T02-23-12-574Z"
}
```

#### 返回

```json
{
  "success": true,
  "path": "任务管理/今日任务.html",
  "version": "2026-06-14T02-23-12-574Z"
}
```

---

## 4. 任务接口

### `GET /api/tasks/today`

获取“今日任务”列表。

---

### `GET /api/tasks/other`

获取“其他待办”列表。

---

### `GET /api/tasks/reminders`

获取“提醒事项”列表。

---

### `GET /api/tasks/template`

获取今日任务模板行。

#### 返回

```json
{
  "success": true,
  "lines": [],
  "date": "2026-06-14"
}
```

---

### `POST /api/tasks/today/generate`

根据 `每日任务模板.html` 生成当天任务区块。

#### 返回

```json
{
  "success": true,
  "count": 7,
  "date": "2026-06-14"
}
```

---

### `POST /api/tasks/today/add-item`

添加单条今日任务。

#### 请求体

```json
{
  "content": "督促小孩学英语",
  "date": "2026-06-14"
}
```

---

### `POST /api/tasks/reminders/add`

从提醒模板追加提醒事项。

---

### `POST /api/tasks/reminders/add-item`

添加单条提醒事项。

#### 请求体

```json
{
  "content": "开会",
  "date": "2026-06-14",
  "time": "09:00"
}
```

---

### `POST /api/tasks/today/save`

切换今日任务勾选状态。

#### 请求体

```json
{
  "file": "任务管理/今日任务.html",
  "raw": "- [x] 督促小孩学英语 📅 2026-06-14%%每日任务%%"
}
```

---

### `POST /api/tasks/other/save`

切换其他待办勾选状态。

---

### `POST /api/tasks/reminders/save`

切换提醒事项勾选状态。

---

## 5. 统一返回约定

### 成功

```json
{
  "success": true
}
```

### 失败

```json
{
  "success": false,
  "error": "错误信息"
}
```

> 注：历史遗留接口返回风格可能仍有少量不一致，后续会继续统一。
