gKnight — Web version

This folder contains a small Express-based web application that proxies Steam API calls and provides a minimal frontend to find games commonly owned by multiple Steam users.

Files added:
- `server.js` — Express server with endpoints: `/api/playerSummaries`, `/api/ownedGames`, `/api/commonGames`, `/api/appDetails` and serves `public/`.
- `cache.js` — TTL-based in-memory cache for API responses (5 min default).
- `rateLimiter.js` — Token-bucket rate limiter per IP (10 requests / 10 seconds default).
- `public/index.html` — Minimal UI to paste Steam IDs and show results.
- `public/app.js` — Frontend logic with pagination support.
- `package.json` — node scripts and dependencies.
- `.env.example` — example environment variables file.

Quick start

1. Copy the example env and set your Steam Web API key:

```
copy .env.example .env  # Powershell
# then edit .env and set STEAM_API_KEY
```

2. Install dependencies:

```powershell
npm install
```

3. Run the server:

```powershell
npm start
```

4. Open in your browser: `http://localhost:3000`

Features

**Caching**
- In-memory cache with 5 min TTL for:
  - Player summaries (`/api/playerSummaries`)
  - Owned games per user (`/api/ownedGames`)
  - App details from Steam Store (`/api/appDetails`)
- Cache keys are logged to console as `[CACHE HIT]`

**Rate Limiting**
- Token-bucket limiter: **10 requests per 10 seconds per IP**
- Returns `429 Too Many Requests` if exceeded
- Automatic bucket refill over time

**Pagination**
- `/api/commonGames` supports `?page=1&limit=20` query params
- Default: page 1, limit 20 games per page
- Max limit: 100
- Response includes pagination metadata:
  ```json
  {
    "commonGames": [...],
    "pagination": { "page": 1, "limit": 20, "total": 150, "pages": 8 }
  }
  ```
- Frontend includes Previous/Next buttons when applicable

Security note

- Keep your `STEAM_API_KEY` secret. Do not commit a `.env` file with the key to a public repository.
- The server proxies API calls to avoid exposing the key in frontend JS.

Configuration

Edit these values in `server.js` if needed:

```javascript
const appDetailsCache = new Cache(300000);       // 5 min cache TTL
const ownedGamesCache = new Cache(300000);       
const playerSummariesCache = new Cache(300000);  
const rateLimiter = new RateLimiter(10, 10000); // 10 tokens per 10 sec
```

Notes & next steps

- **Rate limiting is per IP**. If you host behind a proxy, set X-Forwarded-For headers appropriately.
- The server uses simple in-memory storage; cached data is lost on restart. For production, use Redis or similar.
- Steam Store API may return 429 errors on heavy load. Consider adding retry logic with exponential backoff.
- You can hook this frontend into your existing React/Vite app if desired; the server endpoints are simple JSON APIs.
