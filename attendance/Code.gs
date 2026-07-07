/* =================================================================
   ATTENDANCE LEDGER + FACEIN — Google Apps Script Backend
   Sheet: https://docs.google.com/spreadsheets/d/1_jnpQ5Uq23KgZg6Px4dbBAwTMCJqFssm6CAsEd_9fZ4
   
   Deploy as Web App:
     Execute as: Me
     Access: Anyone
   After deploying, paste the /exec URL into index.html → APPS_SCRIPT_URL
================================================================= */

const SS_ID          = '1_jnpQ5Uq23KgZg6Px4dbBAwTMCJqFssm6CAsEd_9fZ4';
const SHEET_EMPLOYEES = 'Employees';
const SHEET_COMPANIES = 'Companies';
const SHEET_FACEDB    = 'FaceDB';
const SHEET_FACELOG   = 'FaceLog';
const LOG_PREFIX      = 'Log_';

const EMP_HEADERS  = ['EmployeeID','EmployeeName','Department','ManagedBy'];
const CO_HEADERS   = ['CompanyName'];
const LOG_HEADERS  = ['Date','EmployeeID','EmployeeName','Department','ManagedBy',
                       'Status','EntryTime','ExitTime',
                       'ActualHours','PaidHours','RegularHours','OvertimeHours','Remarks'];
const FACEDB_HEADERS  = ['EmployeeID','EmployeeName','Department','ManagedBy','Descriptor','EnrolledOn'];
const FACELOG_HEADERS = ['Timestamp','Date','Time','EmployeeID','EmployeeName',
                          'Department','ManagedBy','Type','Confidence'];

/* =================================================================
   HOURS CALCULATION
================================================================= */
function calcHours(entryTimeStr, exitTimeStr) {
  if (!entryTimeStr || !exitTimeStr) return {actual:0,paid:0,regular:0,ot:0};
  function toSec(s){const p=s.split(':').map(Number);return(p[0]||0)*3600+(p[1]||0)*60+(p[2]||0);}
  const diffSec = Math.max(toSec(exitTimeStr) - toSec(entryTimeStr), 0);
  const actualHrs = diffSec / 3600;
  let paidHrs = actualHrs - 0.5;
  if (paidHrs < 4) paidHrs = 4;
  const regularHrs = Math.min(paidHrs, 8);
  const otHrs = Math.max(paidHrs - 8, 0);
  return {
    actual:  Math.round(actualHrs  * 100) / 100,
    paid:    Math.round(paidHrs    * 100) / 100,
    regular: Math.round(regularHrs * 100) / 100,
    ot:      Math.round(otHrs      * 100) / 100
  };
}

/* =================================================================
   SHEET HELPERS
================================================================= */
function getOrCreateSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    sheet.getRange(1,1,1,headers.length)
         .setBackground('#1E2A30').setFontColor('#F4B860').setFontWeight('bold');
    sheet.setColumnWidths(1, headers.length, 140);
  }
  return sheet;
}

function getLogSheetName(company) {
  return LOG_PREFIX + company.replace(/[\/\\?\*\[\]:]/g,'_').substring(0,25);
}

function getLogSheet(ss, company) {
  return getOrCreateSheet(ss, getLogSheetName(company), LOG_HEADERS);
}

function sheetToObjects(sheet, headers) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h,i) => obj[h] = row[i] !== undefined ? String(row[i]) : '');
    return obj;
  });
}

function findRowIndex(sheet, colIndex, value) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][colIndex]) === String(value)) return i + 1;
  }
  return -1;
}

function findLogRowIndex(sheet, date, employeeId) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(date) && String(data[i][1]) === String(employeeId)) return i + 1;
  }
  return -1;
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
                       .setMimeType(ContentService.MimeType.JSON);
}

