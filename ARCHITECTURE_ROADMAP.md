# Innotek ERP — Architecture Roadmap

Companion to `CLAUDE.md` (which describes the *current* live system). This file is the
**target architecture and migration plan** — where the system is heading as the company
goes global, and how to get there without breaking what already works. Read both before
starting any Phase 1+ work.

## Why this rebuild is happening

The current system (static HTML/JS + Google Apps Script + Sheets, on GitHub Pages) was the
right call to get running fast at zero cost, and it's still making money today — it is not
being thrown away, it is being migrated piece by piece. But it structurally cannot support
where the company is going: a global team (US/Europe colleagues need real access, not a
single shared device), a "feels current, not 20-years-old" bar, and data volumes/workflows
that Sheets was never meant to be a database for.

## Non-negotiables driving every decision below

1. **Feels genuinely modern** — instant, native-feeling UI on phone, laptop, and desktop.
   Not a stretch goal, a hard requirement.
2. **Works for a global team** — US/Europe colleagues need real, low-latency access to
   specific modules, not everyone hitting one Indian office server on every click.
3. **Offline-first, everywhere** — factory floor connectivity is unreliable; this must
   never block work, on any platform.
4. **Cost stays absorbable** — self-hosting on the existing office server is the long-term
   plan; short-term cloud hosting is fine while iterating fast in Phase 1–2.
5. **The person running this company takes full ownership of technical direction** — Claude
   should propose complete, opinionated plans and default decisions, not hand back a list of
   options to research.

## Strategic Positioning & PE-Readiness — the actual north star

**Read this before any of the engineering sections below.** Everything else in this document
is a means to this end, not an end in itself. A technically excellent ERP running a
commodity graphite-processing business at the same margins, same customer concentration, and
same key-person dependency is still the same business, just with a nicer screen — that does
**not** move valuation multifold. Worth being precise about what the engineering sections
below actually buy, versus what this section buys, so effort isn't spent expecting the wrong
section to do the other's job:

- **What Phases 0–3 (the technical rebuild) genuinely deliver**: real operational alpha —
  working capital efficiency from accurate live inventory/receivables instead of Sheets lag,
  fewer costly floor errors from barcode/weighbridge integration, and the ability to actually
  run global revenue (colleagues who can properly work modules from the US/Europe). These are
  legitimate, a diligence team would note them favorably — but they're **hygiene, not a
  thesis**. They make the business run better; they don't change what category of business a
  PE firm thinks it's buying.
- **What actually changes the category, and the multiple**: repositioning from "a
  manufacturing company with good software" (an asset-multiple business) to **"a traceable,
  provable, ESG-verifiable, battery-supply-chain-ready critical minerals platform"** — this
  section. Every data-capture decision below should be evaluated against whether it serves
  this reframe, not against whether it's operationally convenient.

**The unifying principle behind every lever below**: each one turns this ERP from an
internal operations tool into something that creates real **switching costs and
data-driven trust with customers and their own compliance teams** — provable consistency a
customer can point to in their own audits, traceability data that removes a customer's
Digital Product Passport problem for them, sourcing resilience a customer's supply-chain risk
team can rely on. That's what separates "a supplier with good software" from "a platform the
industry depends on" — and it's the second category that a PE firm underwrites at a
meaningfully higher multiple, and that a competitor can't easily copy by just buying similar
software.

### The flagship concept: Provable Consistency

Battery-grade customers pay a premium for *provable* consistency, not just batches that pass
spec. You already capture pH, carbon%, expansion, mesh, and moisture on nearly every batch —
almost nobody in this data actually computes real statistical process control (Cpk/Ppk-style
process capability) from it. Turning existing QC history into real control charts and
capability scores is a genuine, buildable-today differentiator for both customers and PE
diligence.

