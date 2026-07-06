# Innotek ERP — Backend Setup Guide

This sets up the 5 new Google Sheets backends. Your 3 existing backends
(Attendance, QCQA, Doc Mgmt) need **no changes** — leave them exactly as they are.

**Do these in order — Masters must be done first.**

---

## 1. Masters (do this first)

1. Go to Google Drive, create a new Google Sheet.
2. Rename it: `Innotek ERP - Masters`
3. Extensions → Apps Script.
4. Delete everything in the editor, paste the contents of
   `backend-scripts/masters/Code.gs`
5. Click the function dropdown (top toolbar, next to the bug icon) → select `setupSheets` → click **Run** (▶).
   - First time: it will ask for permissions — click through and allow.
   - You'll see a popup confirming the sheets were created. Check your spreadsheet — it should now have 10 tabs (Vendors, Customers, Bays, etc.) each with column headers.
6. Deploy → New deployment → gear icon → **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Click **Deploy**, authorize again if asked.
7. Copy the **Web app URL** it gives you (starts with `https://script.google.com/macros/s/...`) — save it somewhere, you'll paste it in two places:
   - Innotek ERP → Settings → "Masters" field
   - The other 4 scripts below (as `MASTERS_URL`)

**Fill in the Masters sheet tabs now (or later)** — Vendors, Customers, Bays, Spares Categories, Product Grades, BOM Header, BOM Lines, Chart of Accounts, Holiday Calendar, Voucher Persons, Transporters. You can also bulk-import using the Master Data Excel template via the ERP's Settings page once wired — see below.

---

## 2. Inventory & Purchase

1. New Google Sheet → rename `Innotek ERP - Inventory & Purchase`
2. Extensions → Apps Script → paste `backend-scripts/inventory-purchase/Code.gs`
3. **Before running setup**: find this line near the top —
   ```
   const MASTERS_URL = 'PASTE_MASTERS_WEB_APP_URL_HERE';
   ```
   Replace `PASTE_MASTERS_WEB_APP_URL_HERE` with the Masters Web App URL from step 1.7.
4. Run `setupSheets` (same as above) — creates 9 tabs (Stock Items, GRN Log, Issue Slips, Tools, Stock Counts, etc.)
5. Deploy → New deployment → Web app (Execute as: Me, Access: Anyone)
6. Copy the Web App URL → paste into Innotek ERP → Settings → "Inventory & Purchase" field

---

## 3. Production Plan

1. New Google Sheet → rename `Innotek ERP - Production Plan`
2. Extensions → Apps Script → paste `backend-scripts/production-plan/Code.gs`
3. Set `MASTERS_URL` to the same Masters URL as above.
4. Run `setupSheets` — creates Plan Header, Plan Lines, Deviations, and a
   pre-filled CB Master tab (CB1-CB4, with CB2/CB3 already marked Active
   to match your current operations).
5. Deploy as Web app, same settings as above.
6. Copy URL → Innotek ERP → Settings → "Production Plan" field

---

## 4. Finance Ledger

1. New Google Sheet → rename `Innotek ERP - Finance Ledger`
2. Extensions → Apps Script → paste `backend-scripts/finance-ledger/Code.gs`
3. Set `MASTERS_URL`.
4. Run `setupSheets` — creates Ledger Entries, PO Payment Links, Expenses, Payroll tabs.
5. Deploy as Web app.
6. Copy URL → Innotek ERP → Settings → "Finance Ledger" field

Note: this is separate from your existing Doc Mgmt sheet (Invoices/Vouchers
stay there). This new sheet is the double-entry ledger layer, and it's where
PO advance/balance payments land when you mark them paid in Purchase.

---

## 5. Sales & Dispatch

1. New Google Sheet → rename `Innotek ERP - Sales & Dispatch`
2. Extensions → Apps Script → paste `backend-scripts/sales-dispatch/Code.gs`
3. Set `MASTERS_URL`.
4. Run `setupSheets` — creates Sales Orders, Dispatch Records, Proforma Invoices tabs.
5. Deploy as Web app.
6. Copy URL → Innotek ERP → Settings → "Sales & Dispatch" field

---

## After all 5 are deployed

1. Open the ERP → **Settings** page.
2. Paste all 5 Web App URLs into their respective fields.
3. Click **Save All URLs**.
4. Click **Test All Connections** — each should show ✅ within a few seconds.
   If any show ⚠️, double check: the URL was copied in full, the deployment
   was set to "Anyone" access, and `MASTERS_URL` inside that script is correct.
5. Reload the page once after saving URLs.

From this point on:
- Every save you make in Inventory or Purchase writes to both your device
  (instantly, always) **and** queues a copy to the matching Google Sheet.
- If you're offline or the sheet is briefly unreachable, the top-right
  indicator shows "📴 Offline — N change(s) queued" or "🔄 Syncing" — nothing
  is lost, it retries automatically every 20 seconds and whenever your
  connection comes back.
- Settings → "Offline Sync Status" shows exactly what's pending at any time,
  with a manual "Retry Sync Now" button.

---

## What's NOT yet wired to sync (still localStorage-only for now)

Production, Quality/QC, Dispatch, Sales, and Finance's Ledger/Payroll/Expense
tabs still save to localStorage only — their backend write calls will be
added in the same pattern once we build out those modules further. Inventory
and Purchase (today's focus) are fully wired.
