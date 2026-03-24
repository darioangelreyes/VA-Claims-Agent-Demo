# Databricks notebook source
# MAGIC %md
# MAGIC # VA Claims Agent — Medallion SDP (bronze / silver / gold)
# MAGIC Synthetic VA claims + interoperability-flavored fields (FHIR, ICD-10, LOINC, SNOMED, Cerner/VistA-style, C-CDA refs).
# MAGIC Catalog and schema come from the pipeline Unity Catalog settings (bundle `catalog` + `target`).
# MAGIC Uses `pyspark.pipelines` (`dp`) for Lakeflow SDP / serverless; legacy `dlt` is not registered there.
# MAGIC
# MAGIC Python table definitions **must** live in a separate code cell below (`# COMMAND ----------`).

# COMMAND ----------

# Code cell: pipeline dataset definitions (executed by Lakeflow SDP — not markdown)
from pyspark import pipelines as dp
import pyspark.sql.functions as F
from pyspark.sql.types import (
    StructType,
    StructField,
    StringType,
    IntegerType,
    BooleanType,
    DoubleType,
    DateType,
    TimestampType,
)

# -----------------------------------------------------------------------------
# Bronze — vendor-style raw extracts (synthetic)
# -----------------------------------------------------------------------------


@dp.materialized_view(comment="Cerner-style flat claim line extract (synthetic)")
def bronze_cerner_claim_extract():
    rows = []
    conditions = [
        ("J44.1", "Chronic obstructive pulmonary disease", "Burn Pit"),
        ("C34.90", "Malignant neoplasm of lung", "Burn Pit"),
        ("I10", "Essential hypertension", "Agent Orange"),
        ("M54.5", "Low back pain", "Gulf War"),
    ]
    statuses = [
        "PENDING",
        "DECISION_READY",
        "REVIEW_REQUIRED",
        "AWAITING_EVIDENCE",
        "APPROVED",
    ]
    priorities = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
    for i in range(120):
        icd, cond, exp = conditions[i % len(conditions)]
        st = statuses[i % len(statuses)]
        pr = priorities[i % len(priorities)]
        rows.append(
            (
                f"CERNER-{100000 + i}",
                f"V{i % 80 + 1:05d}",
                f"Veteran_{i % 80 + 1}",
                f"2024-{1 + (i % 11):02d}-{1 + (i % 27):02d}",
                cond,
                icd,
                st,
                pr,
                float(5 + (i * 7) % 90),
                float(55 + (i * 3) % 45),
                1 if "Burn" in exp or "Agent" in exp else 0,
                exp,
                f"MRN-CERNER-{i % 80 + 1}",
                f"FAC-{i % 12 + 1}",
            )
        )
    schema = StructType(
        [
            StructField("cerner_claim_id", StringType()),
            StructField("patient_mrn", StringType()),
            StructField("patient_display_name", StringType()),
            StructField("service_date", StringType()),
            StructField("diagnosis_text", StringType()),
            StructField("icd10_cm_code", StringType()),
            StructField("claim_status", StringType()),
            StructField("priority_cd", StringType()),
            StructField("risk_score", DoubleType()),
            StructField("quality_score", DoubleType()),
            StructField("pact_flag", IntegerType()),
            StructField("exposure_category", StringType()),
            StructField("enterprise_mrn", StringType()),
            StructField("facility_id", StringType()),
        ]
    )
    return spark.createDataFrame(rows, schema)


@dp.materialized_view(comment="VistA-inspired event rows (synthetic IDs only)")
def bronze_vista_event():
    rows = []
    for i in range(80):
        rows.append(
            (
                f"VISTA-{200000 + i}",
                f"DFN{i % 60 + 1:06d}",
                f"ICN{380000000 + i}",
                f"2024-{1 + (i % 10):02d}-{1 + (i % 20):02d}",
                "CONSULT" if i % 3 == 0 else "LAB" if i % 3 == 1 else "RADIOLOGY",
                f"LOC{i % 20 + 1}",
            )
        )
    sch = StructType(
        [
            StructField("vista_event_id", StringType()),
            StructField("dfn", StringType()),
            StructField("icn", StringType()),
            StructField("event_dt", StringType()),
            StructField("event_type", StringType()),
            StructField("station_id", StringType()),
        ]
    )
    return spark.createDataFrame(rows, sch)


@dp.materialized_view(comment="FHIR R4 bundle fragment as JSON text (Patient + Condition refs)")
def bronze_fhir_bundle():
    rows = []
    for i in range(100):
        pid = f"pat-{i + 1:05d}"
        cond_id = f"cond-{i + 1:05d}"
        icd = ["J44.1", "C34.90", "I10", "M54.5"][i % 4]
        snomed = ["13645005", "363358000", "59621000", "279039007"][i % 4]
        js = (
            '{"resourceType":"Bundle","entry":['
            f'{{"resource":{{"resourceType":"Patient","id":"{pid}"}},'
            f'"fullUrl":"urn:uuid:{pid}"}},'
            f'{{"resource":{{"resourceType":"Condition","id":"{cond_id}",'
            f'"code":{{"coding":[{{"system":"http://hl7.org/fhir/sid/icd-10-cm","code":"{icd}"}},'
            f'{{"system":"http://snomed.info/sct","code":"{snomed}"}}]}}}}}}'
            "]}"
        )
        rows.append((f"FHIR-B-{i}", js))
    return spark.createDataFrame(rows, StructType([StructField("bundle_id", StringType()), StructField("raw_json", StringType())]))