**"Provable Consistency" is the company's tagline going forward, not just a concept in this
document — it must be visible, not just true.** Concretely:
- It should appear as a **bold, prominent tagline on the ERP itself** — top bar or dashboard
  header, near the Innotek logo/branding, seen by every employee every time they open the
  system. This is as much an internal culture reminder ("this is the standard we hold
  ourselves to") as it is external positioning.
- It belongs in the Visual design system / branding work (see below) so it carries through
  consistently into every generated document (QC Certificates, Order Confirmations,
  customer-facing reports) — the same phrase, the same visual treatment, everywhere.
- **This is small enough to implement directly in the current `erp.html` immediately** —
  it doesn't need to wait for any phase of the rebuild. Add it now, in the next Claude Code
  session, as a literal task: bold tagline in the top bar, e.g. "Innotek Products — Provable
  Consistency" replacing or augmenting the current subtitle text.

### Full list of positioning levers (from PE-readiness discussion)

- **Audit-grade financial data** — the current flat ledger table needs to become real
  double-entry accounting (or a proper bridge to Tally/QuickBooks/NetSuite), with
  segregation of duties and an audit trail that survives a Big 4 review. Table stakes for
  being taken seriously in diligence, not a nice-to-have.
- **Batch-level true margin, not just batch-level production tracking** — tie existing
  yield/QC/cycle-time data to true landed cost and margin per batch/customer/grade. This is
  the difference between "good operational data" and "we know exactly which products and
  customers make us money" — the second is a concrete margin-expansion thesis.
- **Key-person risk reduction** — the Task Documents/SOP module (already flagged as a gap in
  `CLAUDE.md`) is a real valuation lever, not a nice-to-have: PE firms discount hard for
  founder-dependency. Documented, repeatable processes defend the multiple directly.
- **Formal cyber/compliance posture** — SOC2/ISO27001-type readiness as a real practice, not
  an afterthought. A homegrown stack with none of this is a technical-diligence red flag
  today, more so once handling US/EU colleague and customer data.
- **Non-China graphite sourcing as a surfaced narrative, not a buried fact** — China
  dominates global graphite processing and has already used export restrictions as
  geopolitical leverage. Sourcing from Tanzania/Mozambique/Madagascar and processing outside
  China is exactly the supply-chain resilience Western battery makers (and their PE backers)
  are being pushed, sometimes by regulation, to seek out. This data already exists in the
  Supplier Master — it just needs a live "supply chain resilience" view (geographic sourcing
  spread, redundancy per material) to become a visible feature instead of a buried fact.
- **EU Battery Regulation "Digital Product Passport" readiness** — a real, phasing-in
  compliance requirement for battery supply chains selling into Europe: structured
  provenance, carbon footprint, and material traceability data. A supplier whose ERP can
  generate exactly what a customer's digital product passport needs isn't just a supplier —
  it removes the customer's compliance problem for them. That's a switching-cost moat.
- **Customer concentration transparency, shown proactively** — PE diligence always digs for
  this; most companies get caught reconstructing it during diligence. Having it live in the
  dashboard (revenue by customer, by geography, trending toward diversification) signals
  operational maturity before anyone asks — a natural extension of the existing PO Dashboard.
- **Predictive maintenance as a quantifiable EBITDA lever** — unplanned downtime is one of
  the most directly quantifiable numbers in a PE underwriting model. "We reduced unplanned
  downtime by X%, worth ₹Y in recovered EBITDA" is a sentence that changes a term sheet. See
  the PlantConnect integration note below — this is more buildable than it sounds, because
  the data-capture hardware/software largely already exists in-house.

### Data capture roadmap — start easy, grow into the harder/higher-value data

**Tier 1 — nearly free, data already exists, just needs surfacing (do this early, even
before Phase 1 infrastructure work):**
- SPC/Cpk control charts from existing QC parameters (pH, carbon%, expansion, mesh,
  moisture) — pure computation on data already captured, no new data source needed.
- Supply chain resilience view from the existing Supplier Master (geographic sourcing
  spread) — a new chart on existing data.
- Customer concentration chart from existing Customer PO / Sales data — same idea.
- The "Provable Consistency" tagline itself — see above, implementable today.

**Tier 2 — requires new but straightforward data capture (near-term, Phase 0–1):**
- True landed cost per batch — link existing Purchase costs + labour/OT costs (already
  tracked in Attendance/Payroll) + an overhead allocation rule to each batch. A real but
  buildable data-model addition, not new hardware or new process.
- Start capturing SOP/process knowledge *as you go*, not as a separate documentation
  project — e.g., voice-to-text capture of a supervisor explaining a stage (the app already
  has voice quick-fill infrastructure for data entry; the same capture pattern extends
  naturally to capturing explanations, not just numbers) feeding directly into the Task
  Documents module as it's eventually built.

**Tier 3 — higher value, requires real integration work (Phase 2+):**
- Machine uptime/downtime and predictive maintenance data — via PlantConnect integration,
  see below.
- Environmental/ESG data (energy, water, waste per batch) — via PlantConnect EnviroConnect
  integration (see below), or manual per-shift capture as an interim step if integration
  isn't ready yet — even coarse, manually-logged energy/water figures per batch are better
  than none, and can be backfilled with real sensor data once integrated.
- Full chain-of-custody / Digital Product Passport-ready traceability — the natural
  end-state once batch-level cost, QC, sourcing, and environmental data are all already
  flowing into the same database; this becomes a reporting/export layer on top of data
  that's already there by this point, not a new data-capture project.
- Migration to real double-entry, audit-grade financial records.

### PlantConnect (Ascent Intellimation) integration — reminder for Claude Code

The person running this project has an existing relationship with **PlantConnect**, an
Industrial IoT (IIoT) platform from Ascent Intellimation Pvt. Ltd. (Pune, established 2007,
16+ years in industrial automation, ISO 9001-2015). Confirmed facts about the platform
(verified via web research, not assumed):

- **Hardware-neutral** — connects to PLC/controller/HMI/SCADA via an edge gateway called
  **DATCon**, which is explicitly built to support integration with third-party IIoT
  platforms — this is the natural integration point for this ERP.
- Relevant modules:
  - **PlantConnect RAMS** (Remote Asset Management System) — condition monitoring, asset
    performance, proper handling/maintenance monitoring, in real time. **This is the direct
    source for the predictive-maintenance/uptime-downtime EBITDA lever above** — the data
    capture largely already exists via this system, it needs to be pulled into the ERP, not
    built from scratch.
  - **EnviroConnect** — environmental data monitoring: stack emissions, ambient air quality,
    water quality, ETP/STP output quality. **This is the direct source for the ESG/Digital
    Product Passport data tier above** — genuinely important, since this was flagged as a
    "harder, later" data-capture tier assuming it needed new instrumentation; if
    EnviroConnect is already deployed or deployable, this tier becomes much closer to Tier 2
    than Tier 3.
  - **PlantConnect Insights** — historian and reporting framework for process plants; a
    second possible source of process-level time-series data beyond what the ERP itself
    captures (temperatures, pressures, run times at a machine level).

**Action for whoever builds this integration**: do not assume PlantConnect's API shape from
this document — get the actual integration/API documentation directly from Ascent
Intellimation before building. The general architectural approach: a scheduled connector job
in the FastAPI layer pulls data from PlantConnect's API/historian (likely via DATCon or a
direct PlantConnect Insights export), lands it in Postgres tables mapped to existing
machine/stage/batch records, and surfaces it in the ERP as machine uptime linked to specific
batches/stages (for the predictive-maintenance lever) and environmental readings linked to
specific processing runs (for ESG/traceability). This is additive to the existing data model,
not a redesign of it — worth keeping in mind when the Phase 1 schema is being designed, so
these integration points are easy to slot in later rather than requiring rework.

