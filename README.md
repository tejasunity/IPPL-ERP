# Innotek ERP

Internal manufacturing ERP for Innotek Products — GitHub Pages hosted, Google Apps Script + Google Sheets backend.

## Folder Structure

```
/
├── index.html          ← Hub / launcher page (start here)
├── erp.html             ← Main ERP: Dashboard, Production, Inventory, Dispatch,
│                           Quality, Employees, Finance, Purchase, Sales,
│                           Documents, Reports, Settings
└── attendance/
    ├── index.html        ← Attendance Ledger + FaceIN (face recognition)
    ├── manifest.json      ← PWA manifest for attendance app
    ├── sw.js              ← Service worker (offline shell caching)
    └── Code.gs            ← Google Apps Script backend source
                              (reference only — deploy via Apps Script editor,
                              this file does not run on GitHub Pages)
```

## How to Deploy on GitHub Pages

1. Create a new GitHub repository (e.g. `innotek-erp`).
2. Upload all files above, **preserving the folder structure** —
   the `attendance` folder must stay as a subfolder.
3. Go to **Settings → Pages** in your repository.
4. Under "Build and deployment", set **Source: Deploy from a branch**,
   branch: `main`, folder: `/ (root)`.
5. Save. GitHub will give you a URL like:
   `https://<your-username>.github.io/innotek-erp/`
6. Open that URL — you'll land on the Hub page with tiles for every module.

## Backend Configuration

### Attendance Module (already configured)
The Attendance module (`attendance/index.html`) already has its Apps Script
URL wired in (`APPS_SCRIPT_URL` constant near the bottom of the file).
The corresponding backend script is `attendance/Code.gs` — deploy this
in the Google Apps Script editor attached to your Attendance Google Sheet
(Sheet ID is in the comment at the top of `Code.gs`).

If you ever redeploy the Apps Script (new URL issued), update the
`APPS_SCRIPT_URL` constant in `attendance/index.html` to match.

### Main ERP Module
Open `erp.html` → **Settings** page → enter/update:
- Google Apps Script Web App URL
- Google Sheet ID

These are currently pre-filled with placeholder/reference URLs from the
QCQA and Doc Mgmt backends discussed earlier — update them under Settings
once your Apps Script deployments are ready, or edit the `BACKEND` object
directly near the top of the `<script>` section in `erp.html` for a
permanent default.

## Notes for This Trial Round

- **Inventory Control** is now fully built per spec: Stock Register (with
  category filters, weighted-average valuation, batch drill-down), Receive
  Stock (GRN, PO-linked or general), Issue Stock (slip with confirmation
  before deduction, WhatsApp card), Tool Register (issue/return, calibration
  due tracking), Stock Count (blind count, bay-wise, variance + reason,
  CEO sign-off), and Reorder/Indent (auto-flagged + manual, batched CEO
  approval, auto-creates PO on approval).
- **Purchase Management** is now fully built per spec: PO creation with
  advance/balance % tracking (auto-links to Finance ledger when marked
  paid), Edit-in-place, WhatsApp card + letterhead PDF export, Vendor
  History (spend + order history per vendor), and Payment Tracking tab.
  POs created here immediately appear in Inventory's GRN "Against PO"
  dropdown, closing the Indent → PO → GRN loop.
- Every workflow above has been tested end-to-end (not just visually
  checked) using automated browser testing — GRN receipt, stock issue,
  blind count with variance sign-off, indent-to-PO approval, and PO
  payment-to-Finance linkage all verified working with zero console errors.
- **Production Plan module** (weekly/monthly planning, CB assignment,
  deviation tracking, plan-approval gating on new batches) is still
  planned-only, not yet coded — next in sequence.
- Data still lives in browser `localStorage` per device — the Sheets-as-
  source-of-truth upgrade remains a separate, deliberate next step.

## Backend Setup — New Google Sheets

See **BACKEND_SETUP.md** for full step-by-step instructions to set up the
5 new Google Sheets backends (Masters, Inventory & Purchase, Production
Plan, Finance Ledger, Sales & Dispatch). Ready-to-paste Apps Script files
are in `backend-scripts/`.

Your 3 existing backends (Attendance, QCQA, Doc Mgmt) need no changes.

### Offline-safe sync (NEW)

Inventory and Purchase writes now go through an offline-safe queue: every
save updates your device instantly regardless of connection, and queues a
copy to the matching Google Sheet. If offline or the sheet is briefly
unreachable, changes queue locally and retry automatically — nothing is
lost. Check sync status anytime via the topbar indicator or Settings →
Offline Sync Status.

This has been tested to correctly distinguish "backend genuinely
unreachable, keep retrying" from "backend reachable, write succeeded" —
an earlier version of this engine had a flaw where it couldn't tell the
difference (a browser quirk with `no-cors` requests); this is now fixed
with a real reachability check before trusting any write.

