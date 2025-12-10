// Token-bucket rate limiter
// Each IP gets a bucket with a max capacity; tokens refill over time.
// Default: 10 requests per 10 seconds per IP.

class RateLimiter {
  constructor(maxTokens = 10, refillMs = 10000) {
    this.maxTokens = maxTokens;
    this.refillMs = refillMs;
    this.buckets = new Map(); // ip -> { tokens, lastRefill }
  }

  // Get client IP from request (handles proxies)
  getClientIp(req) {
    return (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  }

  // Check if request is allowed; consume a token if yes
  allow(ip) {
    const now = Date.now();
    let bucket = this.buckets.get(ip);

    if (!bucket) {
      bucket = { tokens: this.maxTokens - 1, lastRefill: now };
      this.buckets.set(ip, bucket);
      return true;
    }

    // Refill tokens based on time elapsed
    const elapsed = now - bucket.lastRefill;
    const tokensToAdd = Math.floor(elapsed / this.refillMs) * this.maxTokens;
    if (tokensToAdd > 0) {
      bucket.tokens = Math.min(bucket.tokens + tokensToAdd, this.maxTokens);
      bucket.lastRefill = now;
    }

    if (bucket.tokens > 0) {
      bucket.tokens--;
      return true;
    }

    return false;
  }

  // Optional: clear buckets periodically to prevent memory bloat
  clear() {
    this.buckets.clear();
  }
}

module.exports = RateLimiter;