@dp.materialized_view(comment="C-CDA document manifest (synthetic pointers)")
def bronze_ccda_manifest():
    rows = []
    for i in range(60):
        rows.append(
            (
                f"CCDA-{300000 + i}",
                f"CERNER-{100000 + (i % 120)}",
                "ClinicalSummary" if i % 2 == 0 else "DischargeSummary",
                f"https://synthetic.va.example/ccda/{300000 + i}.xml",
                f"2024-{1 + (i % 11):02d}-{1 + (i % 25):02d}",
            )
        )
    sch = StructType(
        [
            StructField("document_id", StringType()),
            StructField("linked_cerner_claim_id", StringType()),
            StructField("doc_type", StringType()),
            StructField("repository_uri", StringType()),
            StructField("effective_time", StringType()),
        ]
    )
    return spark.createDataFrame(rows, sch)


# -----------------------------------------------------------------------------
# Silver — terminology dimensions + clinical long (synthetic subsets)
# -----------------------------------------------------------------------------


@dp.materialized_view(comment="ICD-10-CM subset for demo (not a licensed full distribution)")
def silver_dim_icd10():
    codes = [
        ("J44.1", "Chronic obstructive pulmonary disease with acute exacerbation"),
        ("C34.90", "Malignant neoplasm of unspecified part of unspecified bronchus or lung"),
        ("I10", "Essential (primary) hypertension"),
        ("M54.5", "Low back pain"),
        ("F43.12", "Post-traumatic stress disorder, chronic"),
    ]
    rows = [(c[0], c[1], "ICD-10-CM") for c in codes]
    return spark.createDataFrame(
        rows,
        StructType(
            [
                StructField("icd10_code", StringType()),
                StructField("description", StringType()),
                StructField("code_system", StringType()),
            ]
        ),
    )


@dp.materialized_view(comment="LOINC subset (illustrative)")
def silver_dim_loinc():
    rows = [
        ("8867-4", "Heart rate", "clinical"),
        ("8480-6", "Systolic blood pressure", "clinical"),
        ("72166-2", "Tobacco smoking status", "survey"),
        ("33747-0", "Cholesterol [Mass/volume] in Serum or Plasma", "lab"),
    ]
    return spark.createDataFrame(
        rows,
        StructType(
            [
                StructField("loinc_num", StringType()),
                StructField("long_common_name", StringType()),
                StructField("class_type", StringType()),
            ]
        ),
    )


@dp.materialized_view(comment="SNOMED CT URI pattern subset (illustrative)")
def silver_dim_snomed():
    rows = [
        ("13645005", "Chronic obstructive lung disease", "http://snomed.info/sct"),
        ("363358000", "Malignant tumor", "http://snomed.info/sct"),
        ("59621000", "Essential hypertension", "http://snomed.info/sct"),
        ("279039007", "Low back pain", "http://snomed.info/sct"),
    ]
    return spark.createDataFrame(
        rows,
        StructType(
            [
                StructField("concept_id", StringType()),
                StructField("term", StringType()),
                StructField("namespace", StringType()),
            ]
        ),
    )


@dp.materialized_view(comment="Observation facts with LOINC (synthetic)")
def silver_observation_loinc():
    rows = []
    loincs = ["8867-4", "8480-6", "72166-2", "33747-0"]
    for i in range(200):
        rows.append(
            (
                f"OBS-{i}",
                f"V{i % 80 + 1:05d}",
                loincs[i % len(loincs)],
                f"{65 + (i % 20)}",
                f"2024-{1 + (i % 11):02d}-{1 + (i % 27):02d}",
            )
        )
    return spark.createDataFrame(
        rows,
        StructType(
            [
                StructField("observation_id", StringType()),
                StructField("patient_key", StringType()),
                StructField("loinc_code", StringType()),
                StructField("value_text", StringType()),
                StructField("effective_date", StringType()),
            ]
        ),
    )


@dp.materialized_view(comment="VA / PACT policy text chunks for SQL retrieval (no Vector Search)")
def silver_va_doc_chunk():
    chunks = [
        (
            "chunk-pact-1",
            "PACT Act Overview",
            "Eligibility",
            "https://www.va.gov/resources/the-pact-act-and-your-va-benefits/",
            "pact_act,eligibility,presumptive",
            "The PACT Act expands VA health care and benefits for Veterans exposed to burn pits and other toxic substances.",
        ),
        (
            "chunk-pact-2",
            "Claims process",
            "Filing",
            "https://www.va.gov/disability/how-to-file-claim/",
            "claims_process,filing,evidence",
            "When filing a disability claim, Veterans should submit service records and medical evidence supporting the claimed condition.",
        ),
        (
            "chunk-pact-3",
            "Decision readiness",
            "Adjudication",
            "https://www.va.gov/decision-reviews/",
            "adjudication,decision,clarification",
            "Adjudicators may request clarification when evidence is incomplete or conflicting before approving or denying a claim.",
        ),
    ]
    return spark.createDataFrame(
        chunks,
        StructType(
            [
                StructField("chunk_id", StringType()),
                StructField("title", StringType()),
                StructField("section", StringType()),
                StructField("source_url", StringType()),
                StructField("topic_tags", StringType()),
                StructField("body", StringType()),
            ]
        ),
    )


