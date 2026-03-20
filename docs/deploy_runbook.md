# Deploy runbook — DAB + Databricks App (VA Claims Agent Demo)

## Prerequisites

- Databricks CLI **0.265+** (`databricks --version`).
- Unity Catalog **CREATE CATALOG** / **USE CATALOG** rights (or use an existing catalog and override variables).
- **Databricks Apps** enabled for deploy target.
- Local: `uv`, Node 18+, `npm` or `bun` (see [setup.sh](../setup.sh)).

## 1. Configure environment

Copy [.env.example](../.env.example) to `.env.local` and set at least:

- `DATABRICKS_HOST`, `DATABRICKS_TOKEN`
- `DATABRICKS_APP_NAME`, `DBA_SOURCE_CODE_PATH`
- `DATABRICKS_UC_CATALOG`, `DATABRICKS_UC_SCHEMA` (defaults: `fedhealth_demo_ws_catalog`, `vba_claims_agent`)

Optional:

- `DATABRICKS_SERVING_ENDPOINT_URL`, `DATABRICKS_ADJUDICATION_SUGGEST_URL`
- For Genie link in UI: set `VITE_GENIE_SPACE_URL` **before** `npm run build` / deploy (Vite embeds at build time).

## 2. Deploy the Asset Bundle (data plane)

From the **repository root**:

```bash
databricks bundle validate
databricks bundle deploy -t dev
```

This syncs bundle files and creates/updates **SDP** `va_claims_medallion_dev` (name may include target).

### First-time catalog

If `fedhealth_demo_ws_catalog` does not exist, create it in Unity Catalog (SQL or UI), then run the pipeline:

```sql
CREATE CATALOG IF NOT EXISTS fedhealth_demo_ws_catalog;
CREATE SCHEMA IF NOT EXISTS fedhealth_demo_ws_catalog.vba_claims_agent;
```

Grants: give the SDP’s service principal **USE CATALOG**, **USE SCHEMA**, **CREATE TABLE**, **SELECT**, **MODIFY** as required.

### Run the pipeline

In **Databricks UI**: open **Workflows** / **Data Engineering**, select the `va_claims_medallion_*` **SDP**, then **Start**.

After success, verify:

```sql
SELECT COUNT(*) FROM fedhealth_demo_ws_catalog.vba_claims_agent.claims;
SELECT COUNT(*) FROM fedhealth_demo_ws_catalog.vba_claims_agent.gold_claims_timeseries;
```

## 3. Configure Genie (optional)

Follow [dab/genie/VA_CLAIMS_GENIE_SPACE.md](../dab/genie/VA_CLAIMS_GENIE_SPACE.md).

## 4. Deploy the Databricks App (UI + API)

```bash
./deploy.sh --create   # first time only
./deploy.sh
```

Ensure the app’s environment (or `.databricks.env` synced with the app) includes the same `DATABRICKS_*` variables as `.env.local` where applicable.

## 5. Smoke tests

```bash
curl -s "$HOST/api/claims/adjudication/timeseries" | head
curl -s -X POST "$HOST/api/claims/adjudication/suggest" \
  -H "Content-Type: application/json" \
  -d '{"claimId":"CERNER-100000"}'
```

Replace `HOST` with your app URL.

## Order summary

1. `databricks bundle deploy`
2. Start SDP (once catalog/schema exist)
3. Configure Genie + `VITE_GENIE_SPACE_URL` rebuild if needed
4. `./deploy.sh`

## Optional job wrapper

You can add a **job** that runs the pipeline using `pipeline_task` referencing `${resources.pipelines.va_claims_medallion.id}` after the bundle defines stable IDs — template was omitted from the repo to avoid first-deploy circular references; add under `dab/resources/` if your CLI version supports it.
