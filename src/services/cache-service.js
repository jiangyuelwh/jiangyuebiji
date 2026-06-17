const {
  FILE_CACHE_MAX,
  FILE_CACHE_TTL,
  DIR_CACHE_MAX,
  DIR_CACHE_TTL,
} = require('../config');

class LRUCache {
  constructor(maxSize = 200, ttl = 30000) {
    this.maxSize = maxSize;
    this.ttl = ttl;
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) return null;
    const entry = this.cache.get(key);
    if (Date.now() - entry.time > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key, value) {
    if (this.cache.has(key)) this.cache.delete(key);
    if (this.cache.size >= this.maxSize) this.cache.delete(this.cache.keys().next().value);
    this.cache.set(key, { value, time: Date.now() });
  }

  del(key) { this.cache.delete(key); }
  clear() { this.cache.clear(); }
  delPrefix(prefix) {
    for (const key of this.cache.keys()) if (key.startsWith(prefix)) this.cache.delete(key);
  }
}

const fileCache = new LRUCache(FILE_CACHE_MAX, FILE_CACHE_TTL);
const dirCache = new LRUCache(DIR_CACHE_MAX, DIR_CACHE_TTL);

module.exports = { LRUCache, fileCache, dirCache };
