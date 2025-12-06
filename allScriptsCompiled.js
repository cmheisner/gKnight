// ALL SCRIPTS COMPILED

// ========================================
// 📋 CONFIGURATION
// ========================================

const CONFIG = {
    // API Configuration
    STEAM_API_KEY: "989B7C96A275D6D037147AFAF3B7CD00",
    SINGLE_STEAM_ID: "76561197970404504", // For testing single user operations

    // Google Sheets Configuration
    SPREADSHEET_ID: "1PtWcloteob212EVEY_8CFx_gd04holskCP2B2ZzvSgE",

    // Sheet Names
    SHEETS: {
        FINAL_LIST: "Final List",
        USER_DATA: "User Data",
        OWNED_GAMES: "Owned Games",
        GAME_INFO: "Game Info",
        ALL_GAMES: "All ActiveUser Owned Games",
        COMMON_GAMES: "Common Games"
    },

    // API Endpoints
    ENDPOINTS: {
        PLAYER_SUMMARIES: "http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/",
        OWNED_GAMES: "http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/",
        APP_DETAILS: "http://store.steampowered.com/api/appdetails?appids="
    },

    // Final List Configuration
    FINAL_LIST: {
        CHECKBOX_ROW: 1,
        NAME_ROW: 2,
        AVATAR_ROW: 3,
        GAMES_START_ROW: 4,
        GAMES_COLUMN: 2, // Column B for game names
        GAME_IMAGE_COLUMN: 1, // Column A for game images
        CATEGORIES_COLUMN: 11, // Column K for categories
        GENRES_COLUMN: 12, // Column L for genres
        DESCRIPTION_COLUMN: 13, // Column M for short description
        COLUMN_RANGE: [3, 4, 5, 6, 7, 8, 9, 10] // Columns C through J
    },

    // Rate Limiting
    RATE_LIMIT_MS: 2000 // 2 seconds between API calls
};

// ========================================
// 🔧 UTILITY FUNCTIONS
// ========================================

/**
 * Gets the spreadsheet object
 */
function getSpreadsheet() {
    return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
}

/**
 * Logs with timestamp and emoji
 */
function log(message, type = 'info') {
    const emojis = {
        start: '🚀',
        success: '✅',
        warning: '⚠️',
        error: '🛑',
        info: 'ℹ️',
        fetch: '📥',
        write: '📝',
        process: '⚙️'
    };

    const emoji = emojis[type] || emojis.info;
    const timestamp = new Date().toLocaleTimeString();
    Logger.log(`[${timestamp}] ${emoji} ${message}`);
}

/**
 * Sleep with logging
 */
function sleepWithLog(ms, reason = "Rate limiting") {
    log(`${reason} - waiting ${ms}ms...`, 'info');
    Utilities.sleep(ms);
}

// ========================================
// 👥 USER MANAGEMENT
// ========================================

/**
 * Reads checked checkboxes in row 1 and returns active users
 * Returns object mapping lowercase names to Steam IDs
 */
function getActiveUsers() {
    log("Getting active users from checkboxes...", 'start');

    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEETS.FINAL_LIST);
    const activeUsers = {};

    if (!sheet) {
        log(`Sheet "${CONFIG.SHEETS.FINAL_LIST}" not found!`, 'error');
        return activeUsers;
    }

    CONFIG.FINAL_LIST.COLUMN_RANGE.forEach(colIndex => {
        const checkboxCell = sheet.getRange(CONFIG.FINAL_LIST.CHECKBOX_ROW, colIndex);

        if (checkboxCell.getValue() === true) {
            const steamID = checkboxCell.getNote();

            if (steamID) {
                const userName = sheet.getRange(CONFIG.FINAL_LIST.NAME_ROW, colIndex).getDisplayValue();
                const keyName = userName.trim().toLowerCase();

                if (keyName) {
                    activeUsers[keyName] = steamID;
                    log(`Found active user: ${userName} (${steamID})`, 'success');
                } else {
                    log(`Column ${colIndex}: Checked but name is empty`, 'warning');
                }
            } else {
                log(`Column ${colIndex}: Checked but no Steam ID in note`, 'warning');
            }
        }
    });

    log(`Total active users: ${Object.keys(activeUsers).length}`, 'success');
    return activeUsers;
}

