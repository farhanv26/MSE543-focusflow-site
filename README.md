# FlowForge – Smart Workflow Automation

A **consumer-facing web app** that demonstrates AI-assisted process automation. Build automations (trigger → conditions → actions), run them, and view outcomes in a dashboard and activity log. Built as a **static single-page app** with **hash routing** and **localStorage** as the database—no backend required, works offline once loaded.

## How to run

1. **Open directly in the browser**  
   Open `index.html` in Chrome, Firefox, or Safari.  
   Routes use the hash: e.g. `file:///path/to/index.html#/dashboard`.

2. **Local server (recommended)**  
   From the project root:
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
   Navigate to `http://127.0.0.1:5500/index.html#/dashboard` (or the port shown).

## Tech stack

- **Vanilla HTML, CSS, JavaScript** (no frameworks)
- **Hash routing**: `#/dashboard`, `#/automations`, `#/builder`, `#/builder/:id`, `#/runs`, `#/templates`, `#/case-study`, `#/settings`
- **localStorage** for automations, runs, and user settings
- **Offline-ready**: open the app once, then it works without a network

## File structure

| File          | Purpose |
|---------------|--------|
| `index.html`  | SPA shell: header, sidebar, main content area |
| `app.js`      | Hash routing and page renderers (Dashboard, Automations, Builder, Runs, Templates, Settings) |
| `storage.js`  | localStorage CRUD: automations, runs, user, templates import, seed/reset |
| `ai.js`       | Simulated AI: suggest next step, generate reply, classify, summarize, dashboard insights, simulate run |
| `components.js` | Shared UI: toasts, modal, badges, form helpers, copyToClipboard, downloadFile |
| `style.css`   | App layout, pages, and components |

## Features

- **Dashboard**: Active automations count, runs today, time-saved estimate, success rate, 7-day bar chart, AI insights.
- **Automations**: List from localStorage; create, rename, duplicate, delete; Active/Paused toggle; search and filter by trigger.
- **Builder**: Trigger (Schedule, Email received, Form submitted, Purchase made) → Conditions → Actions (Send email, Create task, Summarize, Classify, Generate reply, Log expense). Add/remove/reorder steps; “Suggest next step (AI)”; “Test automation” runs a simulated execution and adds a run record.
- **Runs**: Table of run history; “View details” opens a modal with step-by-step trace and AI outputs.
- **Templates**: 6–10 one-click templates (e.g. Auto-reply to landlords, Receipts → expense log, Support triage); import adds a Paused automation.
- **Settings**: Profile (name, email), notification/privacy toggles, **Governance**: Tone (Professional / Friendly / Direct), Risk level (Low / Medium / High), Mask PII in logs; “Reset demo data”.
- **Case Study** (`#/case-study`): Client-ready page with Problem, Solution, Architecture, Impact (from real data), Governance & Risk, Rollout Plan. **Generate Executive Summary** uses AI to produce a data-driven summary; copy to clipboard.
- **Builder**: **Test Input (Payload)** section varies by trigger (Schedule: date/time, timezone; Email: from, subject, body; Form: form name + JSON; Purchase: vendor, amount, items, notes). Payload is stored on the automation and passed into test runs so AI outputs reflect it. **Export Automation JSON** downloads the current automation.
- **Runs**: In run details modal: **Feedback** (👍 Helpful / 👎 Not helpful / Flag) stored on the run; **Export Run Report** downloads a .txt summary (AI outputs are already masked in storage if Mask PII was on at run time).
- **Dashboard**: **Quality** widget shows Helpful rate (up / (up+down)), Flag count, and “Top issue: Review flagged runs” when flags exist.

## Consulting features

- **Case Study page**: One-page client narrative (Problem, Solution, Architecture, Impact, Governance & Risk, 30/60/90 Rollout). Impact metrics are derived from current localStorage (runs, success rate, minutes saved). “Generate Executive Summary” produces a consulting-style summary from automations, runs, and settings; copy to clipboard.
- **Governance controls** (Settings): Tone and Risk level influence AI outputs; Mask PII in logs redacts emails and phone numbers in run records and in exports.
- **Feedback loop**: Run details modal records Helpful / Not helpful / Flag; Dashboard Quality widget shows helpful rate and flag count.
- **Exports**: Builder → “Export Automation JSON”; Run details → “Export Run Report” (.txt with step trace and AI outputs, masked if setting was on).

## Demo script (2 minutes)

1. Open `#/dashboard` — note metrics and AI Insights; check Quality widget after giving feedback on a run.
2. Go to **Case Study** — skim sections, click **Generate Executive Summary**, then **Copy to clipboard**.
3. Go to **Builder** — pick trigger “Email received”, add an action “Classify request”, fill **Test Input (Payload)** (From, Subject, Body), click **Test automation**; go to **Runs** and open **View details** to see payload-driven AI output.
4. In **Runs** details, click **👍 Helpful** or **Flag**, then **Export Run Report**.
5. **Settings** — set Tone to Direct, turn on **Mask PII in logs**, run another test from Builder; confirm run details show redacted content.

On first load, if onboarding hasn’t been completed, a welcome modal appears. Two sample automations are seeded when the app has no data.

## Interview Demo

For a structured walkthrough in demos or interviews:

1. **Demo Mode**  
   In **Settings**, turn on **Demo Mode**. A **Guided Demo** button appears in the header on all routes.

2. **Guided Demo (step-by-step)**  
   Click **Guided Demo** to open a modal with five steps. Use **Next** / **Back** to move, or **Go to step** to jump to the route and highlight the relevant UI:
   - **Step 1 – Dashboard**: Quality widget (helpful rate, flags).
   - **Step 2 – Case Study**: Generate Executive Summary; **Export Client Summary (.txt)** for a full report (exec summary, key metrics, governance settings).
   - **Step 3 – Builder**: Email trigger is auto-selected and a sample payload (from, subject, body) is prefilled; run a test to create a run.
   - **Step 4 – Runs**: Open the latest run, leave feedback, and **Export Run Report**.
   - **Step 5 – Settings**: Toggle Mask PII and change Tone; re-run a test to see masked output and tone in run details.

3. **Command palette (Ctrl+K / Cmd+K)**  
   Press **Ctrl+K** (Windows/Linux) or **Cmd+K** (Mac) to open a searchable command palette. Actions: Go Dashboard, Go Automations, Go Builder, Go Runs, Go Case Study, Import Template (opens Templates), Toggle Mask PII, Toggle Demo Mode. Type to filter, Enter or click to run.

4. **Case Study export**  
   On the Case Study page, **Export Client Summary (.txt)** downloads a single file with the AI executive summary, key metrics (automations, runs, success rate, minutes saved, helpful rate, flags), and governance settings (tone, risk level, mask PII, demo mode).

## License

MIT.