/* =================================================================
   SETUP — run once from Apps Script editor to create all sheets
================================================================= */
function setupSheets() {
  const ss = SpreadsheetApp.openById(SS_ID);
  getOrCreateSheet(ss, SHEET_EMPLOYEES, EMP_HEADERS);
  getOrCreateSheet(ss, SHEET_COMPANIES, CO_HEADERS);
  getOrCreateSheet(ss, SHEET_FACEDB,    FACEDB_HEADERS);
  getOrCreateSheet(ss, SHEET_FACELOG,   FACELOG_HEADERS);
  const defaultCos = ['Innotek','BVG','Valkunde','Vicky Ent.'];
  defaultCos.forEach(co => getLogSheet(ss, co));
  const coSheet = ss.getSheetByName(SHEET_COMPANIES);
  if (coSheet.getLastRow() <= 1) defaultCos.forEach(co => coSheet.appendRow([co]));
  return jsonResponse({ok:true, message:'All sheets created'});
}

/* =================================================================
   doGet ROUTER
================================================================= */
function doGet(e) {
  try {
    const action   = (e.parameter && e.parameter.action)   || '';
    const callback = (e.parameter && e.parameter.callback) || '';
    const ss       = SpreadsheetApp.openById(SS_ID);
    let result;

    /* ---- setup ---- */
    if (action === 'setup') {
      result = JSON.parse(setupSheets().getContent());
    }

    /* ---- getAll — employees + companies + ALL log rows ---- */
    else if (action === 'getAll') {
      const employees = sheetToObjects(getOrCreateSheet(ss,SHEET_EMPLOYEES,EMP_HEADERS), EMP_HEADERS);
      const companies = sheetToObjects(getOrCreateSheet(ss,SHEET_COMPANIES,CO_HEADERS), CO_HEADERS)
                          .map(r => r.CompanyName).filter(Boolean);
      const log = [];
      companies.forEach(co => {
        const sheet = ss.getSheetByName(getLogSheetName(co));
        if (sheet) sheetToObjects(sheet, LOG_HEADERS).forEach(row => log.push(row));
      });
      result = {ok:true, employees, companies, log};
    }

    /* ---- getEmployees ---- */
    else if (action === 'getEmployees') {
      const employees = sheetToObjects(getOrCreateSheet(ss,SHEET_EMPLOYEES,EMP_HEADERS), EMP_HEADERS);
      result = {ok:true, employees};
    }

    /* ---- getCompanies ---- */
    else if (action === 'getCompanies') {
      const companies = sheetToObjects(getOrCreateSheet(ss,SHEET_COMPANIES,CO_HEADERS), CO_HEADERS)
                          .map(r=>r.CompanyName).filter(Boolean);
      result = {ok:true, companies};
    }

    /* ---- getLog (by company or all) ---- */
    else if (action === 'getLog') {
      const company = e.parameter.company || '';
      if (company) {
        const sheet = ss.getSheetByName(getLogSheetName(company));
        result = sheet ? {ok:true, log:sheetToObjects(sheet,LOG_HEADERS)}
                       : {ok:false, error:'Sheet not found: '+company};
      } else {
        // return all
        const companies = sheetToObjects(getOrCreateSheet(ss,SHEET_COMPANIES,CO_HEADERS),CO_HEADERS)
                            .map(r=>r.CompanyName).filter(Boolean);
        const log = [];
        companies.forEach(co => {
          const s = ss.getSheetByName(getLogSheetName(co));
          if (s) sheetToObjects(s,LOG_HEADERS).forEach(r=>log.push(r));
        });
        result = {ok:true, log};
      }
    }

    /* ---- getFaceDB ---- */
    else if (action === 'getFaceDB') {
      const sheet = getOrCreateSheet(ss, SHEET_FACEDB, FACEDB_HEADERS);
      const rows  = sheetToObjects(sheet, FACEDB_HEADERS);
      const faces = rows.map(r => {
        try { return {...r, Descriptor: JSON.parse(r.Descriptor)}; }
        catch(_) { return null; }
      }).filter(Boolean);
      result = {ok:true, faces};
    }

    else {
      result = {ok:false, error:'Unknown action: '+action};
    }

    // JSONP support (for face-api CORS workaround)
    if (callback) {
      return ContentService.createTextOutput(callback+'('+JSON.stringify(result)+')')
                           .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return jsonResponse(result);

  } catch(err) {
    return jsonResponse({ok:false, error:err.message});
  }
}

/* =================================================================
   doPost ROUTER
================================================================= */
function doPost(e) {
  try {
    const body   = JSON.parse(e.postData.contents);
    const action = body.action || '';
    const ss     = SpreadsheetApp.openById(SS_ID);

    /* ---- saveEmployee ---- */
    if (action === 'saveEmployee') {
      const emp = body.employee;
      if (!emp || !emp.id || !emp.name) return jsonResponse({ok:false,error:'Missing employee data'});
      const sheet  = getOrCreateSheet(ss, SHEET_EMPLOYEES, EMP_HEADERS);
      const rowIdx = findRowIndex(sheet, 0, emp.id);
      const rowData = [emp.id, emp.name, emp.department||'', emp.managedBy||''];
      if (rowIdx > 0) sheet.getRange(rowIdx,1,1,rowData.length).setValues([rowData]);
      else            sheet.appendRow(rowData);
      if (emp.managedBy) getLogSheet(ss, emp.managedBy);
      return jsonResponse({ok:true});
    }

    /* ---- deleteEmployee ---- */
    if (action === 'deleteEmployee') {
      const sheet  = getOrCreateSheet(ss, SHEET_EMPLOYEES, EMP_HEADERS);
      const rowIdx = findRowIndex(sheet, 0, body.employeeId);
      if (rowIdx > 0) sheet.deleteRow(rowIdx);
      return jsonResponse({ok:true});
    }

    /* ---- saveCompany ---- */
    if (action === 'saveCompany') {
      const company = body.company;
      if (!company) return jsonResponse({ok:false,error:'Missing company name'});
      const sheet    = getOrCreateSheet(ss, SHEET_COMPANIES, CO_HEADERS);
      const existing = sheetToObjects(sheet, CO_HEADERS).map(r=>r.CompanyName);
      if (!existing.includes(company)) sheet.appendRow([company]);
      getLogSheet(ss, company);
      return jsonResponse({ok:true});
    }

    /* ---- deleteCompany ---- */
    if (action === 'deleteCompany') {
      const sheet  = getOrCreateSheet(ss, SHEET_COMPANIES, CO_HEADERS);
      const rowIdx = findRowIndex(sheet, 0, body.company);
      if (rowIdx > 0) sheet.deleteRow(rowIdx);
      return jsonResponse({ok:true});
    }

    /* ---- markEntry ---- */
    if (action === 'markEntry') {
      const {date, employeeId, employeeName, department, managedBy, entryTime} = body;
      if (!managedBy) return jsonResponse({ok:false,error:'Missing managedBy'});
      const sheet  = getLogSheet(ss, managedBy);
      const rowIdx = findLogRowIndex(sheet, date, employeeId);
      if (rowIdx > 0) {
        const existing = sheet.getRange(rowIdx,1,1,LOG_HEADERS.length).getValues()[0];
        if (existing[5]==='Leave'||existing[5]==='Absent')
          return jsonResponse({ok:false,error:employeeName+' is marked '+existing[5]+' on '+date});
        if (existing[6]) return jsonResponse({ok:false,error:employeeName+' entry already at '+existing[6]});
        sheet.getRange(rowIdx,6).setValue('Present');
        sheet.getRange(rowIdx,7).setValue(entryTime);
      } else {
        sheet.appendRow([date,employeeId,employeeName,department||'',managedBy,'Present',entryTime,'','','','','','']);
      }
      return jsonResponse({ok:true});
    }

    /* ---- markExit ---- */
    if (action === 'markExit') {
      const {date, employeeId, employeeName, managedBy, exitTime} = body;
      const sheet  = getLogSheet(ss, managedBy);
      const rowIdx = findLogRowIndex(sheet, date, employeeId);
      if (rowIdx < 0) return jsonResponse({ok:false,error:employeeName+': no entry found for '+date});
      const rowRange = sheet.getRange(rowIdx,1,1,LOG_HEADERS.length);
      const existing = rowRange.getValues()[0];
      if (!existing[6]) return jsonResponse({ok:false,error:employeeName+': mark entry first.'});
      if (existing[7]) return jsonResponse({ok:false,error:employeeName+' exit already at '+existing[7]});
      const h = calcHours(String(existing[6]), exitTime);
      rowRange.setValues([[existing[0],existing[1],existing[2],existing[3],existing[4],
        'Present',existing[6],exitTime,h.actual,h.paid,h.regular,h.ot,existing[12]]]);
      return jsonResponse({ok:true, hours:h});
    }

    /* ---- markLeave / Absent ---- */
    if (action === 'markLeave') {
      const {date, employeeId, employeeName, department, managedBy, status, remarks} = body;
      if (!managedBy) return jsonResponse({ok:false,error:'Missing managedBy'});
      const sheet  = getLogSheet(ss, managedBy);
      const rowIdx = findLogRowIndex(sheet, date, employeeId);
      if (rowIdx > 0) {
        const existing = sheet.getRange(rowIdx,1,1,LOG_HEADERS.length).getValues()[0];
        if (existing[6]) return jsonResponse({ok:false,error:employeeName+' already Present on '+date});
        sheet.getRange(rowIdx,6).setValue(status);
        sheet.getRange(rowIdx,13).setValue(remarks||'');
      } else {
        sheet.appendRow([date,employeeId,employeeName,department||'',managedBy,
          status,'','',0,0,0,0,remarks||'']);
      }
      return jsonResponse({ok:true});
    }

    /* ---- bulkSync — used for offline queue flush and backdated entries ---- */
    if (action === 'bulkSync') {
      const records = body.records || [];
      let saved = 0;
      records.forEach(rec => {
        try {
          if (!rec.managedBy) return;
          const sheet  = getLogSheet(ss, rec.managedBy);
          const rowIdx = findLogRowIndex(sheet, rec.date, rec.employeeId);
          const h = (rec.entryTime && rec.exitTime)
            ? calcHours(rec.entryTime, rec.exitTime)
            : {actual:Number(rec.actualHours)||0, paid:Number(rec.paidHours)||0,
               regular:Number(rec.regularHours)||0, ot:Number(rec.overtimeHours)||0};
          const rowData = [rec.date,rec.employeeId,rec.employeeName,rec.department||'',rec.managedBy,
            rec.status||'',rec.entryTime||'',rec.exitTime||'',h.actual,h.paid,h.regular,h.ot,rec.remarks||''];
          if (rowIdx > 0) sheet.getRange(rowIdx,1,1,rowData.length).setValues([rowData]);
          else            sheet.appendRow(rowData);
          saved++;
        } catch(_) {}
      });
      return jsonResponse({ok:true, saved});
    }

    /* ---- saveFace ---- */
    if (action === 'saveFace') {
      const {employeeId, employeeName, department, managedBy, descriptor} = body;
      if (!employeeId || !descriptor) return jsonResponse({ok:false,error:'Missing data'});
      const sheet  = getOrCreateSheet(ss, SHEET_FACEDB, FACEDB_HEADERS);
      const rowIdx = findRowIndex(sheet, 0, employeeId);
      const rowData = [employeeId, employeeName||'', department||'', managedBy||'',
                       JSON.stringify(descriptor), new Date().toISOString()];
      if (rowIdx > 0) sheet.getRange(rowIdx,1,1,rowData.length).setValues([rowData]);
      else            sheet.appendRow(rowData);
      return jsonResponse({ok:true});
    }

    /* ---- deleteFace ---- */
    if (action === 'deleteFace') {
      const sheet  = getOrCreateSheet(ss, SHEET_FACEDB, FACEDB_HEADERS);
      const rowIdx = findRowIndex(sheet, 0, body.employeeId);
      if (rowIdx > 0) sheet.deleteRow(rowIdx);
      return jsonResponse({ok:true});
    }

    /* ---- logFaceAttendance ---- */
    if (action === 'logFaceAttendance') {
      const records = body.records || [];
      const sheet   = getOrCreateSheet(ss, SHEET_FACELOG, FACELOG_HEADERS);
      const now     = new Date();
      const tz      = Session.getScriptTimeZone();
      records.forEach(rec => {
        sheet.appendRow([
          now.toISOString(),
          Utilities.formatDate(now, tz, 'yyyy-MM-dd'),
          Utilities.formatDate(now, tz, 'HH:mm:ss'),
          rec.employeeId||'', rec.employeeName||'',
          rec.department||'', rec.managedBy||'',
          rec.type||'', rec.confidence||''
        ]);
      });
      return jsonResponse({ok:true, logged:records.length});
    }

    return jsonResponse({ok:false, error:'Unknown action: '+action});

  } catch(err) {
    return jsonResponse({ok:false, error:err.message});
  }
}