// ========================================
// 🌐 STEAM API FUNCTIONS
// ========================================

/**
 * Fetches player summaries for all active users in a SINGLE API call
 */
function fetchPlayerSummaries(steamIds) {
    log("Fetching player summaries...", 'fetch');

    const validIds = steamIds.filter(id => id && id.length > 0);

    if (validIds.length === 0) {
        log("No valid Steam IDs to query", 'warning');
        return null;
    }

    const idsString = validIds.join(',');
    const url = `${CONFIG.ENDPOINTS.PLAYER_SUMMARIES}?key=${CONFIG.STEAM_API_KEY}&steamids=${idsString}`;

    try {
        log(`Querying ${validIds.length} users in one request...`, 'fetch');
        const response = UrlFetchApp.fetch(url);
        const data = JSON.parse(response.getContentText());

        log(`Received data for ${data.response.players.length} players`, 'success');
        return data.response.players;
    } catch (e) {
        log(`Error fetching player summaries: ${e.toString()}`, 'error');
        return null;
    }
}

/**
 * Fetches owned games for a single user
 */
function fetchOwnedGamesForUser(steamId) {
    const url = `${CONFIG.ENDPOINTS.OWNED_GAMES}?key=${CONFIG.STEAM_API_KEY}&steamid=${steamId}&format=json&include_appinfo=1`;

    try {
        const response = UrlFetchApp.fetch(url);
        const data = JSON.parse(response.getContentText());
        const games = data.response.games || [];

        log(`Fetched ${games.length} games for Steam ID ${steamId}`, 'success');

        // Convert to map for easier lookup
        const gamesMap = {};
        games.forEach(game => {
            gamesMap[game.appid] = game;
        });

        return gamesMap;
    } catch (e) {
        log(`Error fetching games for ${steamId}: ${e.toString()}`, 'error');
        return {};
    }
}

/**
 * Fetches app details for a specific game
 */
function fetchAppDetails(appId) {
    const url = `${CONFIG.ENDPOINTS.APP_DETAILS}${appId}`;

    try {
        const response = UrlFetchApp.fetch(url);
        const data = JSON.parse(response.getContentText());
        const appResponse = data[appId];

        if (!appResponse || !appResponse.success) {
            log(`App ID ${appId} returned unsuccessful response`, 'warning');
            return null;
        }

        return appResponse.data;
    } catch (e) {
        log(`Error fetching app details for ${appId}: ${e.toString()}`, 'error');
        return null;
    }
}

/**
 * Fetches detailed info for multiple games with rate limiting
 */
function fetchMultipleAppDetails(appIds) {
    log(`Fetching detailed info for ${appIds.length} games...`, 'fetch');

    const gameDetails = [];

    appIds.forEach((appId, index) => {
        log(`Fetching details for game ${index + 1}/${appIds.length} (App ID: ${appId})...`, 'fetch');

        const details = fetchAppDetails(appId);
        if (details) {
            gameDetails.push(details);
        }

        // Rate limiting between requests
        if (index < appIds.length - 1) {
            sleepWithLog(1100, "Rate limiting (Steam Store API)"); // 1.1s to be safe
        }
    });

    log(`Successfully fetched details for ${gameDetails.length}/${appIds.length} games`, 'success');
    return gameDetails;
}

// ========================================
// 📊 SHEET WRITING FUNCTIONS
// ========================================

/**
 * Writes player summaries to User Data sheet
 */
function writePlayerSummaries(players) {
    log("Writing player summaries to sheet...", 'write');

    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName(CONFIG.SHEETS.USER_DATA);

    const headers = ["Steam ID", "Persona Name", "Real Name", "Profile URL", "Avatar URL"];

    if (!sheet) {
        sheet = ss.insertSheet(CONFIG.SHEETS.USER_DATA);
    }

    sheet.clear();
    sheet.appendRow(headers);

    const rows = players.map(user => [
        user.steamid,
        user.personaname,
        user.realname || "N/A",
        user.profileurl,
        user.avatarfull
    ]);

    if (rows.length > 0) {
        sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
        log(`Wrote ${rows.length} player summaries`, 'success');
    }
}

