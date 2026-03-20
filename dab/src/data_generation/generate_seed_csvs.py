#!/usr/bin/env python3
"""
Optional: write small CSV seeds under dab/seed_data/ for documentation or manual COPY INTO.
The primary demo path is synthetic data inside dlt_va_claims.py (no external files required).

Run from repo root:
  uv run python dab/src/data_generation/generate_seed_csvs.py
"""
from __future__ import annotations

import csv
import os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "seed_data")


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    icd = [
        ("J44.1", "COPD with acute exacerbation", "ICD-10-CM"),
        ("C34.90", "Malignant neoplasm of lung", "ICD-10-CM"),
    ]
    with open(os.path.join(OUT, "dim_icd10_sample.csv"), "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["icd10_code", "description", "code_system"])
        w.writerows(icd)

    loinc = [
        ("8867-4", "Heart rate", "clinical"),
        ("8480-6", "Systolic blood pressure", "clinical"),
    ]
    with open(os.path.join(OUT, "dim_loinc_sample.csv"), "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["loinc_num", "long_common_name", "class_type"])
        w.writerows(loinc)

    print(f"Wrote sample CSVs to {OUT}")


if __name__ == "__main__":
    main()
