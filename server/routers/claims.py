"""
Claims Router - Provides endpoints for VA Claims Dashboard
"""
from fastapi import APIRouter, HTTPException, Body, Query
from fastapi.responses import StreamingResponse
from typing import List, Dict, Any, Optional
from urllib.parse import urlparse
from pydantic import BaseModel
from server.services.claims_service import ClaimsService
import httpx
import os
import json

router = APIRouter(prefix="/claims", tags=["claims"])


class ClaimMetrics(BaseModel):
    avgCycleTime: float
    activeClaims: int
    processingRate: float
    veteranImpact: int


class CriticalClaim(BaseModel):
    name: str
    affected: int
    days: int


class VisibilityGap(BaseModel):
    provider: str
    product: str
    region: str
    delay: float
    risk: int


class RegionDelay(BaseModel):
    name: str
    normal: float
    delayed: float


class DashboardData(BaseModel):
    metrics: ClaimMetrics
    criticalClaims: List[CriticalClaim]
    visibilityGaps: List[VisibilityGap]
    regionDelays: List[RegionDelay]
    dataIntegrity: float
    compliance: float


@router.get("/dashboard", response_model=DashboardData)
async def get_dashboard_data() -> DashboardData:
    """
    Get comprehensive dashboard data for VA Claims Command Center
    
    Returns:
        DashboardData: Complete dashboard metrics and data
    """
    try:
        service = ClaimsService()
        data = await service.get_dashboard_data()
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch dashboard data: {str(e)}")


@router.get("/metrics", response_model=ClaimMetrics)
async def get_metrics() -> ClaimMetrics:
    """
    Get key claims metrics
    
    Returns:
        ClaimMetrics: Key performance indicators
    """
    try:
        service = ClaimsService()
        metrics = await service.get_metrics()
        return metrics
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch metrics: {str(e)}")


@router.get("/critical", response_model=List[CriticalClaim])
async def get_critical_claims() -> List[CriticalClaim]:
    """
    Get critical claims with delays
    
    Returns:
        List[CriticalClaim]: List of critical claims
    """
    try:
        service = ClaimsService()
        claims = await service.get_critical_claims()
        return claims
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch critical claims: {str(e)}")


# ============================================================================
# PACT ACT CLAIMS ADJUDICATION ENDPOINTS
# ============================================================================

class AdjudicatorStats(BaseModel):
    pendingClaimsPercent: float
    avgDecisionTimeDays: int
    presumptiveMatchRate: float


class PendingClaim(BaseModel):
    claimId: str
    veteranName: str
    dateSubmitted: str
    claimedCondition: str
    currentStatus: str
    priorityLevel: str
    fraudScore: float
    complianceScore: float
    isPactAct: Optional[bool] = True


class HighPriorityClaim(BaseModel):
    claimId: str
    veteranName: str
    dateSubmitted: str
    claimedCondition: str
    priorityReason: str
    fraudScore: float
    fraudReason: Optional[str]
    complianceUpdate: Optional[str]
    aiSummary: str


class PactActStats(BaseModel):
    totalEligible: int
    exposureTypes: List[Dict[str, Any]]


class AdjudicationDashboardData(BaseModel):
    adjudicatorStats: AdjudicatorStats
    pendingClaims: List[PendingClaim]
    highPriorityClaims: List[HighPriorityClaim]
    pactActStats: PactActStats


class ClaimDetailEvidence(BaseModel):
    serviceRecord: Dict[str, Any]
    vaExam: Dict[str, Any]
    medicalRecord: Dict[str, Any]


class ClaimHistoryItem(BaseModel):
    date: str
    action: str
    user: str


class ClaimDetail(BaseModel):
    claimId: str
    veteranName: str
    dateSubmitted: str
    claimedCondition: str
    currentStatus: str
    priorityLevel: str
    fraudScore: float
    fraudReason: Optional[str]
    complianceScore: float
    complianceUpdate: Optional[str]
    aiSummary: str
    isPactActEligible: bool
    exposureType: str
    evidence: ClaimDetailEvidence
    presumptiveMatchRate: Optional[float] = 74.0
    history: List[ClaimHistoryItem]


class ClaimActionRequest(BaseModel):
    action: str
    notes: Optional[str] = None
    adjudicatorId: Optional[str] = None


class ClaimActionResponse(BaseModel):
    success: bool
    message: str
    newStatus: Optional[str] = None
    timestamp: Optional[str] = None