/**
 * Writes avatar images to Final List sheet (row 3)
 */
function writeAvatarsToFinalList(players, activeUsers) {
    log("Writing avatars to Final List...", 'write');

    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEETS.FINAL_LIST);

    if (!sheet) {
        log("Final List sheet not found!", 'error');
        return;
    }

    // Create Steam ID to Avatar URL map
    const steamIdToAvatar = {};
    players.forEach(player => {
        steamIdToAvatar[player.steamid] = player.avatarfull;
    });

    let avatarCount = 0;

    CONFIG.FINAL_LIST.COLUMN_RANGE.forEach(colIndex => {
        const checkboxCell = sheet.getRange(CONFIG.FINAL_LIST.CHECKBOX_ROW, colIndex);

        if (checkboxCell.getValue() === true) {
            const steamID = checkboxCell.getNote();

            if (steamID && steamIdToAvatar[steamID]) {
                const avatarUrl = steamIdToAvatar[steamID];
                const formula = `=IMAGE("${avatarUrl}")`;
                sheet.getRange(CONFIG.FINAL_LIST.AVATAR_ROW, colIndex).setFormula(formula);
                avatarCount++;
            }
        }
    });

    log(`Wrote ${avatarCount} avatars to Final List`, 'success');
}

/**
 * Writes all games from all users
 */
function writeAllGamesSheet(allUsersGames) {
    log("Writing all games sheet...", 'write');

    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName(CONFIG.SHEETS.ALL_GAMES);

    if (!sheet) {
        sheet = ss.insertSheet(CONFIG.SHEETS.ALL_GAMES);
    }

    sheet.clear();
    sheet.appendRow(["App ID", "Name", "Owner Count", "Owned By"]);

    // Collect all unique games
    const allGames = {};

    Object.entries(allUsersGames).forEach(([steamId, games]) => {
        Object.entries(games).forEach(([appId, game]) => {
            if (!allGames[appId]) {
                allGames[appId] = {
                    appid: game.appid,
                    name: game.name,
                    owners: []
                };
            }
            allGames[appId].owners.push(steamId);
        });
    });

    // Convert to rows and sort
    const rows = Object.values(allGames)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(game => [
            game.appid,
            game.name,
            game.owners.length,
            game.owners.join(", ")
        ]);

    if (rows.length > 0) {
        sheet.getRange(2, 1, rows.length, 4).setValues(rows);
        log(`Wrote ${rows.length} total games`, 'success');
    }
}

/**
 * Writes games owned by ALL users
 */
function writeCommonGamesSheet(allUsersGames) {
    log("Finding and writing common games...", 'process');

    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName(CONFIG.SHEETS.COMMON_GAMES);

    if (!sheet) {
        sheet = ss.insertSheet(CONFIG.SHEETS.COMMON_GAMES);
    }

    sheet.clear();
    sheet.appendRow(["App ID", "Name"]);

    const userCount = Object.keys(allUsersGames).length;

    if (userCount === 0) {
        log("No users to compare for common games", 'warning');
        return;
    }

    // Get common games
    const commonGames = findCommonGames(allUsersGames);

    // Sort and write
    const rows = commonGames
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(game => [game.appid, game.name]);

    if (rows.length > 0) {
        sheet.getRange(2, 1, rows.length, 2).setValues(rows);
    }

    log(`Found ${rows.length} games owned by all ${userCount} users`, 'success');

    // Return the common games for use by other functions
    return commonGames;
}

/**
 * Writes detailed game information to Game Info sheet
 */
