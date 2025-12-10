// Simple TTL-based in-memory cache
// Usage: new Cache(ttlMs).set(key, value) / get(key) / has(key) / clear()

class Cache {
  constructor(ttlMs = 300000) {
    // ttlMs: time to live in milliseconds (default 5 min)
    this.ttlMs = ttlMs;
    this.store = new Map(); // key -> { value, expiresAt }
  }

  set(key, value) {
    const expiresAt = Date.now() + this.ttlMs;
    this.store.set(key, { value, expiresAt });
    return this;
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  has(key) {
    return this.get(key) !== undefined;
  }

  clear() {
    this.store.clear();
  }

  // Optional: stats for debugging
  size() {
    return this.store.size;
  }
}

module.exports = Cache;
