# API Data Flow - VA Claims Dashboard

## ✅ NOW USING REAL API DATA

The frontend is now wired up to call the backend API instead of using hardcoded data.

---

## Data Flow

```
Frontend (React)
    ↓
    HTTP GET /api/claims/adjudication/dashboard
    ↓
Backend (FastAPI)
    ↓
    SQL Query to: wittprojects.vba_claims_agent.gold_adjudication_reports
    ↓
    Returns data OR falls back to mock data if table doesn't exist
    ↓
Frontend displays data in Priority Claims table
```

---

## API Endpoint

**URL**: `http://localhost:8001/api/claims/adjudication/dashboard`

**Response Structure**:
```json
{
  "adjudicatorStats": {
    "pendingClaimsPercent": 74.0,
    "avgDecisionTimeDays": 83,
    "presumptiveMatchRate": 74.0
  },
  "pendingClaims": [
    {
      "claimId": "1234567890",
      "veteranName": "Daniel Johnson",
      "dateSubmitted": "10/15/2023",
      "claimedCondition": "Lung Cancer",
      "currentStatus": "DECISION_READY",
      "priorityLevel": "HIGH",
      "fraudScore": 12.5,
      "complianceScore": 95.0,
      "isPactAct": true
    }
  ],
  "highPriorityClaims": [...],
  "pactActStats": {...}
}
```

---

## Frontend Mapping

The frontend transforms API data to match UI requirements:

```typescript
{
  claimId: claim.claimId,
  veteranName: claim.veteranName,
  daysOpen: calculated from dateSubmitted,
  condition: claim.claimedCondition,
  status: claim.currentStatus,
  reason: claim.priorityLevel || 'PACT Act',
  fraudScore: claim.fraudScore / 100,  // Convert to 0-1 scale
  complianceScore: claim.complianceScore,
  fraudReason: claim.fraudReason
}
```

---

## Backend Data Source

**Primary Table**: `wittprojects.vba_claims_agent.gold_adjudication_reports`

**SQL Query** (from `claims_service.py`):
```sql
SELECT 
    claim_id,
    veteran_name,
    date_submitted,
    claimed_condition,
    current_status,
    priority_level,
    fraud_score,
    compliance_score
FROM wittprojects.vba_claims_agent.gold_adjudication_reports
WHERE current_status IN ('PENDING', 'DECISION_READY', 'REVIEW_REQUIRED', 'AWAITING_EVIDENCE')
ORDER BY 
    CASE priority_level 
        WHEN 'CRITICAL' THEN 1 
        WHEN 'HIGH' THEN 2 
        WHEN 'MEDIUM' THEN 3 
        ELSE 4 
    END,
    date_submitted ASC
LIMIT 50
```

---

## Current Behavior

### If `gold_adjudication_reports` table EXISTS:
✅ Frontend displays **real data** from Databricks table  
✅ Priority Claims table shows actual claims from your data  
✅ All metrics calculated from real data  

### If `gold_adjudication_reports` table DOES NOT EXIST:
⚠️ Backend returns **mock data** (3 sample claims)  
⚠️ Frontend displays mock claims so UI still works  
⚠️ Data is functional but not real  

---

## How to Verify Real Data

### 1. Check if table exists in Databricks:
```sql
SELECT * FROM wittprojects.vba_claims_agent.gold_adjudication_reports LIMIT 5;
```

### 2. Check backend API response:
```bash
curl http://localhost:8001/api/claims/adjudication/dashboard | jq '.pendingClaims | length'
```

If returns **3** → Using mock data  
If returns **> 3** → Using real data from table  

### 3. Check frontend network tab:
- Open browser DevTools → Network tab
- Refresh page
- Look for call to `/api/claims/adjudication/dashboard`
- Inspect response

---

## Required Table Schema

For real data to work, `gold_adjudication_reports` needs these columns:

```sql
CREATE TABLE wittprojects.vba_claims_agent.gold_adjudication_reports (
    claim_id STRING,
    veteran_id STRING,
    veteran_name STRING,
    date_submitted DATE,
    claimed_condition STRING,
    current_status STRING,
    priority_level STRING,
    fraud_score DOUBLE,
    fraud_reason STRING,
    compliance_score DOUBLE,
    compliance_update STRING,
    ai_summary STRING,
    is_pact_act_eligible BOOLEAN,
    exposure_type STRING,
    decision_time_days INT,
    presumptive_match BOOLEAN,
    priority_reason STRING
);
```

---

## Next Steps to Get Real Data

1. **Check if table exists** in your workspace
2. **Populate table** with real or sample data
3. **Refresh frontend** - it will automatically pull from table
4. **Test agent evaluation** with real claim IDs

---

## Files Modified

- ✅ `server/services/claims_service.py` - Updated to query `gold_adjudication_reports`
- ✅ `client/src/pages/PactActAdjudicationDashboard.tsx` - Uncommented API calls
- ✅ Both frontend and backend restarted with new code

---

## Test URLs

- Frontend: http://localhost:5174
- Backend Health: http://localhost:8001/health
- API Docs: http://localhost:8001/docs
- Dashboard API: http://localhost:8001/api/claims/adjudication/dashboard

