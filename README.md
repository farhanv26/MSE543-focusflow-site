# FlowForge – AI-Assisted Workflow Automation

**Deloitte-ready, consumer-facing SPA** for building and running AI-assisted automations. FlowForge is the app: create automations (Trigger → Conditions → Actions), use simulated AI to suggest steps and generate outputs, test with realistic payloads, view run history with step trace and feedback, and apply governance controls. Built with **vanilla HTML/CSS/JS**, **hash routing**, and **localStorage**—no backend, no frameworks. Runs in-browser via Live Server or a static HTTP server.

---

## How to run

1. **Open `index.html` in a browser**  
   File path or `file:///.../index.html`. Use hash routes, e.g. `#/dashboard`.

2. **Local HTTP server (recommended)**  
   ```bash
   python3 -m http.server 8080
   ```
   Then open: `http://localhost:8080/#/dashboard`

   Or with Node:
   ```bash
   npx serve .
   ```
   Then open the URL shown (e.g. `http://localhost:3000/#/dashboard`).

3. **VS Code Live Server**  
   Right-click `index.html` → “Open with Live Server”.  
   Go to the URL shown (e.g. `http://127.0.0.1:5500/index.html#/dashboard`).

Everything works offline after the first load. No build step.

---

## Routes

| Hash route | Page |
|------------|------|
| `#/dashboard` | Dashboard: metrics, 7-day chart, AI Insights, Quality widget |
| `#/automations` | List automations; search, filter, create, duplicate, delete, status toggle |
| `#/builder` | Create new automation |
| `#/builder/:id` | Edit automation by id |
| `#/runs` | Run history table; view details, feedback, export report |
| `#/templates` | 8 templates; 1-click import (creates paused automation) |
| `#/case-study` | Consulting case study + Generate Executive Summary + Export Client Summary |
| `#/settings` | Profile, preferences, governance, Demo Mode, Reset demo data |

---

## Tech stack

- **Vanilla HTML, CSS, JavaScript** (no frameworks or external libraries)
- **Hash routing**: single `index.html` shell; all navigation via `#/...`
- **localStorage**: automations, runs, user settings, onboarding flag
- **Simulated AI** in `ai.js`: deterministic, template-based outputs (suggest step, classify, summarize, reply, insights, simulate run, executive summary)

---

## File structure

| File | Purpose |
|------|--------|
| `index.html` | App shell: header (logo + nav + Guided Demo when Demo Mode on), sidebar, `<main id="main">` |
| `app.js` | Hash router; renderers for all pages; Guided Demo; Command Palette (Ctrl/Cmd+K) |
| `storage.js` | localStorage CRUD: automations, runs, user, onboarding, seed, reset, templates |
| `ai.js` | suggestNextStep, classifyRequest, summarizeText, generateReply, getDashboardInsights, simulateRun, generateExecutiveSummary, maskPII |
| `components.js` | toast, modal, badge, escapeHtml, copyToClipboard, downloadFile, commandPalette |
| `style.css` | Layout, cards, tables, forms, buttons, badges, modals, toasts, responsive |

---

## Consulting features

- **Case Study** (`#/case-study`): Problem, Solution, Architecture, Impact (from real data), Governance & Risk, 30/60/90 Rollout. **Generate Executive Summary** (AI, copy to clipboard). **Export Client Summary (.txt)**: executive summary + key metrics + governance settings.
- **Governance** (Settings): Tone (Professional / Friendly / Direct), Risk level (Low / Medium / High), **Mask PII in logs** (redacts emails/phones in run records and exports).
- **Quality loop**: Run details → 👍 Helpful / 👎 Not helpful / Flag; Dashboard **Quality** widget (helpful rate, flag count, “Review flagged runs”).
- **Exports**: Builder → **Export Automation JSON**; Run details → **Export Run Report** (.txt); Case Study → **Export Client Summary** (.txt).
- **Demo Mode** (Settings): When on, **Guided Demo** button in header; step-by-step walkthrough with “Go to step” deep links (Dashboard → Case Study → Builder with prefilled payload → Runs → Settings).
- **Command Palette**: **Ctrl+K** / **Cmd+K** → searchable actions: Go Dashboard, Go Automations, Go Builder, Go Runs, Go Templates, Go Case Study, Toggle Mask PII, Toggle Demo Mode, Reset Demo Data (with confirm).

---

## 2-minute demo script

1. **Dashboard** (`#/dashboard`)  
   Note: Active automations, Runs today, Time saved (est.), Success rate, 7-day chart, AI Insights, Quality widget.

2. **Case Study** (`#/case-study`)  
   Skim sections. Click **Generate Executive Summary** → **Copy to clipboard**. Click **Export Client Summary (.txt)** → file downloads.

3. **Builder** (`#/builder`)  
   Set trigger “Email received”. Add action “Classify request”. Fill **Test Input (Payload)**: From, Subject, Body. Click **Test automation** → toast → redirect to Runs.

4. **Runs** (`#/runs`)  
   Open latest run **View details**. See step trace and AI outputs. Click **👍 Helpful** or **Flag**. Click **Export Run Report** → .txt downloads.

5. **Settings** (`#/settings`)  
   Set Tone to **Direct**. Turn on **Mask PII in logs**. Turn on **Demo Mode** → header shows **Guided Demo**. Use **Reset demo data** to reseed 2 automations and sample runs.

6. **Keyboard**  
   Press **Ctrl+K** (Windows/Linux) or **Cmd+K** (Mac) → Command Palette → type “mask” or “demo” or “dashboard” → Enter to run action.

---

## Data shapes (localStorage)

- **Automation**: `id`, `name`, `status` ('active'|'paused'), `trigger` (type, config), `conditions` (field, operator, value), `actions` (type, config), `testPayload`, `createdAt`, `updatedAt`
- **Run**: `runId`, `automationId`, `automationName`, `timestamp`, `status` ('success'|'failed'), `durationMs`, `triggerType`, `payloadUsed`, `stepTrace` ([{ stepType, label, input, output, aiOutput }]), `feedback` ('up'|'down'|'flag'|null)
- **User**: `name`, `email`, `notifications`, `privacy` / `privacyShareAnalytics`, `tone`, `riskLevel`, `maskPIIInLogs`, `demoMode`

Older runs may have `stepsExecuted`; the app normalizes to `stepTrace` for display and export.

---

## License

MIT.
