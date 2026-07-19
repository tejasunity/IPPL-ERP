# Innotek Products — ERP System

Context file for Claude Code. Read this fully before making changes. This project has a
history of work being designed/coded in chat sessions that never made it into the deployed
files — treat this file and the actual repo contents as the only source of truth, not any
memory of past conversations.

## Cross-device workflow — read this first

Work on this project now happens in two places that do not automatically know about each
other: **Claude Code on a laptop** (primary build environment, has direct repo access) and
**Claude.ai conversations on a phone** (ideas, planning, review — no direct repo access).
Progress made in a Claude Code session on the laptop is invisible to a phone conversation
unless this file is updated to reflect it, and vice versa.

**Standing rule: at the end of any Claude Code session that changes what modules exist or
what's built, update the "Known gaps" and "Module map" sections below before ending the
session.** This file is only useful if it's kept current — a stale gap list is worse than no
gap list, because it causes rework or false confidence. If you are Claude Code reading this
and you're not sure whether an item below is actually still a gap, check the real files —
don't trust this document blindly, verify against `erp.html`/`gatepass.html`/etc. directly.

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

## Module map (laptop-verified against the actual repo, 17 July 2026)

| Module | File | Status |
|---|---|---|
| Core ERP (Dashboard, Production, Planning, Inventory, Dispatch, QC, Attendance, Employees, Finance, Purchase, Sales, Documents, Reports, Settings) | `erp.html` | Mature, in active use |
| PO Master & Dashboard (standalone board-reporting register: customer, containers, surcharges, full-payment tracking, multi-filters, report builder, PNG/PDF/PPTX export; own Sheet backend; auto-mirrors active orders into the Customer PO register) | `erp.html` (Sales page tab) | Built 16–17 July 2026, live |
| Production Planning: frozen baselines + re-process lines | `erp.html` (Planning page) | Built 17 July 2026, live |
| Team chat/tasks | `work/index.html` (+ `app.js`) | Firebase-backed, separate real-time app |
| Attendance PWA | `attendance/` | Legacy standalone, still linked from Hub |
| Stations/Roster data-collection workbook | `templates/Stations-Roster-Setup-v2.xlsx` | Awaiting user's filled copy; blocks the roster build |
| PO Master GAS backend | `backend-scripts/po-master/Code.gs` | Deployed by user, URL wired into erp.html |
| **Next-gen platform (Phase 1, laptop-as-server)** | sibling folder `../innotek-platform/` (own git repo, deliberately NOT in this public Pages repo) | Scaffolded 17 July 2026: Docker Compose with Postgres 16 + FastAPI + ElectricSQL, Inventory movement-ledger schema, branded dark PDF report service. Blocked on user installing Docker Desktop; Flutter SDK comes after. User has chosen Track B (infrastructure leapfrog) as the active priority — current erp.html is feature-frozen except bug fixes until further notice. |

**Phone-side note resolved (laptop verification, 16–17 July):** `gatepass.html` and
`po-dashboard.html` do **not** exist and never existed in this repo — no file, no git
history. The "recovered and advanced on laptop" reports referred to chat-session outputs
that never reached the repo. Gate Pass is to be **built fresh** (thin-relay architecture
agreed 14 July: Firebase as short-lived doorbell for visitor host-approval, ERP Sheet as
the permanent record; vehicle/material log ERP-only, outbound tied to real Dispatch/
Customer PO records). The original v1 scope notes (no contractor tracking, no returnable/
non-returnable split, no visitor photos) remain valid design context for that fresh build.
The old standalone PO dashboard concept is superseded by the PO Master tab, already live.

## Known gaps — laptop-verified against the actual files, 17 July 2026

The full 30-June-to-15-July chat transcript was audited line-by-line against the repo on
16 July; everything recoverable was restored and pushed (NFG/NEG terminology fixes,
Masters-driven NFG code lookup with the real NFGB1-style codes, Hub "Innotek Work" tile).
The list below is verified current reality, not phone-side memory:

- **Stations Master / People×Station×Level / Safety Protocols (Orange-Yellow-Green-Blue) /
  Receiving Operations / Daily Roster UI** — NOT in erp.html (zero "station" references —
  verified). The July-13 chat-built version was lost before reaching the repo; its 16 tasks
  (10 Critical / 6 Checklists), timings, and safety flags were recovered into
  `templates/Stations-Roster-Setup-v2.xlsx`. **Blocked on the user returning the filled
  workbook (especially the QUESTIONS sheet)**; then build in the approved staged order:
  masters → Daily Roster (broad + per-station views) → 4-horizon Planning rebuild →
  batch-linked daily entries → supervisor compilation/review → factory-wide report →
  Sample Requests.