## Target stack

| Layer | Choice | Why |
|---|---|---|
| Local storage (every device) | SQLite via **Drift** | One local-storage technology across Android, iPhone, Windows, macOS — not a different hack per platform like today. |
| Sync engine | **ElectricSQL** (self-hostable) | Local SQLite ↔ central Postgres, automatic bidirectional sync, real conflict resolution. Replaces the hand-rolled `queueWrite()` retry-queue pattern. PowerSync is the fallback if a managed service is preferred over self-hosting this piece. |
| Central database | **PostgreSQL** | Real relational database — replaces Google Sheets as the source of truth. Short-term: managed host (Supabase / Neon / Render). Long-term: self-hosted on the office server (same Postgres, just relocated — not a rebuild). |
| API layer | **FastAPI (Python)** | Business logic beyond raw sync: PDF generation, payroll/OT math, QC statistics, and the natural home for AI-assisted features (predictive reorder, anomaly detection, natural-language reporting). |
| Frontend | **Flutter** | One codebase → real native apps on Android, iOS, Windows, macOS, and web. Avoids four separate platform-specific codebases. |
| Auth | JWT-based, role- and module-scoped | Replaces the current static role display table. Needed now that different global colleagues need different module access, not just "admin/manager/staff." |
| Edge / reverse proxy | **Cloudflare** (free tier) in front of the server | HTTPS, DDoS protection, and caching close to global users — softens latency for US/Europe access without needing real multi-region infrastructure yet. |
| Error tracking / observability | Sentry (or equivalent) | Not present at all today — a server-based system needs to be watched, unlike a static site. |

**On language choice — Python, decisively:** Java (typically via Spring Boot) is the more
traditional enterprise/manufacturing ERP choice, and worth naming as the alternative that
was considered — but Python is the right call here, not just an acceptable one, for a
reason bigger than team size: this entire roadmap is AI-forward (the AI layer, predictive
reorder, natural-language querying, anomaly detection — see below). That whole direction
lives natively in Python's ecosystem; bolting it onto a Java backend later means bridging
two ecosystems permanently, not a one-time cost. Python's data/reporting libraries (pandas,
etc.) also map directly onto the QC-statistics and payroll/OT calculations this ERP already
leans on heavily, and a small team iterates faster in Python's less ceremony-heavy syntax
today. This is the default going forward — not a placeholder decision waiting to be revisited.

