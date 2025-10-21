"""
Claims Router - Provides endpoints for VA Claims Dashboard
"""
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from pydantic import BaseModel
from server.services.claims_service import ClaimsService

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