function writeGameInfoSheet(gameDetails) {
    log("Writing game details to Game Info sheet...", 'write');

    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName(CONFIG.SHEETS.GAME_INFO);

    if (!sheet) {
        sheet = ss.insertSheet(CONFIG.SHEETS.GAME_INFO);
    }

    sheet.clear();

    const headers = ["App ID", "Name", "Short Description", "Website", "Categories", "Genres", "Image"];
    sheet.appendRow(headers);

    if (gameDetails.length === 0) {
        log("No game details to write", 'warning');
        return;
    }

    // Helper function to format array fields
    const formatArrayField = (arr) => {
        return arr ? arr.map(item => item.description).join(', ') : 'N/A';
    };

    const rows = gameDetails.map(game => [
        game.steam_appid,
        game.name,
        game.short_description || 'N/A',
        game.website || 'N/A',
        formatArrayField(game.categories),
        formatArrayField(game.genres),
        game.header_image || 'N/A'
    ]);

    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    log(`Wrote details for ${rows.length} games to Game Info sheet`, 'success');

    // Return the game details for use by other functions
    return gameDetails;
}

/**
 * Writes game details (image, categories, genres, description) to Final List sheet
 */
function writeGameDetailsToFinalList(gameDetails) {
    log("Writing game details to Final List sheet...", 'write');

    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEETS.FINAL_LIST);

    if (!sheet) {
        log("Final List sheet not found!", 'error');
        return;
    }

    if (gameDetails.length === 0) {
        log("No game details to write", 'warning');
        return;
    }

    // Helper function to format array fields
    const formatArrayField = (arr) => {
        return arr ? arr.map(item => item.description).join(', ') : 'N/A';
    };

    const startRow = CONFIG.FINAL_LIST.GAMES_START_ROW;

    // Clear existing data in columns A, K, L, M from row 4 downward
    const lastRow = sheet.getLastRow();
    if (lastRow >= startRow) {
        // Clear Column A (images)
        sheet.getRange(startRow, CONFIG.FINAL_LIST.GAME_IMAGE_COLUMN, lastRow - startRow + 1, 1).clearContent();
        // Clear Column K (categories)
        sheet.getRange(startRow, CONFIG.FINAL_LIST.CATEGORIES_COLUMN, lastRow - startRow + 1, 1).clearContent();
        // Clear Column L (genres)
        sheet.getRange(startRow, CONFIG.FINAL_LIST.GENRES_COLUMN, lastRow - startRow + 1, 1).clearContent();
        // Clear Column M (description)
        sheet.getRange(startRow, CONFIG.FINAL_LIST.DESCRIPTION_COLUMN, lastRow - startRow + 1, 1).clearContent();
    }

    // Prepare data for each column
    const imageFormulas = [];
    const categories = [];
    const genres = [];
    const descriptions = [];

    gameDetails.forEach(game => {
        // Column A: Image formula
        const imageUrl = game.header_image || '';
        const imageFormula = imageUrl ? `=IMAGE("${imageUrl}")` : '';
        imageFormulas.push([imageFormula]);

        // Column K: Categories
        categories.push([formatArrayField(game.categories)]);

        // Column L: Genres
        genres.push([formatArrayField(game.genres)]);

        // Column M: Short Description
        descriptions.push([game.short_description || 'N/A']);
    });

    // Write all data
    if (imageFormulas.length > 0) {
        // Write image formulas to Column A
        const imageRange = sheet.getRange(startRow, CONFIG.FINAL_LIST.GAME_IMAGE_COLUMN, imageFormulas.length, 1);
        imageFormulas.forEach((formula, index) => {
            if (formula[0]) {
                sheet.getRange(startRow + index, CONFIG.FINAL_LIST.GAME_IMAGE_COLUMN).setFormula(formula[0]);
            }
        });

        // Write categories to Column K
        sheet.getRange(startRow, CONFIG.FINAL_LIST.CATEGORIES_COLUMN, categories.length, 1).setValues(categories);

        // Write genres to Column L
        sheet.getRange(startRow, CONFIG.FINAL_LIST.GENRES_COLUMN, genres.length, 1).setValues(genres);

        // Write descriptions to Column M
        sheet.getRange(startRow, CONFIG.FINAL_LIST.DESCRIPTION_COLUMN, descriptions.length, 1).setValues(descriptions);

        log(`Wrote game details for ${gameDetails.length} games to Final List`, 'success');
    }
}

