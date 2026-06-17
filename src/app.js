const express = require('express');
const path = require('path');
const fs = require('fs');

const {
  ARTICLES_DIR,
  FUJIAN_DIR,
  RECYCLE_BIN_DIR,
  SNAPSHOTS_DIR,
  STATIC_DIR,
  SYSTEM_TASKS_DIR,
  TEMPLATES_DIR,
} = require('./config');

const filesRouter = require('./routes/files');
const tasksRouter = require('./routes/tasks');
const historyRouter = require('./routes/history');
const tagsRouter = require('./routes/tags');
const searchRouter = require('./routes/search');
const settingsRouter = require('./routes/settings');
const settingsService = require('./services/settings-service');
const taskService = require('./services/task-service');

const app = express();

fs.mkdirSync(ARTICLES_DIR, { recursive: true });
fs.mkdirSync(FUJIAN_DIR, { recursive: true });
fs.mkdirSync(RECYCLE_BIN_DIR, { recursive: true });
fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
fs.mkdirSync(SYSTEM_TASKS_DIR, { recursive: true });
taskService.migrateLegacyTaskFiles();

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/static', express.static(STATIC_DIR));
app.use(settingsService.authGuard);
app.use('/articles', express.static(ARTICLES_DIR));
app.use('/fujian', express.static(FUJIAN_DIR));
app.use('/system/tasks', express.static(SYSTEM_TASKS_DIR));

app.use('/api', filesRouter);
app.use('/api', tasksRouter);
app.use('/api', historyRouter);
app.use('/api', tagsRouter);
app.use('/api', searchRouter);
app.use('/api', settingsRouter);

app.get('/files', (req, res) => {
  res.sendFile(path.join(TEMPLATES_DIR, 'index.html'));
});

app.get('/system/workbench', (req, res) => {
  res.sendFile(path.join(TEMPLATES_DIR, 'workbench.html'));
});

app.get('/system/settings', (req, res) => {
  res.sendFile(path.join(TEMPLATES_DIR, 'settings.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(TEMPLATES_DIR, 'login.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(TEMPLATES_DIR, 'index.html'));
});

module.exports = app;
