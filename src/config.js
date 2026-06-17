const path = require('path');

const BASE_DIR = path.resolve(__dirname, '..');
const ARTICLES_DIR = path.join(BASE_DIR, 'articles');
const FUJIAN_DIR = path.join(BASE_DIR, 'fujian');
const RECYCLE_BIN_DIR = path.join(BASE_DIR, 'recycle_bin');
const SNAPSHOTS_DIR = path.join(BASE_DIR, 'snapshots');
const HISTORY_DIR = path.join(BASE_DIR, '.history');
const TEMPLATES_DIR = path.join(BASE_DIR, 'templates');
const STATIC_DIR = path.join(BASE_DIR, 'static');

const PORT = process.argv[2] || 8765;

const FILE_CACHE_MAX = 200;
const FILE_CACHE_TTL = 30000;
const DIR_CACHE_MAX = 50;
const DIR_CACHE_TTL = 10000;
const HISTORY_KEEP_COUNT = 50;

module.exports = {
  BASE_DIR,
  ARTICLES_DIR,
  FUJIAN_DIR,
  RECYCLE_BIN_DIR,
  SNAPSHOTS_DIR,
  HISTORY_DIR,
  TEMPLATES_DIR,
  STATIC_DIR,
  PORT,
  FILE_CACHE_MAX,
  FILE_CACHE_TTL,
  DIR_CACHE_MAX,
  DIR_CACHE_TTL,
  HISTORY_KEEP_COUNT,
};