/**
 * Writes common games to Final List starting at row 4 in COLUMN B
 */
function writeCommonGamesToFinalList(allUsersGames) {
    log("Writing common games to Final List...", 'write');

    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEETS.FINAL_LIST);

    if (!sheet) {
        log("Final List sheet not found!", 'error');
        return;
    }

    const commonGames = findCommonGames(allUsersGames);
    commonGames.sort((a, b) => a.name.localeCompare(b.name));

    // Clear existing data from row 4 downward in COLUMN B
    const lastRow = sheet.getLastRow();
    if (lastRow >= CONFIG.FINAL_LIST.GAMES_START_ROW) {
        sheet.getRange(
            CONFIG.FINAL_LIST.GAMES_START_ROW,
            CONFIG.FINAL_LIST.GAMES_COLUMN,
            lastRow - CONFIG.FINAL_LIST.GAMES_START_ROW + 1,
            1
        ).clearContent();
    }

    // Write game names to COLUMN B
    if (commonGames.length > 0) {
        const gameNames = commonGames.map(game => [game.name]);
        sheet.getRange(
            CONFIG.FINAL_LIST.GAMES_START_ROW,
            CONFIG.FINAL_LIST.GAMES_COLUMN,
            gameNames.length,
            1
        ).setValues(gameNames);
    }

    log(`Wrote ${commonGames.length} common games to Final List (Column B)`, 'success');

    // Return the common games for use by other functions
    return commonGames;
}

// ========================================
// 🔍 HELPER FUNCTIONS
// ========================================

/**
 * Finds games owned by ALL users
 */
function findCommonGames(allUsersGames) {
    const userCount = Object.keys(allUsersGames).length;

    if (userCount === 0) {
        return [];
    }

    // Start with first user's games
    const firstUserId = Object.keys(allUsersGames)[0];
    const firstUserGames = allUsersGames[firstUserId];
    const commonGames = [];

    // Check each game to see if all users own it
    Object.entries(firstUserGames).forEach(([appId, game]) => {
        let ownedByAll = true;

        for (const userId of Object.keys(allUsersGames)) {
            if (!allUsersGames[userId][appId]) {
                ownedByAll = false;
                break;
            }
        }

        if (ownedByAll) {
            commonGames.push({
                appid: game.appid,
                name: game.name
            });
        }
    });

    return commonGames;
}

// ========================================
// 🎯 MAIN EXECUTION FUNCTIONS
// ========================================

/**
 * Main function: Fetches all user data and writes to sheets
 * This replaces fetchPlayerSummary() and combines operations
 */
function updateAllUserData() {
    log("=== STARTING USER DATA UPDATE ===", 'start');

    const activeUsers = getActiveUsers();
    const steamIds = Object.values(activeUsers);

    if (steamIds.length === 0) {
        log("No active users found. Please check checkboxes.", 'warning');
        return;
    }

    // Single API call for all player summaries
    const players = fetchPlayerSummaries(steamIds);

    if (players && players.length > 0) {
        writePlayerSummaries(players);
        writeAvatarsToFinalList(players, activeUsers);
    }

    log("=== USER DATA UPDATE COMPLETE ===", 'success');
}

/**
 * Main function: Fetches all games and writes all game-related sheets
 * This is the most comprehensive operation
 */
function updateAllGamesData() {
    log("=== STARTING GAMES DATA UPDATE ===", 'start');

    const activeUsers = getActiveUsers();
    const steamIds = Object.values(activeUsers);

    if (steamIds.length === 0) {
        log("No active users found. Please check checkboxes.", 'warning');
        return;
    }

    // Fetch games for each user (must be separate calls)
    const allUsersGames = {};

    steamIds.forEach((steamId, index) => {
        log(`Fetching games for user ${index + 1}/${steamIds.length}...`, 'fetch');
        allUsersGames[steamId] = fetchOwnedGamesForUser(steamId);

        // Rate limiting between requests
        if (index < steamIds.length - 1) {
            sleepWithLog(CONFIG.RATE_LIMIT_MS);
        }
    });

    // Write all sheets
    log("Processing and writing game data...", 'process');
    writeAllGamesSheet(allUsersGames);
    writeCommonGamesSheet(allUsersGames);
    const commonGames = writeCommonGamesToFinalList(allUsersGames);

    log("=== GAMES DATA UPDATE COMPLETE ===", 'success');

    // Return common games for chaining
    return commonGames;
}

