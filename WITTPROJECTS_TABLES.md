# Wittprojects Schema - Required Tables

All data for the VA Claims Dashboard now pulls from `wittprojects.vba_claims_agent` schema.

## Required Tables

### 1. `wittprojects.vba_claims_agent.claims`
**Purpose**: Main claims data for both dashboards

**Required Columns**:
- `claim_id` (STRING) - Unique claim identifier
- `veteran_id` (STRING) - Veteran identifier
- `veteran_name` (STRING) - Veteran's full name
- `date_submitted` (DATE) - Date claim was submitted
- `claimed_condition` (STRING) - Medical condition claimed
- `current_status` (STRING) - Status: PENDING, ACTIVE, DECISION_READY, REVIEW_REQUIRED, DELAYED, APPROVED, DENIED
- `priority_level` (STRING) - Priority: CRITICAL, HIGH, MEDIUM, LOW
- `fraud_score` (DOUBLE) - Fraud risk score (0.0 to 1.0)
- `fraud_reason` (STRING, nullable) - Explanation if fraud score is high
- `compliance_score` (DOUBLE) - Compliance score (0-100)
- `compliance_update` (STRING, nullable) - Compliance status updates
- `ai_summary` (STRING, nullable) - AI-generated summary
- `is_pact_act_eligible` (BOOLEAN) - PACT Act eligibility flag
- `exposure_type` (STRING, nullable) - Type of exposure (Burn Pit, Agent Orange, etc.)
- `decision_time_days` (INT, nullable) - Days to decision
- `presumptive_match` (BOOLEAN, nullable) - Presumptive condition match

**Used By**:
- Main Dashboard: Critical claims list
- PACT Act Dashboard: Adjudicator stats, pending claims, high priority claims, PACT Act stats, claim details

---

### 2. `wittprojects.vba_claims_agent.claims_metrics`
**Purpose**: Aggregated metrics for dashboard KPIs

**Required Columns**:
- `date` (DATE) - Metric date
- `claim_id` (STRING) - Claim identifier
- `veteran_id` (STRING) - Veteran identifier
- `cycle_time_hours` (DOUBLE) - Claim processing cycle time in hours
- `current_status` (STRING) - Current claim status
- `processing_rate` (DOUBLE) - Processing rate (0.0 to 1.0)

**Used By**:
- Main Dashboard: Metrics card (avg cycle time, active claims, processing rate, veteran impact)

---

### 3. `wittprojects.vba_claims_agent.provider_delays`
**Purpose**: Provider performance and regional delay data

**Required Columns**:
- `provider_name` (STRING) - VA Regional Office or provider name
- `claimed_condition` (STRING) - Condition/product type
- `region` (STRING) - Geographic region
- `delay_hours` (DOUBLE) - Delay in hours

**Used By**:
- Main Dashboard: Visibility gaps section
- Main Dashboard: Region delays chart

---

### 4. `wittprojects.vba_claims_agent.claim_evidence`
**Purpose**: Evidence tracking for individual claims

**Required Columns**:
- `claim_id` (STRING) - Claim identifier
- `evidence_type` (STRING) - Type: serviceRecord, vaExam, medicalRecord, etc.
- `status` (STRING) - Status: COMPLETE, INCOMPLETE, PENDING
- `completeness_score` (DOUBLE) - Completeness percentage (0-100)

**Used By**:
- PACT Act Dashboard: Claim detail view - evidence section

---

### 5. `wittprojects.vba_claims_agent.claim_history`
**Purpose**: Audit trail of claim actions

**Required Columns**:
- `claim_id` (STRING) - Claim identifier
- `action_date` (TIMESTAMP) - When action occurred
- `action_type` (STRING) - Type of action taken
- `performed_by` (STRING) - User/system that performed action

**Used By**:
- PACT Act Dashboard: Claim detail view - history timeline

---

## Summary of Changes

### Before (ahunt_demo schema):
```
ahunt_demo.generatorclaims.gold_claims_throughput_daily
ahunt_demo.generatorclaims.silver_claims_events
ahunt_demo.generatorclaims.gold_provider_experience_daily
```

### After (wittprojects schema):
```
wittprojects.vba_claims_agent.claims
wittprojects.vba_claims_agent.claims_metrics
wittprojects.vba_claims_agent.provider_delays
wittprojects.vba_claims_agent.claim_evidence
wittprojects.vba_claims_agent.claim_history
```

---

## Sample Data Queries

### Check if tables exist:
```sql
SHOW TABLES IN wittprojects.vba_claims_agent;
```

### Check claims table structure:
```sql
DESCRIBE wittprojects.vba_claims_agent.claims;
```

### Count records:
```sql
SELECT COUNT(*) FROM wittprojects.vba_claims_agent.claims;
SELECT COUNT(*) FROM wittprojects.vba_claims_agent.claims_metrics;
SELECT COUNT(*) FROM wittprojects.vba_claims_agent.provider_delays;
SELECT COUNT(*) FROM wittprojects.vba_claims_agent.claim_evidence;
SELECT COUNT(*) FROM wittprojects.vba_claims_agent.claim_history;
```

---

## Notes

- All queries now use `wittprojects.vba_claims_agent` schema
- If tables don't exist or queries fail, the app will fall back to mock data
- The mock data ensures the UI works even during development/testing
- Column names have been standardized across all queries