**On frontend framework — Flutter, decisively:** React Native was the real alternative
considered — it draws from a larger hiring pool since JavaScript/TypeScript talent is more
common than Dart, and would be the natural choice if the frontend team ever grows
substantially. Flutter is the right call for now specifically because a small team benefits
more from fewer platform-specific edge cases (Flutter compiles to genuinely native
performance on all five targets — Android, iOS, Windows, macOS, web — from one codebase,
with fewer "works on iOS, breaks on Windows" surprises than React Native's bridge-based
architecture tends to produce). Same status as the language choice above: the default going
forward, not an open question, but revisitable if team composition changes meaningfully.

## Visual design system — Liquid Glass-inspired, applied deliberately

Apple's current design language (**Liquid Glass** — translucent, depth-layered, real-time
refraction and specular highlight material system, standard across iOS/iPadOS/macOS since
2025, mandatory for native apps from iOS 27 onward) is the right reference point for "feels
genuinely modern" — but it needs to be applied with real engineering thought, not just
copied for looks.

**Three things worth deciding deliberately, not defaulting into:**

1. **Flutter doesn't get this for free.** Unlike a native SwiftUI app (which inherits a lot
   automatically on recompile), a Flutter app needs its own custom "glass" component layer
   built deliberately — layered blur/translucency, depth-based elevation, adaptive contrast
   against whatever's behind a surface. Worth building this as a small internal design-system
   layer early (reusable card/surface/elevation components) even before the visual polish
   pass, so applying the actual glass styling later is a theming pass, not a rebuild.
2. **Legibility over aesthetics on operational screens.** Liquid Glass has drawn real,
   ongoing criticism even from Apple's own userbase for reduced readability in some contexts.
   For a factory-floor app — quick glances, gloved hands, bright shop-floor lighting, someone
   entering a batch number under time pressure — that tradeoff matters more than it does for
   a typical consumer app. Recommendation: use the glass aesthetic for chrome/navigation/
   dashboard-level surfaces where depth and polish genuinely help, but keep data-entry and
   shop-floor screens (the QCQA-style full-screen stage entry forms, attendance check-in)
   high-contrast and flat — legible first, glassy second. Also respect the OS-level "Reduce
   Transparency" accessibility setting rather than overriding it.
3. **One consistent look across platforms, not three native ones.** Flutter runs on Android
   and Windows too, where a literal Apple-glass look would clash with Material Design and
   Fluent conventions respectively. Recommendation: build one custom, Liquid-Glass-*inspired*
   visual identity (depth, translucency, adaptive materials as design principles) applied
   consistently everywhere, rather than trying to chase three different platform-native
   design languages. Gives the company one coherent brand feel globally, which matters more
   for a small team than platform-purity does.

This is still a **Phase 4 polish item** in terms of when the actual visuals get built — but
the underlying component structure (point 1) is worth setting up as part of the Flutter work
in Phase 1–2, so it isn't a rebuild later.

## Reports & document output layer — the outputs deserve the same bar as the app

Right now, every PDF this system produces (Order Confirmation, Dispatch Invoice, Purchase
Orders, CSV/PDF exports across every module) is generated via the browser's native
`window.print()` dialog. It works, but it's exactly the "20 years old" feeling applied to
your *outward-facing documents* — the things customers, vendors, and auditors actually see —
not just the app screens. This deserves deliberate design, not an afterthought.

**Target approach:**

1. **Server-side rendering, not browser print dialogs.** Move PDF generation into the
   FastAPI layer using a proper HTML/CSS-to-PDF engine (WeasyPrint, or headless-Chrome-based
   rendering via Playwright for more complex layouts). This gives pixel-perfect, consistent
   output regardless of what device or browser triggered it — a report generated from a
   phone should look identical to one generated from a laptop.
2. **One shared template/branding system, reused everywhere** — a single letterhead,
   typography, and color system defined once, applied to every document type: Order
   Confirmations, Dispatch Invoices/Packing Lists, QC Certificates, Purchase Orders, Payroll
   slips, and the exportable dashboard reports (the PO Progress Dashboard's PNG/PDF export
   already shows the right instinct — a proper branded, chart-rich export — this becomes the
   standard, not the exception). Update the letterhead once, every document updates.
   Consistent with the Visual design system section above — documents should feel like part
   of the same product family as the app, not a bolted-on export.
3. **Data visualization quality carried into printed output, not just on-screen.** The
   Chart.js-driven dashboards already look good live; the same visual quality (charts, not
   just tables) should appear in emailed/exported reports, not a downgrade to plain tables
   the moment something becomes a PDF.
