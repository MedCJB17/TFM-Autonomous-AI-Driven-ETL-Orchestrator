# Spain Summer Health & Climate Intelligence Platform

**Master Thesis (TFM) — Master in Big Data Analytics, UC3M**
**Autonomous, AI-Driven ETL Orchestrator**
Cristine Joy Bumatay Mediona — Supervisor: Jesús Carretero Pérez

---

## What this is

An autonomous pipeline that ingests daily weather, marine, and air quality
data for Madrid, cleans it using an LLM (Groq / LLaMA 3.3 70B), computes a
composite Health Risk Score, detects anomalies, forecasts day-ahead
conditions, and serves the results through a live React dashboard —
running entirely on free-tier infrastructure with no human intervention
after setup.

This repository contains the **implementation artifacts** referenced in
the thesis document: the two n8n workflows, the React dashboard, and the
BigQuery schema. 


The thesis document (submitted separately) contains full architecture diagrams,
screenshots of every dashboard tab, and complete code listings with
explanation (Chapters 3 and 4). This repository is provided as
supplementary evidence that the system described in the thesis is real,
working code, not just a design document.

**If you'd like to run it yourself**, see "Running the project" below.
The fastest way to see it working without setting up your own BigQuery/n8n
infrastructure is to look at:
- `n8n-workflows/tfm-pipeline.json` and `tfm-api.json` — open these
  directly in a text editor, or import into a free n8n instance
  (n8n.io/cloud has a free tier) to inspect the visual workflow.
- `dashboard/src/App.jsx` — the complete dashboard source, readable
  without running anything.
- `docs/architecture.md` — a condensed version of the thesis's
  architecture chapter, for a quick technical overview.

## Repository structure

```
.
├── dashboard/              React dashboard (Vite + Recharts)
│   ├── src/App.jsx
│   └── package.json
├── n8n-workflows/          Exported n8n workflow JSON
│   ├── tfm-pipeline.json   Daily ETL pipeline (28 nodes)
│   └── tfm-api.json        Webhook API serving the dashboard
├── docs/
│   ├── architecture.md     Architecture overview + key implementation findings
│   └── bigquery-schema.sql Table creation SQL
└── README.md               This file
```

## Running the project

Full autonomous operation requires three free-tier accounts: n8n
(self-hosted or cloud), Google Cloud (BigQuery), and Groq (LLM API).

### 1. n8n workflows

1. Start n8n — either self-hosted via Docker:
   ```bash
   docker run -it --rm -p 5678:5678 n8nio/n8n
   ```
   or use n8n.io's free cloud tier (no Docker needed).
2. In the n8n editor, import both files from `n8n-workflows/`
   (Menu → Import from File).
3. Add a Groq API key ([console.groq.com](https://console.groq.com), free)
   as a manual `Authorization: Bearer` header on the four Groq-calling
   HTTP Request nodes (`Clean Weather`, `Clean Marine`, `Clean Air`,
   `Generate Briefing`) — see `docs/architecture.md` for why this can't
   use n8n's built-in Groq credential type.
4. Create a Google Cloud project with BigQuery enabled, add a service
   account credential to every BigQuery node.
5. Run the SQL in `docs/bigquery-schema.sql` to create the required tables.
6. Activate both workflows.

### 2. Dashboard

```bash
cd dashboard
npm install
```

Open `src/App.jsx` and set `WEBHOOK_URL` to your TFM API's production
webhook URL (defaults to `http://localhost:5678/webhook/health-data` for
local n8n).

```bash
npm run dev
```

Open the printed local URL (typically `http://localhost:5173`).

**Note:** the dashboard is a thin client — it displays whatever the TFM
API returns and computes nothing itself. If the n8n workflows above
aren't running and populated with data, the dashboard will show an error
state rather than data, by design (see `docs/architecture.md` for the
error-handling approach).

