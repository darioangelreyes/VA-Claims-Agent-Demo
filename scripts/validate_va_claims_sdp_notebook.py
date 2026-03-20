#!/usr/bin/env python3
"""
Static checks for dab/notebooks/dlt_va_claims.py (Lakeflow SDP / pyspark.pipelines).

Run locally (no Databricks needed):
  uv run python scripts/validate_va_claims_sdp_notebook.py

This does NOT execute Spark or contact Databricks. It catches:
  - Syntax errors after stripping notebook magics
  - Accidental `dlt` usage
  - spark.table("x") references to undefined pipeline dataset names

For ~95% confidence the pipeline will run in your workspace, also run (with auth):
  databricks bundle deploy -t dev
  databricks bundle run va_claims_medallion -t dev --validate-only
"""

from __future__ import annotations

import ast
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
NOTEBOOK = REPO_ROOT / "dab" / "notebooks" / "dlt_va_claims.py"


def notebook_to_python_source(raw: str) -> str:
    lines_out: list[str] = []
    for line in raw.splitlines():
        if line.startswith("# Databricks notebook source"):
            continue
        stripped = line.strip()
        if stripped.startswith("# MAGIC"):
            continue
        lines_out.append(line)
    return "\n".join(lines_out) + "\n"


def dataset_name_from_decorator(dec: ast.expr, func_name: str) -> str | None:
    """Return published dataset name for @dp.materialized_view(...)."""
    if isinstance(dec, ast.Call):
        fn = dec.func
        if isinstance(fn, ast.Attribute) and fn.attr == "materialized_view":
            for kw in dec.keywords:
                if kw.arg == "name" and isinstance(kw.value, ast.Constant):
                    if isinstance(kw.value.value, str):
                        return kw.value.value
            return func_name
    return None


def collect_datasets(tree: ast.Module) -> dict[str, str]:
    """Map dataset logical name -> defining function name."""
    names: dict[str, str] = {}
    for node in tree.body:
        if not isinstance(node, ast.FunctionDef):
            continue
        for dec in node.decorator_list:
            dname = dataset_name_from_decorator(dec, node.name)
            if dname is not None:
                if dname in names:
                    print(f"ERROR: duplicate dataset name {dname!r}", file=sys.stderr)
                    sys.exit(1)
                names[dname] = node.name
    return names


def collect_spark_table_refs(tree: ast.Module) -> set[str]:
    refs: set[str] = set()
    for node in ast.walk(tree):
        if not isinstance(node, ast.Call):
            continue
        fn = node.func
        if not isinstance(fn, ast.Attribute) or fn.attr != "table":
            continue
        if not isinstance(fn.value, ast.Name) or fn.value.id != "spark":
            continue
        if not node.args:
            continue
        arg0 = node.args[0]
        if isinstance(arg0, ast.Constant) and isinstance(arg0.value, str):
            refs.add(arg0.value)
    return refs


def forbid_dlt(tree: ast.Module) -> list[str]:
    errors: list[str] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                if alias.name == "dlt" or alias.name.startswith("dlt."):
                    errors.append(f"Forbidden import: {alias.name}")
        if isinstance(node, ast.ImportFrom) and node.module:
            if node.module == "dlt" or node.module.startswith("dlt."):
                errors.append(f"Forbidden import from: {node.module}")
        if isinstance(node, ast.Attribute) and isinstance(node.value, ast.Name):
            if node.value.id == "dlt":
                errors.append("Forbidden use of dlt.* attribute")
    return errors


def require_dp_import(tree: ast.Module) -> bool:
    for node in tree.body:
        if isinstance(node, ast.ImportFrom) and node.module == "pyspark":
            for alias in node.names:
                if alias.name == "pipelines" and alias.asname == "dp":
                    return True
    return False


def main() -> None:
    if not NOTEBOOK.is_file():
        print(f"ERROR: missing {NOTEBOOK}", file=sys.stderr)
        sys.exit(1)

    raw = NOTEBOOK.read_text(encoding="utf-8")
    src = notebook_to_python_source(raw)

    try:
        tree = ast.parse(src, filename=str(NOTEBOOK))
    except SyntaxError as e:
        print(f"ERROR: syntax error after stripping magics: {e}", file=sys.stderr)
        sys.exit(1)

    if not require_dp_import(tree):
        print("ERROR: expected `from pyspark import pipelines as dp`", file=sys.stderr)
        sys.exit(1)

    dlt_errs = forbid_dlt(tree)
    if dlt_errs:
        for e in dlt_errs:
            print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)

    datasets = collect_datasets(tree)
    min_expected = 10
    if len(datasets) < min_expected:
        print(
            f"ERROR: expected at least {min_expected} @dp.materialized_view datasets, found {len(datasets)}",
            file=sys.stderr,
        )
        sys.exit(1)

    refs = collect_spark_table_refs(tree)
    missing = sorted(refs - set(datasets.keys()))
    if missing:
        print(
            "ERROR: spark.table(...) references undefined pipeline datasets: "
            + ", ".join(missing),
            file=sys.stderr,
        )
        print("Defined datasets:", ", ".join(sorted(datasets.keys())), file=sys.stderr)
        sys.exit(1)

    # Light guard: notebook should mention materialized_view, not bare dlt.table in source
    if re.search(r"\bdlt\.table\b", raw):
        print("ERROR: source still contains dlt.table", file=sys.stderr)
        sys.exit(1)

    print(f"OK: {NOTEBOOK.relative_to(REPO_ROOT)}")
    print(f"  - AST parse OK, {len(datasets)} datasets, {len(refs)} spark.table refs (all resolved)")
    print("  - Next: databricks bundle deploy -t dev && \\")
    print("      databricks bundle run va_claims_medallion -t dev --validate-only")


if __name__ == "__main__":
    main()