4. **Scheduled, auto-generated, properly designed reports** — the current WhatsApp daily
   digest (`shareDailyDigest()`) is a good instinct (proactive, not pulled) but is plain
   text. Target: the same proactive daily/weekly summary, generated on schedule by the
   backend, delivered as an actual designed document (email with an embedded or attached
   report) — not just a text message.
5. **Multi-currency formatting already exists (INR/USD/EUR on Customer PO) — extend it
   properly into every generated document**, not just the on-screen tables: correct currency
   symbols, correct number formatting conventions (comma/decimal placement differs between
   Indian and Western number formatting) per the document's actual currency, every time.

**Phasing**: the template/branding system (point 2) is worth establishing early — as soon as
the FastAPI layer exists in Phase 1 — since every module's PDFs can then be built against it
from the start, rather than retrofitting a shared design onto documents built independently
per module, which is exactly how the current system ended up with inconsistent exports.

## Hardware & peripheral integration layer

The current system already gestures at real factory hardware but never followed through:
`erp.html`'s face-recognition attendance module explicitly has a `FACE_SOURCE` slot
commented as "planned: MI 360 CCTV auto-detection" that was never built past phone-camera
capture. Going global and modern is also an opportunity to properly formalize the hardware
layer this kind of factory ERP genuinely needs:

- **CCTV-based auto face-detection** — the upgrade path already named in the current code;
  becomes realistic once there's a real backend (Phase 2+) to stream/process camera feeds
  against, rather than a browser tab holding a webcam open.
- **Weighbridge integration** — NFG/raw material receiving already references weighbridge
  weighing manually; a real integration (serial/network-connected weighbridge feeding weight
  directly into a GRN) removes manual re-entry and transcription error at the point goods
  arrive.
- **Barcode/QR + thermal label printing** — for batch tracking, GRN tagging, and dispatch
  labeling. Currently everything is typed/manual; scan-to-identify and print-on-dispatch are
  standard in modern manufacturing ERPs and meaningfully reduce floor-level data entry error.
- **Gate Pass ANPR (automatic number-plate recognition)** — a natural extension of the
  already-built Gate Pass vehicle log, recognizing plates on entry/exit instead of manual
  typing, if camera hardware is already at the gate.

None of this is a Phase 1 requirement — it depends on the real backend existing first — but
it's worth designing the data model (Phase 1–2) so these integrations are additive later
(a new data source feeding existing tables) rather than requiring schema changes to bolt on.

## Localization readiness for a genuinely global team

Multi-currency already exists partially (INR/USD/EUR on Customer PO) — worth extending
consistently everywhere per the Reports section above. **Multi-language does not exist at
all today**, and is worth a decision now rather than by accident: the recommendation is not
to translate the UI into multiple languages immediately (adds real ongoing maintenance for
a small team), but to build the Flutter app with proper internationalization (i18n)
structure from day one — no hardcoded UI strings, all text routed through a translation
layer even if only English is populated initially. This makes adding a second language
later (if a region genuinely needs it) a translation task, not an engineering one. Number,
date, and currency formatting should already respect locale conventions per the Timezone
and Reports sections above, regardless of whether UI text itself is translated yet.

## Self-host vs. cloud — the actual plan

**The laptop is the first server.** Before any cloud or office-server hosting, the entire
target stack (Postgres + FastAPI + ElectricSQL) runs locally on the laptop via Docker
Compose — one command, all pieces up together, zero cost, zero internet exposure. This is
where schemas get shaped, workflows get tested, and mistakes get made cheaply, in the same
place the code is being written (alongside Claude Code).

This also lets the **local-first sync experience itself be validated for real**, not just
assumed: with the laptop and a phone on the same WiFi, the Flutter app can sync against the
laptop's local server over the local network. That proves out the actual thing that matters
— does offline-first sync feel instant and correct — before any hosting decision is made at all.