/**
 * Fetches detailed information for all common games and populates Game Info sheet
 */
function updateGameInfoFromCommonGames() {
    log("=== STARTING GAME INFO UPDATE ===", 'start');

    // Read the common games from Final List sheet
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEETS.FINAL_LIST);

    if (!sheet) {
        log("Final List sheet not found!", 'error');
        return;
    }

    // Also need to get common games with App IDs from Common Games sheet
    const commonSheet = ss.getSheetByName(CONFIG.SHEETS.COMMON_GAMES);

    if (!commonSheet) {
        log("Common Games sheet not found! Run updateAllGamesData() first.", 'error');
        return;
    }

    // Read all games from Common Games sheet (has App IDs)
    const lastRow = commonSheet.getLastRow();

    if (lastRow < 2) {
        log("No games found in Common Games sheet", 'warning');
        return;
    }

    const gamesData = commonSheet.getRange(2, 1, lastRow - 1, 2).getValues();
    const appIds = gamesData.map(row => row[0]).filter(id => id); // Column A has App IDs

    log(`Found ${appIds.length} games to fetch detailed info for`, 'info');

    // Fetch detailed info for each game
    const gameDetails = fetchMultipleAppDetails(appIds);

    // Write to Game Info sheet
    if (gameDetails.length > 0) {
        writeGameInfoSheet(gameDetails);

        // NEW: Also write details to Final List sheet
        writeGameDetailsToFinalList(gameDetails);
    }

    log("=== GAME INFO UPDATE COMPLETE ===", 'success');
}

/**
 * Complete update: Does everything in one run
 */
function updateEverything() {
    log("=== STARTING COMPLETE UPDATE ===", 'start');

    updateAllUserData();
    log("Waiting before games update...", 'info');
    sleepWithLog(CONFIG.RATE_LIMIT_MS);
    updateAllGamesData();

    log("=== COMPLETE UPDATE FINISHED ===", 'success');
}

/**
 * Complete update including detailed game info (WARNING: This is SLOW due to API rate limits)
 */
function updateEverythingWithGameInfo() {
    log("=== STARTING COMPLETE UPDATE WITH GAME INFO ===", 'start');
    log("⚠️ WARNING: This will take a long time due to Steam Store API rate limits!", 'warning');

    updateAllUserData();
    log("Waiting before games update...", 'info');
    sleepWithLog(CONFIG.RATE_LIMIT_MS);
    updateAllGamesData();
    log("Waiting before game info update...", 'info');
    sleepWithLog(CONFIG.RATE_LIMIT_MS);
    updateGameInfoFromCommonGames();

    log("=== COMPLETE UPDATE WITH GAME INFO FINISHED ===", 'success');
}

/**
 * Legacy function: Fetch games for single test user
 */
function fetchSingleUserGames() {
    log("=== FETCHING GAMES FOR TEST USER ===", 'start');

    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName(CONFIG.SHEETS.OWNED_GAMES);

    if (!sheet) {
        sheet = ss.insertSheet(CONFIG.SHEETS.OWNED_GAMES);
    }

    sheet.clear();
    sheet.appendRow(["App ID", "Name"]);

    const games = fetchOwnedGamesForUser(CONFIG.SINGLE_STEAM_ID);
    const rows = Object.values(games)
        .map(game => [game.appid, game.name]);

    if (rows.length > 0) {
        sheet.getRange(2, 1, rows.length, 2).setValues(rows);
        log(`Wrote ${rows.length} games for test user`, 'success');
    }

    log("=== SINGLE USER FETCH COMPLETE ===", 'success');
}