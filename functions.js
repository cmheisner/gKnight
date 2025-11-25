


/**
 * Automatically runs whenever a cell is edited in the spreadsheet.
 * * If a checkbox in the range C1:H1 is set to TRUE (checked), this script reads 
 * the note from that specific cell and logs the content as an object array.
 * No changes are made to the spreadsheet itself.
 * * @param {GoogleAppsScript.Events.SheetsOnEdit} e The edit event object.
 */
function grabSteamIdFromActiveUsers(e) {
  // 1. Get the sheet and the edited range from the event object (e)
  var range = e.range;
  var sheet = range.getSheet();

  // Define the target range coordinates
  var targetRow = 1;
  var startCol = 3; // Column C
  var endCol = 8;   // Column H
  var targetSheetName = "Final List";

  // 2. Check if the edited cell is in the target range (C1:H1) and on the correct sheet
  var isTargetRow = range.getRow() === targetRow;
  var isTargetCol = range.getColumn() >= startCol && range.getColumn() <= endCol;

  if (isTargetRow && isTargetCol && sheet.getName() === targetSheetName) {

    // 3. Check if the Checkbox value is TRUE
    if (range.getValue() === true) {
      
      // Get the note from the edited cell
      var noteText = range.getNote();
      
      // Get the A1 notation (e.g., "C1", "D1") for clear logging
      var cellAddress = range.getA1Notation();
      
      // Structure the output as an array containing a single object, 
      // as requested ("object array").
      var logOutput = [
        {
          cell: cellAddress,
          note: noteText
        }
      ];
      
      // Log the extracted note content.
      // Remember to check the 'Executions' tab in the Apps Script editor for the output.
      Logger.log("Note extracted from " + cellAddress + ": %s", JSON.stringify(logOutput));
      // Example output looks like this " Note extracted from D1: [{"cell":"D1","note":"456"}] "
      
    } 
    // If the checkbox is FALSE, the script takes no action, fulfilling the clearing requirement.
  }
}
