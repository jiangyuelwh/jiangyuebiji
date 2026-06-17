# 测试说明

## 1. 运行方式

在项目根目录执行：

```bash
npm test
```

---

## 2. 当前测试类型

### 单元 / 逻辑测试

位于：

- `tests/markdown-service.test.js`
- `tests/path-utils.test.js`
- `tests/history-service.test.js`
- `tests/tasks-logic.test.js`

主要覆盖：

- Markdown / HTML 协议
- 路径安全
- 历史快照
- 任务行切换逻辑

### 接口集成测试

位于：

- `tests/api.integration.test.js`

主要覆盖：

- `/api/list`
- `/api/create-file`
- `/api/read`
- `/api/save`
- `/api/history`
- `/api/rename`
- `/api/move`
- `/api/delete`
- `/api/tasks/today/add-item`
- `/api/tasks/today/save`
- `/api/tasks/reminders/add-item`
- `/api/tasks/reminders/save`

---

## 3. 集成测试行为

接口测试会：

- 自动启动本地服务
- 创建临时测试文件
- 调用接口验证行为
- 测试结束后删除临时文件

任务相关测试还会：

- 自动清理测试写入的任务项

---

## 4. 当前目标

当前测试的目标不是追求高覆盖率，而是优先保障：

1. 核心协议不坏
2. 文件主链路不坏
3. 任务主链路不坏
4. 历史快照不坏

---

## 5. 后续建议补充

建议继续补：

- `/api/history/restore`
- `/api/upload`
- `/api/tasks/today/generate`
- `/api/tasks/reminders/add`
- 异常路径测试
- 越界路径测试
