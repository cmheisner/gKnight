// My API Key for Steam Data
const cmhAPIKey = "989B7C96A275D6D037147AFAF3B7CD00"
// Array of our user's Steam keys

function getAllUserKeys() {
const allUserKeys = {
  curtis: "76561197970404504",
  brandon: "76561197988465588", // Steam IDs that are empty or invalid will be skipped
  rudy: "76561198003005768",
  jimmy: "76561198102783196",
  tom: "76561197978095237",
  eevee: "76561198140938389"
};
  return allUserKeys;
};

// 3. Get Google Sheet to write to. 
const SPREADHSEET_ID = "1PtWcloteob212EVEY_8CFx_gd04holskCP2B2ZzvSgE";

// Construct URL from item properties
const getOwnedGamesBaseUrl = "http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/";

// This function will be called to run the API request and update the sheet.
function fetchUserData() {
  const allUserKeys = getAllUserKeys();
  // 1. Filter out empty Steam IDs and join them into a comma-separated string.
  const validSteamIDs = Object.values(allUserKeys).filter(id => id.length > 0).join(',');
  
  if (!validSteamIDs) {
    Logger.log("No valid Steam IDs found to query.");
    return;
  }

  // 2. Define the API endpoint URL for all users.
  const apiUrl = `${getOwnedGamesBaseUrl}?key=${cmhAPIKey}&steamid=${validSteamIDs}&format=json&include_appinfo=1`;

  try {
    // 3. Make the API request using UrlFetchApp.
    const response = UrlFetchApp.fetch(apiUrl);
    const data = JSON.parse(response.getContentText());

    // 4. Get the Google Sheet and the specific sheet you want to write to.
    let ss = SpreadsheetApp.openById(SPREADHSEET_ID);
    let sheet = ss.getSheetByName("Owned Games");
    
    // Define the headers that correspond to the data we want
    const HEADERS = ["App ID", "Name"];

    // If the sheet doesn't exist, create it.
    if (!sheet) {
      sheet = ss.insertSheet("Owned Games");
      sheet.appendRow(HEADERS);
    } else {
      // Clear previous content and write new headers
      sheet.clear(); 
      sheet.appendRow(HEADERS);
    }

    // 5. Prepare the data to be written to the sheet.
    // We need an array of arrays, where each inner array is a row.
    const players = data.response.games;
    
    const rows = players.map(user => [
      user.appid,
      user.name
    ]);

    // 6. Write the data to the sheet starting from cell A2.
    // The number of columns is the length of our HEADERS array (5).
    sheet.getRange(2, 1, rows.length, HEADERS.length).setValues(rows);
    
    Logger.log("Data successfully fetched and written to the sheet!");

  } catch (e) {
  // Log any errors that occur during the process.
  Logger.log("Error fetching Steam data: " + e.toString());
  }
}