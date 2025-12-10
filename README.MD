# 🎮 Steam Game Ownership Analysis Tool

## 🎯 Project Goal

Analyze and identify **common games owned by selected Steam users**. The tool fetches user profiles, game libraries, and detailed game information, then automatically populates a Google Sheets dashboard with filtered results based on user selection.

---

## 🔗 Project Data Source

All data is managed in the following Google Sheet:

[What Should we Play?](https://docs.google.com/spreadsheets/d/1PtWcloteob212EVEY_8CFx_gd04holskCP2B2ZzvSgE/edit?usp=sharing)

---

## 🔧 How It Works

The `allScriptsCompiled.js` script is a **Google Sheets Apps Script** that automates Steam data collection and analysis.

### Key Features

1. **User Selection via Checkboxes** - Check the boxes in Row 1 (Columns C-J) of the "Final List" sheet to select which users to analyze
2. **Automatic Data Retrieval** - Fetches user profiles and game libraries from the Steam API
3. **Common Game Identification** - Finds games owned by **ALL selected users**
4. **Detailed Game Information** - Enriches data with metadata (categories, genres, descriptions, images)
5. **Sheet Population** - Automatically writes results to multiple organized sheets

---

## ⚙️ API Workflow

The script uses **Steam Web API** endpoints:

| API Endpoint                 | Purpose                                                                            |
| :--------------------------- | :--------------------------------------------------------------------------------- |
| **GetPlayerSummaries** | Fetch user profile info (name, avatar, profile URL) for multiple users in one call |
| **GetOwnedGames**      | Retrieve game library for a single user (one call per user required)               |
| **AppDetails**         | Get detailed metadata for specific games (one call per game)                       |

### Core Process

1. Read checkbox selections from "Final List" sheet (Row 1)
2. Fetch selected user profiles (batch API call)
3. Fetch owned games for each selected user (separate API call per user)
4. Compare libraries and identify common games (games owned by all selected users)
5. Fetch detailed info for common games (rate-limited to 2 seconds between calls)
6. Populate sheets with results

---

## 📊 Output Sheets

| Sheet Name             | Contains                                                                 |
| :--------------------- | :----------------------------------------------------------------------- |
| **Final List**   | Curated view with selected users, avatars, and common games with details |
| **User Data**    | User profiles (Steam ID, names, avatar/profile URLs)                     |
| **All Games**    | Every game owned by any selected user, sorted alphabetically             |
| **Common Games** | Games owned by ALL selected users (master list)                          |
| **Game Info**    | Detailed metadata for common games (categories, genres, descriptions)    |
| **Owned Games**  | Legacy sheet for single user testing                                     |

---

## 🎮 Data Structures

### User Data (from Steam API)

| Field Name      | Source                       |
| :-------------- | :--------------------------- |
| `steamid`     | Steam ID (unique identifier) |
| `personaname` | Username/nickname            |
| `realname`    | Real name (if public)        |
| `profileurl`  | Link to Steam profile        |
| `avatarfull`  | URL to profile avatar image  |

### Game Data (from Steam API)

| Field Name            | Source                                   |
| :-------------------- | :--------------------------------------- |
| `appid`             | Unique game identifier                   |
| `name`              | Game name                                |
| `categories`        | Game features (Multiplayer, Co-op, etc.) |
| `genres`            | Game types (Action, Adventure, etc.)     |
| `short_description` | Brief game summary                       |
| `header_image`      | Game cover art image URL                 |
| `website`           | Official game website                    |

---

## 🚀 Usage

### Run Complete Update (All Data)

```javascript
updateEverything()
```

Fetches user profiles and identifies common games. Does NOT fetch detailed game info.

### Run Complete Update with Game Details (Slow)

```javascript
updateEverythingWithGameInfo()
```

Fetches everything including detailed game metadata. **WARNING: Slow due to Steam API rate limiting (~2 seconds per game)**

### Update Only Game Details

```javascript
runGameInfoUpdateOnly()
```

Use this if you've already run `updateEverything()` and just need the detailed game info for common games.

### Run by Button Press

```javascript
runFullScriptByButtonPress()
```

Creates a visual indicator ("Running..." → "Complete!") while executing the full update.

---

## ⚙️ Configuration

Edit the `CONFIG` object in the script to modify:

- `STEAM_API_KEY` - Steam Web API key
- `SPREADSHEET_ID` - Google Sheets ID
- `RATE_LIMIT_MS` - Delay between API calls (default: 2000ms)