# -----------------------------------------------------------------------------
# Gold — app-facing tables (match FastAPI ClaimsService expectations)
# -----------------------------------------------------------------------------


@dp.materialized_view(
    name="claims",
    comment="Gold claims for VA Claims Dashboard + PACT adjudication API",
)
def gold_claims():
    b = spark.table("bronze_cerner_claim_extract")
    return b.select(
        F.col("cerner_claim_id").alias("claim_id"),
        F.concat(F.lit("Veteran "), F.col("patient_mrn")).alias("veteran_name"),
        F.to_date(F.col("service_date")).alias("date_submitted"),
        F.col("diagnosis_text").alias("claimed_condition"),
        F.col("claim_status").alias("current_status"),
        F.col("claim_status").alias("status"),
        F.col("priority_cd").alias("priority_level"),
        F.col("risk_score").alias("fraud_score"),
        F.when(F.col("risk_score") > 70, F.lit("Elevated inconsistency risk (synthetic)"))
        .otherwise(F.lit(None))
        .cast(StringType())
        .alias("fraud_reason"),
        F.col("quality_score").alias("compliance_score"),
        F.lit(None).cast(StringType()).alias("compliance_update"),
        F.concat(
            F.lit("Synthetic summary: "),
            F.col("diagnosis_text"),
            F.lit(" — review exposure "),
            F.col("exposure_category"),
        ).alias("ai_summary"),
        F.col("pact_flag").cast(BooleanType()).alias("is_pact_act_eligible"),
        F.col("exposure_category").alias("exposure_type"),
        F.lit(45).cast(IntegerType()).alias("decision_time_days"),
        F.lit(True).alias("presumptive_match"),
        F.lit("Operational review (synthetic)").alias("priority_reason"),
        F.col("patient_mrn").alias("veteran_id"),
    )


@dp.materialized_view(comment="Evidence rows per claim (synthetic)")
def claim_evidence():
    c = spark.table("claims").select("claim_id").limit(200)
    ev_arr = F.array(
        F.lit("serviceRecord"),
        F.lit("vaExam"),
        F.lit("medicalRecord"),
        F.lit("layWitnessStatement"),
    )
    base = c.withColumn("evidence_type", F.explode(ev_arr))
    return base.select(
        "claim_id",
        "evidence_type",
        F.element_at(
            F.array(F.lit("COMPLETE"), F.lit("PENDING"), F.lit("INCOMPLETE")),
            (F.abs(F.hash(F.col("claim_id"), F.col("evidence_type"))) % 3 + 1).cast("int"),
        ).alias("status"),
        # Alias must wrap the full Column (+ binds looser than .method()); otherwise Delta sees an auto name with invalid characters.
        (
            F.lit(70.0)
            + (F.abs(F.hash(F.col("evidence_type"))) % F.lit(30)).cast(DoubleType())
        ).alias("completeness_score"),
    )


@dp.materialized_view(comment="Claim history timeline (synthetic)")
def claim_history():
    c = spark.table("claims").select("claim_id", "date_submitted").limit(150)
    act_rows = [
        ("09:00:00", "Claim Submitted", "System"),
        ("10:15:00", "Evidence Review Started", "Agent"),
        ("14:00:00", "PACT screening", "RulesEngine"),
    ]
    act_schema = StructType(
        [
            StructField("t", StringType()),
            StructField("a", StringType()),
            StructField("u", StringType()),
        ]
    )
    acts = spark.createDataFrame(act_rows, act_schema)
    x = c.crossJoin(acts)
    return x.select(
        F.col("claim_id"),
        F.concat_ws(" ", F.col("date_submitted").cast(StringType()), F.col("t")).alias("action_date"),
        F.col("a").alias("action_type"),
        F.col("u").alias("performed_by"),
    )


@dp.materialized_view(
    name="gold_adjudication_reports",
    comment="Alias of claims for analytics / legacy SQL examples",
)
def gold_adjudication_reports():
    return spark.table("claims")


@dp.materialized_view(
    name="gold_claims_timeseries",
    comment="Weekly aggregates for dashboard trends",
)
def gold_claims_timeseries():
    c = spark.table("claims")
    return (
        c.withColumn("week_start", F.date_trunc("week", F.col("date_submitted")))
        .groupBy("week_start", "current_status")
        .agg(
            F.count("*").alias("claim_count"),
            F.sum(F.when(F.col("is_pact_act_eligible"), F.lit(1)).otherwise(F.lit(0))).alias(
                "pact_eligible_count"
            ),
        )
        .orderBy("week_start", "current_status")
    )
