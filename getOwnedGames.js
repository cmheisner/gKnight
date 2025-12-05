// --- ⚙️ CONFIGURATION ---
// Use the single key and Steam ID you provided for testing.
const SINGLE_STEAM_ID = "76561197970404504";

const SPREADSHEET_ID = "1PtWcloteob212EVEY_8CFx_gd04holskCP2B2ZzvSgE"; 
// -------------------------

const getOwnedGamesBaseUrl = "http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/";

/**
 * Fetches game data for a single Steam user and writes it to a spreadsheet.
 */
function fetchOwnedGames() {
  
  // 1. Construct the API URL using the single Steam ID and Key.
  const ownedGamesUrl = `${getOwnedGamesBaseUrl}?key=${cmhAPIKey}&steamid=${SINGLE_STEAM_ID}&format=json&include_appinfo=1`;
  
  try {
    // 2. Make the API request.
    const response = UrlFetchApp.fetch(ownedGamesUrl);
    const data = JSON.parse(response.getContentText());

    // 3. Get the Google Sheet and the specific sheet.
    let ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName("Owned Games");
    
    // Define the headers
    const HEADERS = ["App ID", "Name"];

    // Ensure the sheet exists and is properly set up.
    if (!sheet) {
      sheet = ss.insertSheet("Owned Games");
    } 
    
    // Clear previous content and write headers
    sheet.clear(); 
    sheet.appendRow(HEADERS);

    // 4. Prepare the data to be written.
    // The response for a SINGLE user is directly under data.response.games
    const games = data.response.games;

    if (!games || games.length === 0) {
        Logger.log("No games found in the API response.");
        return;
    }
    
    // Map the game objects to an array of arrays (rows)
    const rows = games.map(game => [
      game.appid,
      game.name
    ]);

    // 5. Write the data to the sheet starting from cell A2.
    // The number of columns is the length of our HEADERS array (2).
    sheet.getRange(2, 1, rows.length, HEADERS.length).setValues(rows);
    
    Logger.log(`✅ Data successfully fetched and wrote ${rows.length} rows to the sheet!`);

  } catch (e) {
    // Log any errors that occur during the process.
    Logger.log(`🛑 Error fetching Steam data: ${e.toString()}`);
  }
}