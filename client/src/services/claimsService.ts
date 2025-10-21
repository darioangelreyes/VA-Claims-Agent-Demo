/**
 * Claims Service - Fetches data from Databricks backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface ClaimMetrics {
  avgCycleTime: number;
  activeClaims: number;
  processingRate: number;
  veteranImpact: number;
}

export interface CriticalClaim {
  name: string;
  affected: number;
  days: number;
}

export interface VisibilityGap {
  provider: string;
  product: string;
  region: string;
  delay: number;
  risk: number;
}

export interface RegionDelay {
  name: string;
  normal: number;
  delayed: number;
}

export interface DashboardData {
  metrics: ClaimMetrics;
  criticalClaims: CriticalClaim[];
  visibilityGaps: VisibilityGap[];
  regionDelays: RegionDelay[];
  dataIntegrity: number;
  compliance: number;
}

/**
 * Fetch dashboard data from Databricks
 */
export async function fetchDashboardData(): Promise<DashboardData> {
  try {
    const response = await fetch(`${API_BASE_URL}/claims/dashboard`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch dashboard data: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    // Return mock data as fallback
    return getMockDashboardData();
  }
}

/**
 * Mock data for development/fallback
 */
function getMockDashboardData(): DashboardData {
  return {
    metrics: {
      avgCycleTime: 28.5,
      activeClaims: 534,
      processingRate: 67,
      veteranImpact: 186187,
    },
    criticalClaims: [
      { name: 'Disability Claims - Rating Delays', affected: 8847, days: 32 },
      { name: 'Healthcare Reimbursement', affected: 7234, days: 28 },
      { name: 'Education Benefits (GI Bill)', affected: 5621, days: 24 },
      { name: 'Pension Claims', affected: 4893, days: 26 },
      { name: 'Dependent Benefits', affected: 3756, days: 22 },
      { name: 'Home Loan Guarantees', affected: 3234, days: 29 },
      { name: 'Vocational Rehabilitation', affected: 2891, days: 31 },
      { name: 'Life Insurance Claims', affected: 2456, days: 27 },
    ],
    visibilityGaps: [
      { provider: 'VBA Regional Office', product: 'Disability Rating 100%', region: 'Southeast', delay: 42.8, risk: 25342 },
      { provider: 'VHA Medical Center', product: 'Prosthetics 50mg PE', region: 'Pacific Northwest', delay: 38.2, risk: 19320 },
      { provider: 'Benefits Administration', product: 'Education 30mg', region: 'New York/New Jersey', delay: 36.7, risk: 18495 },
      { provider: 'Regional Office Atlanta', product: 'Pension 20mg', region: 'Southeast', delay: 34.1, risk: 16850 },
      { provider: 'VBA Health', product: 'Caregiving 50mg', region: 'New England', delay: 33.8, risk: 23105 },
      { provider: 'Vocational Rehab', product: 'Employment 25mg', region: 'Midwest', delay: 29.4, risk: 18922 },
      { provider: 'Cardinal Health', product: 'Home Loans 10mg', region: 'Mid-Atlantic', delay: 27.9, risk: 16762 },
      { provider: 'Benefits Admin Corp', product: 'Survivors 90mg', region: 'Rocky Mountain', delay: 26.5, risk: 11452 },
      { provider: 'VHA Network', product: 'Mental Health 75mg', region: 'Southwest', delay: 25.8, risk: 14892 },
      { provider: 'Regional Processing', product: 'Burial Benefits 100mg', region: 'Central Plains', delay: 24.6, risk: 16602 },
    ],
    regionDelays: [
      { name: 'Region 4', normal: 23.2, delayed: 76.8 },
      { name: 'Region 6', normal: 31.5, delayed: 68.5 },
      { name: 'Region 2', normal: 42.8, delayed: 57.2 },
      { name: 'Region 3', normal: 48.3, delayed: 51.7 },
      { name: 'Region 5', normal: 52.1, delayed: 47.9 },
      { name: 'Region 1', normal: 61.4, delayed: 38.6 },
    ],
    dataIntegrity: 94.6,
    compliance: 92.1,
  };
}

