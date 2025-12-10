// Simple Express server to proxy Steam API calls and serve a static frontend
// Usage: set STEAM_API_KEY in environment (or use .env)

const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
require('dotenv').config();
const Cache = require('./cache');
const RateLimiter = require('./rateLimiter');

const app = express();
const PORT = process.env.PORT || 3000;
const STEAM_API_KEY = process.env.STEAM_API_KEY || '';

// Initialize caches (5 min TTL) and rate limiter (10 req / 10 sec per IP)
const appDetailsCache = new Cache(300000);
const ownedGamesCache = new Cache(300000);
const playerSummariesCache = new Cache(300000);
const rateLimiter = new RateLimiter(10, 10000);

const ENDPOINTS = {
  PLAYER_SUMMARIES: 'http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/',
  OWNED_GAMES: 'http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/',
  APP_DETAILS: 'https://store.steampowered.com/api/appdetails?appids='
};

if (!STEAM_API_KEY) {
  console.warn('Warning: STEAM_API_KEY is not set. Set it in environment or .env for full functionality.');
}

app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Rate limiting middleware: check bucket before allowing request
app.use((req, res, next) => {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  if (!rateLimiter.allow(ip)) {
    return res.status(429).json({ error: 'Too many requests. Max 10 per 10 seconds.' });
  }
  next();
});

// Serve static frontend from /public
app.use(express.static(path.join(__dirname, 'public')));

// Helper: fetch JSON safely
async function fetchJson(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Fetch failed ${resp.status} ${resp.statusText}`);
  return resp.json();
}

// GET /api/playerSummaries?ids=comma,separated
app.get('/api/playerSummaries', async (req, res) => {
  try {
    const ids = req.query.ids;
    if (!ids) return res.status(400).json({ error: 'Missing ids query param' });
    
    // Check cache first
    const cacheKey = `playerSummaries:${ids}`;
    const cached = playerSummariesCache.get(cacheKey);
    if (cached) {
      console.log(`[CACHE HIT] playerSummaries for ${ids}`);
      return res.json(cached);
    }

    const url = `${ENDPOINTS.PLAYER_SUMMARIES}?key=${encodeURIComponent(STEAM_API_KEY)}&steamids=${encodeURIComponent(ids)}`;
    const data = await fetchJson(url);
    
    // Cache result
    playerSummariesCache.set(cacheKey, data);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ownedGames?steamid=xxxx
app.get('/api/ownedGames', async (req, res) => {
  try {
    const steamid = req.query.steamid;
    if (!steamid) return res.status(400).json({ error: 'Missing steamid query param' });
    
    // Check cache first
    const cacheKey = `ownedGames:${steamid}`;
    const cached = ownedGamesCache.get(cacheKey);
    if (cached) {
      console.log(`[CACHE HIT] ownedGames for ${steamid}`);
      return res.json(cached);
    }

    const url = `${ENDPOINTS.OWNED_GAMES}?key=${encodeURIComponent(STEAM_API_KEY)}&steamid=${encodeURIComponent(steamid)}&format=json&include_appinfo=1`;
    const data = await fetchJson(url);
    
    // Cache result
    ownedGamesCache.set(cacheKey, data);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/commonGames?ids=id1,id2,...  (steamids)
// Optional: ?page=1&limit=20 for pagination
app.get('/api/commonGames', async (req, res) => {
  try {
    const idsParam = req.query.ids;
    if (!idsParam) return res.status(400).json({ error: 'Missing ids query param' });
    const ids = idsParam.split(',').map(s => s.trim()).filter(Boolean);
    if (ids.length === 0) return res.status(400).json({ error: 'No valid ids provided' });

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    // Fetch owned games for each id in parallel
    const promises = ids.map(id => fetchJson(`${ENDPOINTS.OWNED_GAMES}?key=${encodeURIComponent(STEAM_API_KEY)}&steamid=${encodeURIComponent(id)}&format=json&include_appinfo=1`).catch(e => ({ error: e.message })));
    const results = await Promise.all(promises);

    // Convert to map of appid -> { appid, name } for each user
    const userGameMaps = results.map(r => {
      const games = (r && r.response && r.response.games) ? r.response.games : [];
      const map = new Map();
      games.forEach(g => map.set(String(g.appid), { appid: g.appid, name: g.name }));
      return map;
    });

    // Intersect appids
    const firstMap = userGameMaps[0];
    const common = [];
    for (const [appid, game] of firstMap.entries()) {
      let isCommon = true;
      for (let i = 1; i < userGameMaps.length; i++) {
        if (!userGameMaps[i].has(appid)) {
          isCommon = false; break;
        }
      }
      if (isCommon) common.push(game);
    }

    // Sort by name
    common.sort((a, b) => a.name.localeCompare(b.name));

    // Paginate
    const total = common.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedGames = common.slice(start, end);

    res.json({
      commonGames: paginatedGames,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/appDetails?appids=123,456
app.get('/api/appDetails', async (req, res) => {
  try {
    const appidsParam = req.query.appids;
    if (!appidsParam) return res.status(400).json({ error: 'Missing appids query param' });
    const appids = appidsParam.split(',').map(s => s.trim()).filter(Boolean);
    if (appids.length === 0) return res.status(400).json({ error: 'No valid appids' });

    // Fetch each appdetails (the store endpoint returns an object keyed by appid)
    const results = await Promise.all(appids.map(async (appid) => {
      // Check cache first
      const cached = appDetailsCache.get(appid);
      if (cached) {
        console.log(`[CACHE HIT] appDetails for ${appid}`);
        return cached;
      }

      const url = `${ENDPOINTS.APP_DETAILS}${encodeURIComponent(appid)}`;
      try {
        const data = await fetchJson(url);
        const obj = data[appid];
        let result;
        if (obj && obj.success && obj.data) {
          result = { appid, success: true, data: obj.data };
        } else {
          result = { appid, success: false };
        }
        // Cache it
        appDetailsCache.set(appid, result);
        return result;
      } catch (e) {
        const result = { appid, success: false, error: e.message };
        return result;
      }
    }));

    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fallback to index.html for SPA routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`gKnight Steam web server listening on http://localhost:${PORT}`);
});