class TimeseriesRow(BaseModel):
    weekStart: str
    currentStatus: str
    claimCount: int
    pactEligibleCount: int


class GenieVerifyResponse(BaseModel):
    ok: bool
    statusCode: Optional[int] = None
    detail: Optional[str] = None


class AdjudicationSuggestionRequest(BaseModel):
    claimId: str


class AdjudicationSuggestionResponse(BaseModel):
    decision: str
    confidence: float
    reasons: List[str]
    citations: List[Dict[str, Any]]
    disclaimer: str
    source: str


@router.get("/adjudication/timeseries", response_model=List[TimeseriesRow])
async def get_adjudication_timeseries() -> List[TimeseriesRow]:
    """Gold-layer weekly claim counts for dashboard trends (SDP `gold_claims_timeseries`)."""
    try:
        service = ClaimsService()
        rows = await service.get_claims_timeseries()
        return [TimeseriesRow(**r) for r in rows]
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch adjudication timeseries: {str(e)}"
        )


@router.get("/genie/verify", response_model=GenieVerifyResponse)
async def verify_genie_space(url: str = Query(..., min_length=16, max_length=2048)) -> GenieVerifyResponse:
    """
    Best-effort check that a Genie space URL is reachable on the configured workspace
    using the app's Databricks PAT (same auth as SQL). Used before embedding Genie in an iframe.
    """
    token = os.getenv("DATABRICKS_TOKEN")
    if not token:
        return GenieVerifyResponse(ok=False, detail="DATABRICKS_TOKEN not configured on app")

    parsed = urlparse(url)
    if parsed.scheme != "https":
        raise HTTPException(status_code=400, detail="Genie URL must use https")
    host = (parsed.hostname or "").lower()
    if not (host.endswith("databricks.com") or host.endswith("azuredatabricks.net")):
        raise HTTPException(
            status_code=400,
            detail="Genie URL host must be a Databricks cloud domain",
        )

    cfg_host = urlparse(os.getenv("DATABRICKS_HOST", "")).hostname
    if cfg_host and host != cfg_host.lower():
        raise HTTPException(
            status_code=400,
            detail=f"Genie URL host must match DATABRICKS_HOST ({cfg_host})",
        )

    headers = {"Authorization": f"Bearer {token}"}
    try:
        async with httpx.AsyncClient() as client:
            head = await client.head(url, headers=headers, follow_redirects=True, timeout=25.0)
            if head.status_code == 405:
                get = await client.get(
                    url, headers=headers, follow_redirects=True, timeout=25.0
                )
                code = get.status_code
            else:
                code = head.status_code
        if code >= 400:
            return GenieVerifyResponse(
                ok=False, statusCode=code, detail=f"Genie URL returned HTTP {code}"
            )
        return GenieVerifyResponse(ok=True, statusCode=code)
    except httpx.HTTPError as e:
        return GenieVerifyResponse(ok=False, detail=str(e))


