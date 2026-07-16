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
  an offline cache and instant-render source. Same-origin pages (erp.html, work/index.html)
  share this localStorage. NOTE: localStorage is per-origin — data entered on the local
  `file://` copy does not appear on the GitHub Pages copy; the Sheet backend is the bridge.

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

## Module map (verified against the repo, 16 July 2026)

| Module | File | Status |
|---|---|---|
| Core ERP (Dashboard, Production, Planning, Inventory, Dispatch, QC, Attendance, Employees, Finance, Purchase, Sales, Documents, Reports, Settings) | `erp.html` | Mature, in active use |
| PO Master & Dashboard (standalone board-reporting register, own Sheet backend, PNG/PDF/PPTX export) | `erp.html` (Sales page tab) | Built 16 July 2026, live |
| Team chat/tasks | `work/index.html` (+ `app.js`) | Firebase-backed, separate real-time app |
| Attendance PWA | `attendance/` | Legacy standalone, still linked from Hub |
| Stations/Roster data-collection workbook | `templates/Stations-Roster-Setup-v2.xlsx` | Awaiting user's filled copy; feeds the roster build |
| PO Master GAS backend | `backend-scripts/po-master/Code.gs` | Deployed by user, URL wired into erp.html |

`gatepass.html` and `po-dashboard.html` do **not** exist and never did in this repo — an
earlier version of this file wrongly listed them as built. Gate Pass is to be built fresh
(thin-relay design agreed: Firebase doorbell for host approval, ERP Sheet as the permanent
record). The old standalone PO dashboard is superseded by the PO Master tab.

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
  should deduct real Inventory stock the way NFG GRN consumption already does) — approved,
  not built. The `StageDeductionMap` sheet in the roster workbook collects the mapping.
- **4-horizon Planning hierarchy** (Monthly/Weekly plan → Weekly Forecast → Daily plan →
  Delivery Scheduling), wired to station coverage — approved as Stage 3 of the roster build
  order, never built. Planning↔Roster↔Actuals three-way link designed in the July-13 session.
- **Batch-linked daily entries, supervisor compilation/review, factory-wide report** —
  Stages 4–6 of the approved build order, never built.
- **Sales/Customer PO reconciliation** — `erp.html` still has two disconnected order concepts:
  the old Sales Order table (`so-tbl`) and the Customer PO register (`customerPOs`). Customer
  PO is meant to become the single order concept, with two PDF outputs (Order Confirmation on
  accept, Dispatch Invoice/Packing List on shipment). Design agreed 14 July, not built.
- **Gate Pass** — to be built fresh (file never existed). Thin-relay architecture agreed
  14 July: Firebase as short-lived doorbell for visitor host-approval, ERP Sheet as permanent
  record; vehicle/material log ERP-only, outbound tied to real Dispatch/Customer PO records.
- **Sample Request workflow** (control sample / pre-ship sample / new-customer sample / in-
  production sample — 4 categories) — designed, not built. Stage 7 of the build order.
- **Task Documents / SOP manual generator** — never started. Principle agreed: station/task
  data must generate BOTH an engineering brief and a floor-training doc from one source.
- **Monthly MIS auto-generation** (from PO Master data) — requested 15 July, explicitly
  deferred by user, keep in mind when touching PO Master.
- **Tally export** — mentioned early as a bridge requirement, never implemented.
- **Real login/role-based access** — static display table in Settings, not functional.
  Explicitly named a **pre-requisite for rolling the ERP out to the wider team**.
- **ERP ↔ Work app data bridge** (chat instruction auto-drafting a PO in the ERP) — parked.
  The Work app instead has a detect-and-share structured card (communication aid, no writes).

## Parked with timelines (user's own calls)

- **Multi-shift roster support** — parked ~3 months from mid-July 2026 (≈ Oct 2026). Roster
  data model must let a shift dimension slot in without a rebuild.
- **Holding stages / intermediate-location tracking** for batches — parked for a dedicated
  later pass; do not fold into the roster work.
- **"Need Material Handling"** (~16 buckets/blender cycle, bucket→lift→platform) — named gap
  in the user's own process map, explicitly awaiting a *designed* solution, not just logging.
- **"Eliminate" status** for process steps — deliberately not modeled; revisit when something
  real gets slated for removal (user: "maybe over the next 6 months").
- **Computer-vision defect inspection** (camera on product, not paper) — roadmap idea from
  the Palpx discussion, "worth keeping on the roadmap, not now."

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

## Design philosophy (agreed across the July 2026 sessions)

- **"One input, two views."** The daily roster is set once (who's on which station today,
  defaulting to yesterday's pattern, override in seconds); the circulation-ready Broad Plan
  and the per-station Detail view are both generated from that single entry — the user never
  types the same thing twice. The same principle applies to Task Documents (engineer brief
  vs floor-training manual from one task dataset).
- **Stations/roles own recurring work, not people.** "Centrifuge Operator — Morning" owns the
  checklist; whoever is rostered fills the role that day. Standing responsibility (who is
  qualified/responsible) is separate from the daily roster (who is actually there today).
- **Receiving Operations are a third category** — same People×Level×Responsibility mechanism
  as Stations but frequency-based (triggered by a delivery, not the calendar), so the Daily
  Roster only ever shows what needs coverage *today*.
- **AI features integrate into real workflows** (camera-scan tied to the real Centrifuge form,
  voice-fill tied to real batch fields) — never a separate playground. Clean master data
  before automation. Human review before anything commits. Audit trail on everything.
  (Distilled from the Palpx discussion, 13 July — it reinforced, not redirected, the design.)
- **No invented data.** The hardcoded-NFG-codes incident (invented `NFG-899` vs real `NFGB1`)
  is the cautionary tale: lookup data lives in Masters sheets the user can see and correct,
  never in code constants.
- **Approved roster build order** (13 July): (1) Stations + People×Station×Level masters →
  (2) Daily Roster → (3) 4-horizon Planning rebuild → (4) batch-linked Daily Entries →
  (5) Compilation + Supervisor Review → (6) Factory-wide Report → (7) Sample Requests.
  Build in reviewable stages, not one giant drop.
