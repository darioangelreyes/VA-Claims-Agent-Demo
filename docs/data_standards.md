# VA Claims Agent — synthetic data & interoperability standards

This demo uses **synthetic** data only. It is **not** production PHI and does **not** ship full licensed terminology distributions (e.g. complete SNOMED CT / LOINC / ICD-10 files).

## Bronze layer (illustrative sources)

| Pattern | Standard / system | Repo / runtime |
|--------|-------------------|----------------|
| `bronze_cerner_claim_extract` | Cerner-style flat extract | [dab/notebooks/dlt_va_claims.py](../dab/notebooks/dlt_va_claims.py) |
| `bronze_vista_event` | VistA-inspired identifiers (DFN/ICN — synthetic) | Same |
| `bronze_fhir_bundle` | HL7 FHIR R4 JSON fragments (Patient + Condition + ICD-10 + SNOMED coding) | Same |
| `bronze_ccda_manifest` | C-CDA-style document pointers (URI + type) | Same |

## Silver layer

| Table | Purpose |
|-------|---------|
| `silver_dim_icd10` | Small ICD-10-CM code list |
| `silver_dim_loinc` | Small LOINC subset |
| `silver_dim_snomed` | SNOMED CT-style concept IDs with `http://snomed.info/sct` |
| `silver_observation_loinc` | Observations keyed by LOINC |
| `silver_va_doc_chunk` | Text chunks with `topic_tags` for **SQL-only** retrieval (no Vector Search) |

## Gold layer (app-facing)

| Table | Consumers |
|-------|-----------|
| `claims` | FastAPI `ClaimsService` |
| `claim_evidence`, `claim_history` | Claim detail APIs |
| `gold_adjudication_reports` | Same rows as `claims` (alias for analytics) |
| `gold_claims_timeseries` | `GET /api/claims/adjudication/timeseries` |

## Disclaimer

- Terminology rows are **examples** for interoperability storytelling.
- For official code sets, use your organization’s licensed releases and import pipelines.