- **Stage-wise raw material deduction** (CB uses L1, Decant uses P2, etc., deducting real
  Inventory stock like NFG GRN already does) — not built; the workbook's StageDeductionMap
  sheet collects the mapping.
- **Sales/Customer PO reconciliation** — `so-tbl` and `customerPOs` still two concepts
  (verified). Design agreed 14 July: Customer PO becomes the single order concept with two
  PDF outputs (Order Confirmation on accept, Dispatch Invoice/Packing List on shipment).
  Partial step done 17 July: PO Master orders now auto-mirror into the Customer PO register.
- **Gate Pass** — file never existed; build fresh per the thin-relay design (see Module map).
- **Sample Request workflow** (4 categories) — designed, not built.
- **Task Documents / SOP manual generator** — never started. Principle agreed: one task
  dataset generates BOTH the engineering brief and the floor-training manual.
- **Monthly MIS auto-generation** (from PO Master data) — requested 15 July, deferred by user.
- **Tally export** — never implemented.
- **Real login/role-based access** — static display table only. Named a **pre-requisite for
  team-wide rollout** and a Phase-1 target-stack item (JWT) in ARCHITECTURE_ROADMAP.md.
- **ERP ↔ Work app data bridge** — parked; the Work app has a detect-and-share structured
  card (communication aid, no ERP writes) instead.
- **Tier-1 PE-readiness levers from ARCHITECTURE_ROADMAP.md** — not yet built: SPC/Cpk
  control charts from existing QC data, supply-chain resilience view from Supplier Master,
  customer concentration chart, templated bi-weekly investor report v1. ("Provable
  Consistency" tagline added to erp.html top bar 17 July — done.)

## Parked with timelines (user's own calls)

- **Multi-shift roster support** — parked ~3 months from mid-July 2026 (≈ Oct 2026); roster
  data model must let a shift dimension slot in without a rebuild.
- **Holding stages / intermediate-location tracking** for batches — dedicated later pass.
- **"Need Material Handling"** (~16 buckets/blender cycle) — named gap awaiting a designed
  solution.
- **"Eliminate" process status** — revisit within ~6 months of July 2026.
- **Computer-vision defect inspection** — roadmap item, not now.

## Session continuity — standing rule (read first)

**`../innotek-platform/SESSION-HANDOVER.md` is the resume-from-anywhere file.**
It holds paths, run commands, all backend URLs, loaded data counts, verified business
rules, what's built, and the real backlog.

- **Update it after every significant step** — not at the end of a session. Claude cannot
  detect remaining session capacity (there is no signal to read), so "warn before the
  limit" is not reliably possible. Keeping the file always-current is what makes an
  abrupt cut-off harmless.
- Regenerate the PDF with `py -3 tools\make_brief.py SESSION-HANDOVER.md`; a copy goes to
  the user's Desktop as `Innotek-Session-Handover.pdf`.
- To resume: "Read innotek-platform\SESSION-HANDOVER.md and continue."

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
- **Periodically suggest new agent candidates** (see `ARCHITECTURE_ROADMAP.md` → "Agentic
  Layer") as new data sources or infrastructure come online — this is a standing practice,
  not a one-time list. Any agent touching money, customers, or investors drafts for approval;
  it does not act autonomously.
- **Prepare an investor-facing presentation** (for a global, US/Europe-based current
  investor audience) showing where Innotek's technical/digital journey stands today versus
  the target end-state in `ARCHITECTURE_ROADMAP.md`, including sample UI screens ~90% close
  to what's actually planned — not generic mockups. First version exists:
  `Innotek_Digital_Journey.pptx`/`.pdf` (13 slides, in this folder).

## Design philosophy (agreed across the July 2026 sessions)

- **"One input, two views."** The daily roster is set once (who's on which station today,
  defaulting to yesterday's pattern, override in seconds); the circulation-ready Broad Plan
  and the per-station Detail view are both generated from that single entry. Same principle
  for Task Documents (engineer brief vs floor-training manual from one task dataset).
- **Stations/roles own recurring work, not people.** Whoever is rostered fills the role that
  day; standing responsibility is separate from the daily roster.
- **Receiving Operations are a third category** — same People×Level×Responsibility mechanism
  as Stations but frequency-based (triggered by a delivery, not the calendar).
- **AI integrates into real workflows** (camera-scan on the real Centrifuge form, voice-fill
  on real batch fields) — never a separate playground. Clean master data before automation.
  Human review before anything commits. Audit trail on everything.
- **No invented data.** The hardcoded-NFG-codes incident (invented `NFG-899` vs real `NFGB1`)
  is the cautionary tale: lookup data lives in Masters sheets the user can see and correct,
  never in code constants.
- Build large modules **in reviewable stages, not one giant drop**.