**Known limitation of this phase**: laptop-hosted means local-network only. US/Europe
colleagues cannot reach it, and that's fine — this phase is about proving the system to
yourself first, not about remote access yet. Two practical care-abouts while running this
way: keep the laptop from sleeping during a test session, and periodically `pg_dump` the
local Postgres data as backup insurance (a laptop can die or get stolen; a cloud/office
server can't disappear the same way).

**Moving off the laptop later is a redeploy, not a rewrite** — same Docker Compose
containers, just relocated. Move to cloud (Supabase/Neon/Render-style managed Postgres) or
straight to the office server, whichever is ready first, at the point remote colleagues
actually need access — not before.

**Global access implication (once past the laptop phase)**: a single-location server is fine
*because* of the local-first architecture — US/Europe colleagues work against their own
local SQLite copy and sync in the background, so they are not blocked waiting on
round-trips to India (or wherever the server ends up) on every interaction. Cloudflare in
front absorbs the rest. Only revisit true multi-region infrastructure (e.g., read replicas
per region) if usage/scale later demands it — not a day-one requirement.

**If/when this lands on the office server specifically**: that server already hosts a
different company's ERP. Innotek's stack must run in its own isolated Docker
containers/network with its own database — never sharing credentials, a database instance,
or a network namespace with the other company's system. This is a one-time setup decision
(get it right when first deploying there) rather than something to retrofit after the fact,
and it matters regardless of how much you personally trust the other system — separate
businesses' data shouldn't share infrastructure boundaries by accident.

## Compliance flag — do not silently engineer around this

The Attendance module uses **face recognition** — biometric data. Once there is a real EU
presence, this is specially regulated under GDPR (consent, storage limits, deletion rights),
and increasingly regulated elsewhere too. **Get real legal/compliance advice on this before
global rollout of that specific module** — this is flagged here so it isn't missed, not
something to architect a workaround for unilaterally.

## Timezone rule — non-negotiable, given prior bugs

Every timestamp is stored in **UTC** in the database. Conversion to local time happens only
at display time, per the viewing user's timezone. The current codebase has already had real
bugs from timezone-naive date handling (see `CLAUDE.md` → Known hard-won bugs) — with a
genuinely global team, a timezone bug is a payroll/compliance problem, not a cosmetic one.
Every new module must follow this from day one; do not port the old `new Date()` patterns forward.

## AI layer — proactive alerts, not just chat-style Q&A

This is more than "add a chatbot." The current dashboard already has the right instinct —
`erp.html`'s exception-first alerts timeline surfaces overdue batches, critical stock, and
pending approvals instead of a wall of undifferentiated data. The AI layer's job is to make
that pattern smarter, proactive, and properly urgent-looking, not to replace it.

**Three concrete pieces, all living in the FastAPI layer:**

1. **Proactive, auto-generated prompts** — not just "stock is low," but a system that
   notices patterns and says so in plain language: "Reorder RM-001 now — at current
   consumption rate you run out in 4 days, and the vendor's last 3 deliveries took 6."
   This needs consumption-rate history to reason over, which is itself a good argument for
   moving off Sheets sooner rather than later — this kind of trend analysis is painful
   against a spreadsheet and natural against a real database.
2. **Escalating visual urgency, not a flat alert list** — a batch that's 1 day overdue and
   one that's 10 days overdue should not look the same. Tiered visual states (e.g. amber →
   red → pulsing/animated red for "needs attention right now") on both the dashboard and as
   push notifications, reusing the same real-time delivery mechanism already built for Gate
   Pass's host-approval doorbell — the infrastructure for "ping someone the instant something
   needs attention" already exists in this project, this is applying it more broadly.
3. **Natural-language querying** — "show me every batch that missed its planned date this
   month" or "which customers have unpaid POs over 30 days" answered directly, without
   needing to know which module/tab holds that data. Straightforward once data lives in a
   real queryable database rather than scattered Sheets.

