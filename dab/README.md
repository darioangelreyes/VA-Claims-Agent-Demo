# VA Claims Agent — Databricks Asset Bundle

This folder holds **bundle includes** referenced from the root [databricks.yml](../databricks.yml).

## Layout

| Path | Purpose |
|------|---------|
| [resources/pipelines.yml](resources/pipelines.yml) | SDP resource |
| [notebooks/dlt_va_claims.py](notebooks/dlt_va_claims.py) | Medallion SDP (bronze → silver → gold) |
| [genie/VA_CLAIMS_GENIE_SPACE.md](genie/VA_CLAIMS_GENIE_SPACE.md) | Genie setup checklist |
| [src/data_generation/generate_seed_csvs.py](src/data_generation/generate_seed_csvs.py) | Optional local CSV seeds (documentation aid) |

## Commands

```bash
cd ..   # repo root
databricks bundle validate
databricks bundle deploy -t dev
```

Variables (`catalog`, `schema`) are defined in the root `databricks.yml`.
