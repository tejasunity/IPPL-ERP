/**
 * INNOTEK PO MASTER — BACKEND (Code.gs)
 * ============================================================
 * Backend for the standalone "PO Master & Dashboard" tab in erp.html
 * (Sales & Orders page). Deliberately its own Sheet, its own script —
 * not linked to Production/Inventory/Dispatch or any other ERP module.
 *
 * DEPLOY:
 *   1. Open the target Spreadsheet > Extensions > Apps Script
 *   2. Delete the default Code.gs boilerplate, paste this file in
 *   3. Deploy > New deployment > type: Web app
 *        Execute as: Me
 *        Who has access: Anyone   (NOT "Anyone with Google account" —
 *        that setting causes a sign-in conflict on this ERP's other modules)
 *   4. Copy the Web app URL (ends in /exec) — paste it into erp.html's
 *      Settings > Backend Connections > "PO Master" field, then Save
 *      All URLs and reload the page.
 *   5. Any time you EDIT this script afterwards, you must push a NEW
 *      deployment version (Deploy > Manage deployments > pencil icon >
 *      New version) — saving alone does not update the live URL.
 *
 * SHEET: auto-created on first write if missing. Name: "POMaster".
 * You do not need to pre-create headers — the script writes them itself
 * the first time it runs.
 *
 * CONTRACT — matches every other backend already wired into erp.html:
 *   READ:  GET  ?action=getAll&sheet=POMaster&callback=cb
 *          -> cb({status:'success', data:[{...rowAsObject}, ...]})
 *   WRITE: POST body field "payload" = JSON.stringify({
 *            sheet:'POMaster', action:'upsert', keyField:'RowId', data:{...}
 *          })
 *          Sent by erp.html's queueWrite() with mode:'no-cors' — the response
 *          body is never read by the browser, so this just needs to not throw.
 *
 *   Deletes are soft: erp.html removes the row locally immediately, and
 *   separately re-upserts the same RowId with Deleted:'TRUE' rather than
 *   physically removing the sheet row. This matches every other backend in
 *   this ERP (none of them do hard deletes) and keeps a paper trail for
 *   board reporting — a row can always be un-flagged by hand in the Sheet.
 * ============================================================
 */

var SHEET_NAME = 'POMaster';
var HEADERS = ['RowId','PONumber','ProductCode','Qty','Destination','ContainerCount',
  'ContainerIDs','Total','Advance','AdvanceReceived','ContainerStatus','RMStatus',
  'ReadyMT','Notes','Deleted','Date','LastUpdated'];

function doGet(e) {
  var action = e.parameter.action;
  if (action === 'getAll') return getAll(e);
  if (action === 'ping') return _respond(e, JSON.stringify({status:'success'}));
  return _respond(e, JSON.stringify({status:'error', message:'Unknown action'}));
}

function doPost(e) {
  try {
    var payload = JSON.parse(e.parameter.payload || '{}');
    if (payload.action === 'upsert') upsertRow(payload);
    return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
  } catch (err) {
    // no-cors POSTs never read this response — this return value only matters
    // for direct testing/debugging in the Apps Script editor.
    return ContentService.createTextOutput('ERROR: ' + err.message).setMimeType(ContentService.MimeType.TEXT);
  }
}

function _sheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
  }
  return sh;
}

/** Reads every row of the POMaster sheet and returns it as JSON (JSONP if ?callback= is present). */
function getAll(e) {
  var sheet = _sheet();
  var data = sheet.getDataRange().getValues();
  var headers = data.shift() || HEADERS;
  var rowIdCol = headers.indexOf('RowId');
  var rows = data
    .filter(function (r) { return r[rowIdCol]; })
    .map(function (r) {
      var o = {};
      headers.forEach(function (h, i) { o[h] = r[i]; });
      return o;
    });
  return _respond(e, JSON.stringify({ status: 'success', data: rows }));
}

/** Updates the row matching payload.data[keyField], or appends a new row if none matches. */
function upsertRow(payload) {
  var sheet = _sheet();
  var data = sheet.getDataRange().getValues();
  var headers = data[0] || HEADERS;
  var keyField = payload.keyField || 'RowId';
  var keyCol = headers.indexOf(keyField);
  var d = payload.data || {};
  d.LastUpdated = new Date();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][keyCol]) === String(d[keyField])) {
      headers.forEach(function (h, colIdx) {
        if (d.hasOwnProperty(h)) sheet.getRange(i + 1, colIdx + 1).setValue(d[h]);
      });
      return;
    }
  }
  var newRow = headers.map(function (h) { return d.hasOwnProperty(h) ? d[h] : ''; });
  sheet.appendRow(newRow);
}

function _respond(e, json) {
  var cb = e.parameter.callback;
  if (cb) {
    return ContentService.createTextOutput(cb + '(' + json + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}