@router.post("/adjudication/suggest", response_model=AdjudicationSuggestionResponse)
async def post_adjudication_suggest(
    body: AdjudicationSuggestionRequest,
) -> AdjudicationSuggestionResponse:
    """
    Near-real-time adjudication suggestion (approve / deny / request clarification).
    Uses SQL-selected policy chunks; optional Model Serving via DATABRICKS_ADJUDICATION_SUGGEST_URL
    or DATABRICKS_SERVING_ENDPOINT_URL. No Vector Search or Inference Tables.
    """
    try:
        service = ClaimsService()
        data = await service.suggest_adjudication_decision(body.claimId)
        return AdjudicationSuggestionResponse(**data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Adjudication suggest failed: {str(e)}")


@router.get("/adjudication/dashboard", response_model=AdjudicationDashboardData)
async def get_adjudication_dashboard() -> AdjudicationDashboardData:
    """
    Get complete adjudication dashboard data for PACT Act claims
    
    Returns:
        AdjudicationDashboardData: Complete dashboard with stats, pending, and high priority claims
    """
    try:
        service = ClaimsService()
        data = await service.get_adjudication_dashboard()
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch adjudication dashboard: {str(e)}")


@router.get("/adjudication/stats", response_model=AdjudicatorStats)
async def get_adjudicator_stats() -> AdjudicatorStats:
    """
    Get statistics for the current adjudicator
    
    Returns:
        AdjudicatorStats: Adjudicator performance statistics
    """
    try:
        service = ClaimsService()
        stats = await service.get_adjudicator_stats()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch adjudicator stats: {str(e)}")


@router.get("/adjudication/pending", response_model=List[PendingClaim])
async def get_pending_claims(limit: int = 50) -> List[PendingClaim]:
    """
    Get list of pending claims for adjudication
    
    Args:
        limit: Maximum number of claims to return
        
    Returns:
        List[PendingClaim]: List of pending claims
    """
    try:
        service = ClaimsService()
        claims = await service.get_pending_claims(limit=limit)
        return claims
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch pending claims: {str(e)}")


@router.get("/adjudication/high-priority", response_model=List[HighPriorityClaim])
async def get_high_priority_claims(limit: int = 20) -> List[HighPriorityClaim]:
    """
    Get high priority claims requiring immediate attention
    
    Args:
        limit: Maximum number of claims to return
        
    Returns:
        List[HighPriorityClaim]: List of high priority claims with AI summaries
    """
    try:
        service = ClaimsService()
        claims = await service.get_high_priority_claims(limit=limit)
        return claims
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch high priority claims: {str(e)}")


@router.get("/adjudication/pact-act-stats", response_model=PactActStats)
async def get_pact_act_stats() -> PactActStats:
    """
    Get PACT Act specific statistics
    
    Returns:
        PactActStats: PACT Act eligibility and exposure statistics
    """
    try:
        service = ClaimsService()
        stats = await service.get_pact_act_statistics()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch PACT Act stats: {str(e)}")


@router.get("/adjudication/claim/{claim_id}", response_model=ClaimDetail)
async def get_claim_detail(claim_id: str) -> ClaimDetail:
    """
    Get detailed information for a specific claim
    
    Args:
        claim_id: The claim ID to fetch details for
        
    Returns:
        ClaimDetail: Full claim details with evidence and history
    """
    try:
        service = ClaimsService()
        detail = await service.get_claim_detail(claim_id)
        return detail
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch claim detail: {str(e)}")


@router.post("/adjudication/claim/{claim_id}/action", response_model=ClaimActionResponse)
async def update_claim_status(
    claim_id: str,
    action_request: ClaimActionRequest = Body(...)
) -> ClaimActionResponse:
    """
    Update claim status based on adjudicator action
    
    Args:
        claim_id: The claim ID to update
        action_request: Action details (action, notes, adjudicatorId)
        
    Returns:
        ClaimActionResponse: Success status and new claim status
    """
    try:
        service = ClaimsService()
        result = await service.update_claim_status(
            claim_id=claim_id,
            action=action_request.action,
            notes=action_request.notes,
            adjudicator_id=action_request.adjudicatorId
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update claim status: {str(e)}")


class AgentEvaluationRequest(BaseModel):
    claimant_id: str


@router.post("/evaluate-agent")
async def evaluate_claim_with_agent(request: AgentEvaluationRequest):
    """
    Proxy endpoint to call Databricks VBA Claims Agent with streaming
    """
    databricks_token = os.getenv('DATABRICKS_TOKEN')
    if not databricks_token:
        raise HTTPException(status_code=500, detail="DATABRICKS_TOKEN environment variable not set")
    endpoint_url = os.getenv(
        "DATABRICKS_SERVING_ENDPOINT_URL",
        "https://e2-demo-field-eng.cloud.databricks.com/serving-endpoints/vba_claims_agent/invocations",
    )
    
    async def stream_response():
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                # Format for Databricks Agent Framework
                payload = {
                    "input": [{
                        "status": None,
                        "content": f"Evaluate the eligibility for claimant {request.claimant_id}",
                        "role": "user",
                        "type": "message"
                    }],
                    "max_output_tokens": 4000,
                    "stream": True
                }
                
                async with client.stream(
                    'POST',
                    endpoint_url,
                    json=payload,
                    headers={
                        'Content-Type': 'application/json',
                        'Authorization': f'Bearer {databricks_token}'
                    }
                ) as response:
                    response.raise_for_status()
                    
                    async for line in response.aiter_lines():
                        if line.strip():
                            # Forward SSE format as-is
                            yield f"{line}\n"
        except httpx.HTTPStatusError as e:
            error_msg = json.dumps({
                'id': 'error',
                'content': f'HTTP {e.response.status_code}: {str(e)}'
            })
            yield f"data: {error_msg}\n\n"
        except Exception as e:
            error_msg = json.dumps({
                'id': 'error', 
                'content': f'Error: {str(e)}'
            })
            yield f"data: {error_msg}\n\n"
    
    return StreamingResponse(
        stream_response(),
        media_type='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no'
        }
    )


