# Adjudication decision support — MLOps & serving (VA demo)

## Goals

Provide **approve / deny / request clarification** style suggestions with **reasons** and **citations** to public VA documentation excerpts — **without** Databricks Vector Search and **without** Inference Tables.

## Knowledge base

- Table: `{catalog}.{schema}.silver_va_doc_chunk` (created by SDP in [dab/notebooks/dlt_va_claims.py](../../dab/notebooks/dlt_va_claims.py)).
- Columns: `chunk_id`, `title`, `section`, `source_url`, `topic_tags`, `body`.
- Retrieval: **SQL** (`SELECT ... LIMIT`) and optional `LIKE` on `topic_tags`. No embeddings.

## Public references (examples)

Cited URLs in synthetic chunks include:

- [PACT Act and VA benefits](https://www.va.gov/resources/the-pact-act-and-your-va-benefits/) — eligibility framing.
- [How to file a claim](https://www.va.gov/disability/how-to-file-claim/) — evidence and filing.
- [Decision reviews](https://www.va.gov/decision-reviews/) — clarification / review paths.

Replace or extend chunks in SDP for your workshop; keep only **public** sources you are allowed to redistribute as text.

## Model serving

- **Optional** `DATABRICKS_ADJUDICATION_SUGGEST_URL` or `DATABRICKS_SERVING_ENDPOINT_URL`: POST with JSON body including a `messages` array (OpenAI-style) assembled in [server/services/claims_service.py](../../server/services/claims_service.py).
- If the endpoint returns non-JSON or errors, the API falls back to **heuristic** rules using `fraud_score`, `compliance_score`, and `current_status`.

## MLOps (no Inference Tables)

- Log experiments and register **prompt / model versions** in **MLflow** and **Unity Catalog** as required by your org.
- Do **not** rely on Databricks Inference Tables for this demo path.

## API

- `POST /api/claims/adjudication/suggest` with `{ "claimId": "..." }`.

## Responsible use

- UI and API responses include a **decision support only** disclaimer — not a legal determination.
- Audit adjudicator actions in production outside this template.
