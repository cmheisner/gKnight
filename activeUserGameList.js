/**
 * Fetches games for all users and writes two sheets:
 * 1. All ActiveUser Owned Games - combined list from all users
 * 2. Common Games - only games owned by ALL users
 */

function fetchActiveUsersOwnedGames() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // Fetch games for all users
    const allUsersGames = {};
    
    for (const steamId of ACTIVE_USERS) {
      Logger.log(`Fetching games for Steam ID: ${steamId}`);
      const games = fetchGamesForUser(steamId);
      allUsersGames[steamId] = games;
      Utilities.sleep(2000); // Rate limiting - wait 2 second between requests
    }
    
    // Process and write results
    writeAllGamesSheet(ss, allUsersGames);
    writeCommonGamesSheet(ss, allUsersGames);
    
    Logger.log("✅ Data successfully fetched and written!");
    
  } catch (e) {
    Logger.log(`🛑 Error: ${e.toString()}`);
  }
}

/**
 * Fetches games for a single user
 * @param {string} steamId - The Steam ID
 * @returns {Object} Map of appId -> game object
 */
function fetchGamesForUser(steamId) {
  const url = `${GETPlayerSummariesBaseUrl}?key=${cmhAPIKey}&steamid=${steamId}&format=json&include_appinfo=1`;
  
  const response = UrlFetchApp.fetch(url);
  const data = JSON.parse(response.getContentText());
  
  const games = data.response.games || [];
  
  // Convert to a map for easier lookup
  const gamesMap = {};
  games.forEach(game => {
    gamesMap[game.appid] = game;
  });
  
  return gamesMap;
}

/**
 * Writes All ActiveUser Owned Games from all users to a sheet
 */
function writeAllGamesSheet(ss, allUsersGames) {
  let sheet = ss.getSheetByName("All ActiveUser Owned Games");
  
  if (!sheet) {
    sheet = ss.insertSheet("All ActiveUser Owned Games");
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
  
  // Convert to rows
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
  }
  
  Logger.log(`Wrote ${rows.length} games to "All ActiveUser Owned Games" sheet`);
}

/**
 * Writes only games owned by ALL users to a sheet
 */
function writeCommonGamesSheet(ss, allUsersGames) {
  let sheet = ss.getSheetByName("Common Games");
  
  if (!sheet) {
    sheet = ss.insertSheet("Common Games");
  }
  
  sheet.clear();
  sheet.appendRow(["App ID", "Name"]);
  
  const userCount = Object.keys(allUsersGames).length;
  
  if (userCount === 0) {
    Logger.log("No users to compare");
    return;
  }
  
  // Get first user's games as starting point
  const firstUserId = Object.keys(allUsersGames)[0];
  const firstUserGames = allUsersGames[firstUserId];
  
  // Filter to only games owned by ALL users
  const commonGames = [];
  
  Object.entries(firstUserGames).forEach(([appId, game]) => {
    let ownedByAll = true;
    
    // Check if all other users own this game
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
  
  // Sort and convert to rows
  const rows = commonGames
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(game => [game.appid, game.name]);
  
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 2).setValues(rows);
  }
  
  Logger.log(`Found ${rows.length} games owned by all ${userCount} users`);
}