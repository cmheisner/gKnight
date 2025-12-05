// My API Key for Steam Data
const cmhAPIKey = "989B7C96A275D6D037147AFAF3B7CD00"
// Array of our user's Steam keys

// 3. Get Google Sheet to write to. 
const SPREADHSEET_ID = "1PtWcloteob212EVEY_8CFx_gd04holskCP2B2ZzvSgE";
// Construct URL from item properties
const GETPlayerSummariesBaseUrl = "http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/";

/**
 * Reads checked checkboxes in row 1, uses the cell below (row 2) for the key (Name), 
 * and the checkbox cell's note for the value (Steam ID).
 * * Assumes: 
 * - Checkboxes are in Row 1 (e.g., C1, D1).
 * - The Name (key) is in Row 2 (e.g., C2, D2).
 * - The Steam ID (value) is in the Note of the checkbox cell (e.g., Note of C1).
 * * @returns {object} An object where keys are names and values are Steam IDs (e.g., {Brandon: "76561197988465588"}).
 */
function getActiveUsersObject() {
  // Get the Google Sheet and the specific sheet
  // Using SPREADSHEET_ID from the global context
  let ss = SpreadsheetApp.openById(SPREADSHEET_ID); 
  let sheet = ss.getSheetByName("Final List");
  
  // Define the column indices (1-based) to check for the checkboxes (C:3 to H:8)
  // These correspond to the addresses ['C1', 'D1', 'E1', 'F1', 'G1', 'H1']
  const columnIndicesToCheck = [3, 4, 5, 6, 7, 8]; 
  const CHECKBOX_ROW = 1; // Row for the checkboxes (C1, D1, etc.)
  const NAME_ROW = 2;     // Row for the name below the checkbox (C2, D2, etc.)

  // Loop through each column index
  for (let colIndex of columnIndicesToCheck) {
    // 1. Get the checkbox cell (e.g., C1, D1)
    let checkboxCell = sheet.getRange(CHECKBOX_ROW, colIndex);
    
    // Check if the checkbox is checked (value is true)
    if (checkboxCell.getValue() === true) {
      // 2. Get the Steam ID from the checkbox cell's note
      let steamID = checkboxCell.getNote();
      
      // 3. Only proceed if the Steam ID (note) is not empty
      if (steamID) {
        // 4. Get the Name from the cell *below* the checkbox (e.g., C2, D2)
        // We use .getDisplayValue() to get the text as it appears in the sheet
        let userName = sheet.getRange(NAME_ROW, colIndex).getDisplayValue();
        
        // 5. Clean and format the name for the key (e.g., " Brandon " -> "brandon")
        // This converts it to lowercase and removes leading/trailing whitespace
        let keyName = userName.trim().toLowerCase();
        
        // Ensure the name isn't empty after trimming
        if (keyName) {
          // Add the key-value pair to the object
          ACTIVE_USERS[keyName] = steamID;
        } else {
          Logger.log(`Skipping column ${colIndex}: Checked box has note, but cell below (Row ${NAME_ROW}) is empty.`);
        }
      } else {
        Logger.log(`Skipping column ${colIndex}: Checkbox is checked but has no Steam ID in the note.`);
      }
    }
  }

let jsonString = JSON.stringify(ACTIVE_USERS, null, 2);
let formattedOutput = jsonString.substring(1, jsonString.length - 1).trim();

// Log the final object
  Logger.log('Active Users Object (JSON-like output):');
  Logger.log(formattedOutput);
  
  return ACTIVE_USERS;
}