**Where this fits in the phasing**: the *infrastructure* for this (real database, real-time
push channel) should exist by Phase 2 as a side effect of the migration itself — no extra
work required to enable it later. The AI features themselves are still realistically a
Phase 4 polish item, but they should be designed with the data model from Phase 1 onward
(e.g. don't discard historical consumption/timing data — the AI layer needs history to be
useful, and that's much easier to keep from day one than to backfill later).

## Agentic Layer — agents that do work, not just flag it

**This is a distinct layer from the AI layer above, not a restatement of it.** The AI layer
surfaces insight (alerts, natural-language answers). An **agent** goes a step further: it
performs a defined piece of work — drafts a document, prepares a PO for approval, compiles a
report — on a schedule or trigger, so a human reviews/approves a finished draft instead of
starting from a blank page. This section is also a **standing practice, not a one-time
list**: as more real data and infrastructure comes online (PlantConnect integration, the
real database, the AI layer itself), new agent candidates should keep getting proposed —
Claude should suggest 2–3 new candidates periodically as sessions progress and new data
sources exist, rather than treating the list below as final.

### Non-negotiable principle: draft-and-approve, not blind-execute

Any agent touching money, customers, investors, or anything externally visible **drafts for
human review and explicit approval before anything is sent or executed** — it does not act
autonomously on those categories. Purely internal, low-stakes drafting (e.g., flagging a
QC trend for a supervisor to look at) can be more autonomous. This distinction matters more,
not less, as the system gets more capable — the goal is removing blank-page effort, not
removing human judgment from anything that leaves the building or touches a bank account.

### Flagship agent: Bi-Weekly Investor Report

**This is needed now, for current investors — it should not wait for the multi-month
rebuild.** Recommended phased approach:

- **Near-term (usable within days, against the current system)**: a templated report —
  built once using the branding/document system described in "Reports & document output
  layer" above — populated by pulling the same numbers already visible on the Dashboard and
  PO Progress Dashboard today (revenue/order pipeline, production output, cash position,
  customer concentration). Someone (founder or whoever's delegated) fills it on a two-week
  cadence to start. Even semi-manual, this gets a properly designed, consistent report to
  investors immediately rather than waiting on infrastructure.
- **Mid-term (once the FastAPI/Postgres layer exists, Phase 1–2)**: the report auto-compiles
  from live data on schedule — draft generated automatically every two weeks, still reviewed
  and approved by the founder before sending, per the draft-and-approve principle above.
- **Content, once mature**: revenue and order pipeline, production output, QC consistency
  metrics (Cpk scores — directly ties to the "Provable Consistency" positioning above, and is
  exactly the kind of metric investors want to see trending in the right direction), customer
  concentration trend, cash position, and notable operational events — the same underlying
  data this document already identifies as PE-readiness levers, now serving current investor
  relations as a second, immediate use of the same data instead of a separate effort.

### Other agent candidates worth building as infrastructure allows

- **Reorder/procurement agent** — goes beyond the AI layer's "stock is low" prompt to
  actually draft the indent/PO itself (vendor, quantity, reasoning) for one-click approval,
  using the existing Indent → PO flow already in the ERP.
- **QC drift agent** — watches incoming QC parameters against the Cpk/control-chart baseline
  (see Provable Consistency above) and drafts an alert to the relevant supervisor when a
  process starts drifting, before it produces an actual out-of-spec batch.
- **Receivables follow-up agent** — drafts polite payment-reminder messages for overdue
  Customer PO balances, reusing the WhatsApp-card pattern already built elsewhere in the ERP,
  queued for a human to review and send rather than sent automatically.
- **Payroll exception agent** — flags unusual attendance/OT patterns for review before a
  payroll run processes them, catching costly errors before money moves rather than after.
- **Predictive maintenance agent** — once PlantConnect integration (above) is live, drafts a
  maintenance recommendation from real uptime/downtime trends rather than waiting for a
  breakdown.

## Migration Framework — how "tested on laptop" actually becomes "globally error-free"

The Phased migration section below describes *what* gets built when. This section is the
missing *how*: the concrete environments, testing discipline, and rollout gates that turn
"I tried it on my laptop and it seemed fine" into something safe to hand to a colleague in
Boston who has no way to tell you something's subtly wrong. Skipping this is how "seemed to
work in testing" becomes a production incident for someone in a different timezone.

### Three real environments, not two

- **Local (laptop)** — Phase 1 as already planned. Development and first correctness checks.
  Proves the code works. Does **not** prove it works over real internet, real latency, or
  for someone who isn't you.
- **Staging** — a small, cheap cloud deployment (or the office server, once available) that
  mirrors production but is used by nobody except you and one willing pilot colleague. This
  environment did not exist in the original phase plan and needs to — it's the only place
  that actually tests "does this work for someone far away over real internet," which a
  same-WiFi laptop-and-phone test cannot answer.
- **Production** — where the rest of the team and, eventually, customer-facing features
  live. Nothing reaches production without having passed through staging with a real pilot
  user first.

### Testing discipline — write it as you port each module, not after

For every module migrated off Sheets/GAS:
- **Automated tests, not just manual clicking** — unit tests for calculation logic (payroll/
  OT math, batch yield, Cpk calculations — anything with a "right answer" that a human
  might silently get wrong) and integration tests for the sync engine itself (does a write
  made offline actually arrive correctly once back online, does a conflict resolve the way
  it's supposed to). Written alongside the module, not bolted on afterward.
- **Parallel-run reconciliation** — for a defined period (recommend minimum 2 weeks of real
  daily use) after a module is ported, the old Sheets-based numbers and the new Postgres-
  based numbers are automatically diffed daily. Any discrepancy is a bug to find, not a
  rounding error to shrug off. Only once a module runs with zero unexplained discrepancies
  for the full window does it get treated as the source of truth — the old system stays live
  and authoritative until then, not just as a vague safety net but as an active check.
- **CI/CD, not manual builds** — GitHub Actions (or equivalent) running automated tests on
  every commit, and automated multi-platform Flutter builds (Android/iOS/Windows/macOS) so
  releases are reproducible and don't depend on remembering the right manual steps.

### The pilot-user gate — this is what actually proves "globally error-free"

Before any module is considered ready for the whole team, it runs in staging for **one real
remote colleague** (a genuine US or Europe-based person, on their actual internet connection,
their actual device) for a defined trial period, with explicit instruction to try to break
it and report anything that feels wrong — not just "does it technically load." This is the
one step that actually tests the thing "globally error-free" means; a laptop-and-phone test
on the same home WiFi cannot substitute for it, no matter how well that test goes.

### Staged rollout, not a hard switch

Once past the pilot gate, roll a module out by **feature flag** — enabled per-user or
per-region — rather than flipping it on for everyone simultaneously. A bug caught this way
affects a handful of people who know they're on the new system and are watching for issues,
not the entire global team on a random Tuesday.

### Monitoring and rollback — both need to be real, not assumed

- Sentry (already in the Target stack table above) needs to be genuinely wired up and
  watched — alerts should reach the person responsible before a user has to report an error,
  not sit unread in a dashboard.
- Every module keeps a defined rollback path back to its Sheets/GAS equivalent for as long
  as that old module still exists in parallel (see Phase 3) — "we can always go back to the
  old way for this one module" should be a real, tested capability during the transition
  period, not a theoretical one.

### Per-phase acceptance criteria — replace "confident" with a checklist

A module only advances from Phase 1 (laptop) → Phase 2 (staging) → team-wide production when
all of the following are actually true, not just "felt ready":
1. Automated tests pass, including the calculation/sync tests above.
2. Two weeks of zero-unexplained-discrepancy parallel-run reconciliation against the old
   system.
3. A real remote pilot user has used it for its intended trial period with no unresolved
   issues.
4. Monitoring is live and has been watched, not just installed.
5. A tested rollback path exists.

## Phased migration (strangler-fig pattern — never a big-bang cutover)

- **Phase 0 (current)**: Stabilize what exists — recover/verify the Stations/Safety/
  Receiving-Ops/Roster work, finish Sales/PO reconciliation, confirm Gate Pass and PO
  Dashboard are properly linked in. See `CLAUDE.md` → Known gaps for the current list
  (check it against the real files first — it may be stale). The current system keeps
  running the business throughout every phase below.
- **Phase 1 — laptop-as-server**: Stand up Postgres + FastAPI + ElectricSQL entirely on the
  laptop via Docker Compose, alongside the existing HTML/Sheets system (not replacing it
  yet). Migrate **one module** end-to-end — start with **Inventory** (most relational,
  clearest win from a real database). Build the first Flutter screens for that module
  against this local backend, with the automated tests described in the Migration Framework
  above written alongside it. Test the local-first sync experience across laptop + phone on
  the same network. Nothing here touches the internet or costs anything.
- **Phase 2 — staging, then the pilot-user gate**: redeploy the same Docker Compose stack to
  a cheap staging environment (managed cloud host or the office server, whichever is ready).
  Run parallel-run reconciliation against Sheets for at least two weeks. Bring in **one real
  remote (US or Europe) pilot colleague** to actually use the module over real internet — do
  not skip this step even if staging "seems fine" locally. Only once the full acceptance
  checklist above is met does this module go to the rest of the team, via feature flag, not
  a hard cutover.
- **Phase 3**: Repeat module by module — Production, Finance, Sales, Attendance (flagging
  the compliance item above before that one goes live for global users) — each one passing
  through the same staging → pilot → staged-rollout gate, not just copying the pattern
  loosely. Continue until nothing depends on Sheets/GAS.
- **Phase 4**: Retire the old HTML/GAS stack. Full UI/design polish pass (see "Visual design
  system" above). Build out the AI layer properly (see "AI layer" above), the reports/
  document output layer (see "Reports & document output layer" above), and any hardware
  integrations that are ready (see "Hardware & peripheral integration layer" above) — the
  infrastructure for all of these should already be in place from Phase 1–2, this is where
  the actual features get built.
- **Not a phase-1/2 item**: true spatial computing (Vision Pro-style apps). Realistic
  "someday, once everything else is solid" territory — not part of this roadmap's near-term scope.

## Operational reality worth budgeting for now, not discovering later

Past Phase 1, this stops being a solo-founder-plus-AI-assistant project in the way the HTML
version was — it becomes a real hosted server with real operational responsibilities: backups,
uptime monitoring, security patching, and someone on call if it breaks mid-shift. Either budget
for a part-time developer/DevOps person once Phase 1 is underway, or lean on managed platforms
(Supabase/Render-style hosting) to absorb as much of that operational burden as possible for
as long as feasible.
