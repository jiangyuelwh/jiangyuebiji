const express = require('express');
const taskService = require('../services/task-service');

const router = express.Router();

router.get('/tasks/today', (req, res) => {
  try {
    res.json({ success: true, tasks: taskService.getTodayTasks() });
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, error: e.message });
  }
});

router.get('/tasks/other', (req, res) => {
  try {
    res.json({ success: true, tasks: taskService.getOtherTasks() });
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, error: e.message });
  }
});

router.get('/tasks/reminders', (req, res) => {
  try {
    res.json({ success: true, tasks: taskService.getReminderTasks() });
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, error: e.message });
  }
});

router.post('/tasks/today/save', (req, res) => {
  try {
    res.json(taskService.toggleTask(req.body));
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, error: e.message });
  }
});

router.post('/tasks/other/save', (req, res) => {
  try {
    res.json(taskService.toggleTask(req.body));
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, error: e.message });
  }
});

router.post('/tasks/reminders/save', (req, res) => {
  try {
    res.json(taskService.toggleTask(req.body));
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, error: e.message });
  }
});

  // 返回每日任务模板.html 中的任务项列表
router.get("/tasks/template", (req, res) => {
  try {
    const result = taskService.getTaskTemplate();
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, error: e.message });
  }
});

router.post('/tasks/today/generate', (req, res) => {
  try {
    res.json(taskService.generateTodayTasks());
  } catch (e) {
    const payload = { success: false, error: e.message };
    if (e.date) payload.date = e.date;
    res.status(e.statusCode || 500).json(payload);
  }
});

router.post('/tasks/today/ensure', (req, res) => {
  try {
    res.json(taskService.ensureTodayPage());
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, error: e.message });
  }
});

router.post('/tasks/today/add-item', (req, res) => {
  try {
    res.json({ success: true, ...taskService.addTodayTaskItem(req.body) });
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, error: e.message });
  }
});

router.post('/tasks/reminders/add', (req, res) => {
  try {
    res.json({ success: true, ...taskService.addReminderItemsFromTemplate() });
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, error: e.message });
  }
});

router.post('/tasks/reminders/add-item', (req, res) => {
  try {
    res.json({ success: true, ...taskService.addReminderItem(req.body) });
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, error: e.message });
  }
});

router.post('/tasks/reminders/ensure', (req, res) => {
  try {
    res.json(taskService.ensureReminderPage());
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, error: e.message });
  }
});

router.post('/tasks/template/ensure', (req, res) => {
  try {
    res.json(taskService.ensureTemplatePage());
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, error: e.message });
  }
});

module.exports = router;
