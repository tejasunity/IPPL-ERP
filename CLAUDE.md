# Innotek Products — ERP System

Context file for Claude Code. Read this fully before making changes. This project has a
history of work being designed/coded in chat sessions that never made it into the deployed
files — treat this file and the actual repo contents as the only source of truth, not any
memory of past conversations.

## What this is

A manufacturing ERP for Innotek Products (natural flake graphite processing, Pune, India) —
raw material NFG (Natural Flake Graphite) in, finished product NEG (Natural Expandable
Graphite) out. Product codes look like `NEGIN9980200NPH`. Built as a suite of single-file
HTML/JS PWAs hosted on GitHub Pages, no build step, no framework. Used by the founder/MD
(core team + management) — not yet rolled out to the wider factory team.

## Architecture

- **Hosting**: static files on GitHub Pages, one flat repo.
- **No framework, no bundler.** Each app is one `.html` file: HTML + CSS + JS inline. Keep it that way.
- **Backend**: Google Apps Script (GAS) Web Apps, one per module, each backed by its own
  Google Sheet. See `erp.html`'s `BACKEND` object for the current URL list — Attendance/FaceIN,
  Doc Mgmt, Production Data (formerly QCQA), Masters, Inventory & Purchase, Production Plan,
  Finance Ledger, Sales & Dispatch. URLs are stored in `localStorage`, overridable from
  Settings → Backend Connections in the ERP itself.
- **Writes**: `FormData` POST with `mode:'no-cors'` (fire-and-forget — GAS can't send CORS
  headers back reliably, so the browser can't read the response). All writes go through an
  offline-safe queue (`queueWrite()` in erp.html) — if the backend is unreachable, the write
  is saved locally and retried automatically, so nothing is lost even mid-factory with bad signal.
- **Reads**: JSONP (`<script src="...&callback=...">`) — the only way to GET cross-origin from
  GAS without CORS pain. Manual "🔄 Refresh from Sheet" buttons per module — no auto-polling.
  **The Google Sheet is always the source of truth**; refreshing overwrites local data.
- **Local mirror**: every module's data also lives in `localStorage` (keys prefixed `erp_`) as
  an offline cache and instant-render source. Same-origin pages (erp.html, work/index.html,
  gatepass.html, po-dashboard.html) share this localStorage — that's how they read each other's
  data (e.g. Gate Pass reads `erp_employees`, `erp_dispatch`, `erp_customerPOs` directly).

## Known hard-won bugs — don't reintroduce these

- **CORS**: always `Content-Type: text/plain` implicitly via FormData + `mode:'no-cors'` for
  POSTs. Never try to set JSON content-type on a GAS POST — it triggers a CORS preflight GAS
  can't handle.
- **GAS deployment**: must be deployed as **Execute as: Me / Who has access: Anyone** — not
  "Anyone with Google account." Every change to a `Code.gs` requires a **new deployment
  version** (not just saving) or the live URL keeps serving old code.
- **iOS date parsing**: never `new Date("YYYY-MM-DD")` — Safari/iOS parses this inconsistently.
  Split the string manually (`"YYYY-MM-DD".split('-')`) and construct the Date from parts.
- **Service workers**: use network-first strategy and bump the cache version string on every
  deploy, or installed PWAs silently keep serving stale code.
- **`new Date()` in general**: this codebase has had real bugs from timezone-naive date math —
  double check when touching attendance hours/OT calculations or anything date-bucketed.

## Module map (current, as of the last full audit)

| Module | File | Status |
|---|---|---|
| Core ERP (Dashboard, Production, Planning, Inventory, Dispatch, QC, Attendance, Employees, Finance, Purchase, Sales, Documents, Reports, Settings) | `erp.html` | Mature, in active use |
| Team chat/tasks | `work/index.html` (+ `app.js`) | Firebase-backed, separate real-time app |
| Gate Pass (Visitors + Vehicle/Material) | `gatepass.html` | Built, reads erp.html's localStorage, not yet linked from erp.html's nav |
| PO Progress Dashboard | `po-dashboard.html` | Built, live-wired to `erp_customerPOs`/`erp_fgBatches`/`erp_finance`, not yet linked from erp.html's nav |

## Known gaps — confirmed missing as of last audit, not yet built

Re-check this list against the actual files before assuming any of these are done —
several of these were designed and coded in a chat session and then never actually
made it into the deployed file:

- **Stations Master / People×Station×Level / Safety Protocols (Orange-Yellow-Green-Blue) /
  Receiving Operations** (Acid, Lye, Additive, Gas, Diesel feeding real Inventory stock) —
  fully designed, was coded once, is **not currently in erp.html**. This is the foundation
  for the Daily Roster and should be re-added before building the roster itself.
- **Daily Roster UI** (broad plan + per-station detail view) — designed, never built. Depends
  on the item above.
- **Stage-wise raw material deduction** (CB stage uses L1, Decant uses P2, etc. — each
  should deduct real Inventory stock the way NFG GRN consumption already does) — not built.
- **Sales/Customer PO reconciliation** — `erp.html` still has two disconnected order concepts:
  the old Sales Order table (`so-tbl`) and the Customer PO register (`customerPOs`). Customer
  PO is meant to become the single order concept, with two PDF outputs (Order Confirmation on
  accept, Dispatch Invoice/Packing List on shipment). Not done — old table still separate.
- **Gate Pass and PO Dashboard not linked into erp.html's nav/Hub** — files exist standalone.
- **Sample Request workflow** (control sample / pre-ship sample / new-customer sample / in-
  production sample — 4 categories) — designed, not built.
- **Task Documents / SOP manual generator** — flagged as a reminder, never started.
- **Tally export** — mentioned early as a bridge requirement, never implemented.
- **Real login/role-based access** — currently a static display table in Settings, not functional.
- **ERP ↔ Work app data bridge** (e.g. a chat instruction auto-drafting a PO in the ERP) —
  explicitly parked, still parked.

## Working conventions (from the person running this project)

- **Always deliver complete, ready-to-use files** — not snippets, not "add this line here."
  Take full ownership of technical decisions rather than handing setup steps back.
- **No visible-progress-free multi-step instructions** — prefer doing the work over describing
  the steps to do it.
- **Ask clarifying questions before large builds**, especially anything touching workflow
  design (production stages, roles, approval flows) — but don't over-ask on small, obvious things.
- **Google Sheet is the source of truth** wherever ERP data and Sheet data could conflict.
- **Offline-first matters** — this runs on a factory floor with patchy signal. Any new write
  path must go through the existing queue pattern, not a bare `fetch()`.
- Before starting a large module, confirm against the **Known gaps** list above rather than
  assuming chat history reflects the real file state.
