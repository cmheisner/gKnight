

// This provides a list of users and their details
function fetchPlayerSummary() {
  const allUserKeys = getActiveUsersObject(); // getAllUserKeys();
  // 1. Filter out empty Steam IDs and join them into a comma-separated string.
  const validSteamIDs = Object.values(allUserKeys).filter(id => id.length > 0).join(',');
  
  if (!validSteamIDs) {
    Logger.log("No valid Steam IDs found to query.");
    return;
  }

  // 2. Define the API endpoint URL for all users.
  const apiUrl = `${GETPlayerSummariesBaseUrl}?key=${cmhAPIKey}&steamids=${validSteamIDs}`;

  try {
    // 3. Make the API request using UrlFetchApp.
    const response = UrlFetchApp.fetch(apiUrl);
    const data = JSON.parse(response.getContentText());

    // 4. Get the Google Sheet and the specific sheet you want to write to.
    let ss = SpreadsheetApp.openById(SPREADHSEET_ID);
    let sheet = ss.getSheetByName("API Data");
    
    // Define the headers that correspond to the data we want
    const HEADERS = ["Steam ID", "Persona Name", "Real Name", "Profile URL", "Avatar URL"];

    // If the sheet doesn't exist, create it.
    if (!sheet) {
      sheet = ss.insertSheet("API Data");
      sheet.appendRow(HEADERS);
    } else {
      // Clear previous content and write new headers
      sheet.clear(); 
      sheet.appendRow(HEADERS);
    }

    // 5. Prepare the data to be written to the sheet.
    // We need an array of arrays, where each inner array is a row.
    const players = data.response.players;
    
    const rows = players.map(user => [
      user.steamid,
      user.personaname,
      // The realname key is optional, use a fallback if it doesn't exist
      user.realname || "N/A", 
      user.profileurl,
      user.avatarfull
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