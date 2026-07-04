# Architecture

## Data flow

```
Open-Meteo (weather / marine / air quality)
        │
        ▼
   n8n: TFM workflow (daily, 07:00 Europe/Madrid)
   ├─ Fetch → Check Exists → Prepare → Clean (Groq LLaMA 3.3 70B) →
   │  Parse → Filter New Dates → Save   (× weather, marine, air quality)
   └─ Check Existing Scores → Compute Health Score → Save →
      Detect Anomalies → Save → Predict Tomorrow → Save →
      Prepare Briefing → Generate Briefing (Groq) → Save → Email Alert
        │
        ▼
   Google BigQuery (tfm-dataflow, europe-west9)
   ├─ raw_data: weather_daily, marine_daily, air_quality_daily
   └─ analytics: health_score, anomaly_log, predictions, daily_briefing
        │
        ▼
   n8n: TFM API workflow (on-demand, GET /webhook/health-data)
   Webhook → 6 sequential BigQuery reads → 2 live Open-Meteo forecast
   fetches → Merge (dedupe + build 7-day live forecast) →
   Respond to Webhook
        │
        ▼
   React dashboard (polls every hour, 5 tabs)
```

## Key architectural decisions

- **Sequential over parallel branches.** n8n's self-hosted Docker
  configuration does not share execution context across parallel branches;
  `$('NodeName').all()` in a Code node fails with `Node has not been
  executed` if the referenced node is a parallel sibling rather than an
  upstream node in the same chain. Both workflows are single linear chains
  for this reason.
- **Manual Groq authentication.** n8n's built-in Groq credential type does
  not pass the API key correctly in self-hosted Docker. All four
  Groq-calling nodes use HTTP Request with Authentication = None and a
  manual `Authorization: Bearer` header instead.
- **`Execute Once` on TFM API's BigQuery nodes.** Without it, a node
  downstream of a multi-row result re-executes once per row rather than
  once per webhook call, multiplying query count and duplicating entries
  in the JSON response.
- **Timestamp-based deduplication, not domain-field comparison.** Earlier
  dedup logic compared a specific field (e.g. `pm25_avg`) to decide which
  duplicate row to keep. This failed on rows where only *some* fields were
  null (e.g. `aqi_status` null while `pm25_avg` was valid on the same
  row). The fix: always keep whichever duplicate has the later
  `ingestion_ts`/`created_at`, regardless of which field is affected.
- **Phantom null-date row filtering.** All three raw-data tables were
  found to occasionally contain a row where *every* column, including the
  date itself, was `NULL` — and since BigQuery sorts `NULL` first
  regardless of sort direction, this row always landed first in query
  results, corrupting the dashboard's "latest reading" display. The
  `Merge` node now drops any row with a null date before deduping.
- **Live 7-day forecast, not persisted.** In addition to the stored
  linear regression / Holt smoothing forecasts, the TFM API fetches
  Open-Meteo's own week-ahead NWP forecast live on every webhook call
  (not stored in BigQuery), giving a third, always-current comparison
  point. See `merge-node-code-reference.js` for the implementation.
- **One-date-per-run duplicate prevention (main pipeline).** Production
  runs with `past_days=1`, so each date is only ever processed by one
  execution; combined with a `SELECT COUNT` pre-check before every insert,
  this is race-free in normal operation.

## BigQuery schema

See `bigquery-schema.sql` for full table definitions. All date columns are
`STRING` in `YYYY-MM-DD` format to avoid timezone ambiguity between
JavaScript and BigQuery date handling.

## Known issues / gotchas

- BigQuery returns `COUNT(*)` as a string, not an integer — IF nodes
  comparing it need "Convert types" enabled.
- `DELETE WHERE TRUE` fails on recently-streamed tables due to the
  streaming buffer lock; use `TRUNCATE TABLE` for resets instead.
- An unconnected `Respond to Webhook` node produces a silent
  `code 0: Unused node` error — it must be wired as the final node.
- `forecast_days=0` is required on the three main-pipeline Open-Meteo
  fetch URLs to prevent future-dated rows from contaminating historical
  data. The two *live forecast* fetch nodes in the TFM API workflow are
  the deliberate exception — they use `forecast_days=7`.
- The two Open-Meteo hosts are different: `api.open-meteo.com` for
  weather, `air-quality-api.open-meteo.com` for air quality. Easy to
  copy-paste the wrong host between the two live-forecast fetch nodes.
- The root cause of the phantom null-date rows (an insert firing with no
  real data attached) has not been traced to a specific node — it's
  handled defensively in the `Merge` node but not fixed at the source.
