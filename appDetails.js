// Construct URL from item properties
const getAppDetailsBaseUrl = "http://store.steampowered.com/api/appdetails?appids=";

const steamAppId = 578080;

function fetchAppData() {
    
    // 1. Define the API endpoint URL for the app.
    const apiUrl = `${getAppDetailsBaseUrl}${steamAppId}`;

    try {
        // 2. Make the API request using UrlFetchApp.
        const response = UrlFetchApp.fetch(apiUrl);
        const data = JSON.parse(response.getContentText());

        const appResponse = data[steamAppId];

        if (!appResponse || !appResponse.success) {
            Logger.log(`Error: API response for App ID ${steamAppId} failed or was empty.`);
            return;
        }

        const gameDetails = appResponse.data;
        
        // 3. Get the Google Sheet and the specific sheet you want to write to.
        let ss = SpreadsheetApp.openById(SPREADHSEET_ID);
        let sheet = ss.getSheetByName("Game Info");
        
        // Define the headers that correspond to the data we want
        const HEADERS = ["App ID", "Name", "Short Description", "Website", "Categories", "Genres", "Image"];

        // If the sheet doesn't exist, create it.
        if (!sheet) {
            sheet = ss.insertSheet("Game Info");
            sheet.appendRow(HEADERS);
        } else {
            // Clear previous content and write new headers
            sheet.clear(); 
            sheet.appendRow(HEADERS);
        }

        // Helper function to format complex array fields (Categories/Genres)
        const formatArrayField = (arr) => {
            return arr ? arr.map(item => item.description).join(', ') : 'N/A';
        };

        // 4. Prepare the single row of data to be written.
        const row = [
            gameDetails.steam_appid,
            gameDetails.name,
            gameDetails.short_description,
            gameDetails.website || 'N/A', // Website might be null/undefined
            formatArrayField(gameDetails.categories),
            formatArrayField(gameDetails.genres),
            gameDetails.header_image // Assuming 'header_image' is a good image URL
        ];
        
        // Wrap the single row in an array since setValues expects an array of arrays
        const rows = [row];

        // 5. Write the data to the sheet starting from cell A2.
        sheet.getRange(2, 1, rows.length, HEADERS.length).setValues(rows);
        
        Logger.log("Data successfully fetched and written to the sheet!");

    } catch (e) {
        // Log any errors that occur during the process.
        Logger.log("Error fetching Steam data: " + e.toString());
    }
}