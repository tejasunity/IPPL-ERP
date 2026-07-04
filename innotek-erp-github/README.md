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

- This is a **planning + structural checkpoint build** — Inventory,
  Production Plan, and Purchase modules have been fully *planned* in
  detail but not yet rebuilt in code to match those plans. The current
  `erp.html` reflects the earlier build (with QCQA/Doc Mgmt integration)
  and will be updated module-by-module as each planning conversation
  concludes.
- The Attendance module is the **exact file you provided** (`index_4_July.html`),
  untouched, just relocated into the repo structure and given a "Hub" link
  back to the launcher page.
- Data currently lives in browser `localStorage` per device — this is a
  known limitation flagged in planning; the Sheets-as-source-of-truth
  upgrade is a separate, deliberate next step once module rebuilds are done.
