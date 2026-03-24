import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { fetchClaimsApi } from '@/lib/claimsApi';
import { GenieClaimsChat } from '@/components/GenieClaimsChat';

const GENIE_SPACE_URL = import.meta.env.VITE_GENIE_SPACE_URL as string | undefined;

interface PriorityClaim {
  claimId: string;
  veteranName: string;
  daysOpen: number;
  condition: string;
  status: string;
  reason: string;
  fraudScore: number;
  complianceScore: number;
  fraudReason?: string; // AI-generated reason for fraud score
}

interface DashboardData {
  myAssignedClaims: number;
  agingSummary: {
    under30Days: number;    // Fresh claims
    days30to60: number;     // Getting old
    over60Days: number;     // OVERDUE - need immediate action
  };
  currentClaim: {
    name: string;
    claimId: string;
    dateSubmitted: string;
    daysOpen: number;
    claimedConditions: string;
    currentStatus: string;
    pactAct: boolean;
    branch: string;
  };
  claimStatus: {
    pendingReview: number;
    awaitingEvidence: number;
    decisionReady: number;
    needsEvidence: number;
  };
  priorityClaims: number;
  priorityClaimsList: PriorityClaim[];
  allClaimsList: PriorityClaim[]; // All assigned claims (includes priority + non-priority)
  evidenceTracker: {
    serviceTreatmentRecord: boolean;
    vaExam: boolean;
    privateMedicalRecord: boolean;
    layWitnessStatement: boolean;
  };
  avgDecisionTime: number[];
}

const PactActAdjudicationDashboard = () => {
  const [selectedClaim, setSelectedClaim] = useState<PriorityClaim | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>('priority'); // 'priority', 'pendingReview', 'awaitingEvidence', 'decisionReady', 'needsEvidence', 'over100days', 'approaching60days', 'specificClaim'
  const [specificClaimIds, setSpecificClaimIds] = useState<string[]>([]); // For alert-based filtering
  const [processedClaimIds, setProcessedClaimIds] = useState<string[]>([]); // Track approved/denied claims (resets on refresh)
  
  // Form states for Deny and Request Evidence
  const [showDenyForm, setShowDenyForm] = useState(false);
  const [denyReason, setDenyReason] = useState('');
  const [denyDetails, setDenyDetails] = useState('');
  
  const [showEvidenceForm, setShowEvidenceForm] = useState(false);
  const [evidenceType, setEvidenceType] = useState('');
  const [evidenceDetails, setEvidenceDetails] = useState('');
  
  // Success notification state
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [successMessage, setSuccessMessage] = useState<{type: 'approved' | 'denied', claimId: string, veteranName: string} | null>(null);
  
  // Agent evaluation state
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationChunks, setEvaluationChunks] = useState<Array<{id: string, content: string}>>([]);
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [agentSteps, setAgentSteps] = useState<Array<{
    stepNumber: number;
    itemId: string;
    messages: Array<{role: string, content: string}>;
    functionCalls: Array<{name: string, callId: string, arguments: string}>;
    functionOutputs: Array<{callId: string, output: string}>;
    timestamp: string;
  }>>([]);
  const [showRawLogs, setShowRawLogs] = useState(true);

  const [timeseriesRows, setTimeseriesRows] = useState<
    Array<{
      weekStart: string;
      currentStatus: string;
      claimCount: number;
      pactEligibleCount: number;
    }>
  >([]);
  const [timeseriesLoading, setTimeseriesLoading] = useState(true);
  const [timeseriesError, setTimeseriesError] = useState<string | null>(null);
  const [trendsExpanded, setTrendsExpanded] = useState(true);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestResult, setSuggestResult] = useState<{
    decision: string;
    confidence: number;
    reasons: string[];
    citations: Array<{ chunkId?: string; title?: string; sourceUrl?: string }>;
    disclaimer: string;
    source: string;
  } | null>(null);
  
  const [data, setData] = useState<DashboardData>({
    myAssignedClaims: 45, // Total assigned claims (17 priority + 28 non-priority)
    agingSummary: {
      under30Days: 58,    // Fresh - normal processing time
      days30to60: 30,     // Getting old - need attention soon
      over60Days: 77,     // OVERDUE - urgent, SLA breach risk
    },
    currentClaim: {
      name: '',
      claimId: '',
      dateSubmitted: '',
      daysOpen: 0,
      claimedConditions: '',
      currentStatus: '',
      pactAct: false,
      branch: '',
    },
    claimStatus: {
      pendingReview: 47,
      awaitingEvidence: 55,
      decisionReady: 28,
      needsEvidence: 30,
    },
    priorityClaims: 17,
    priorityClaimsList: [
      { claimId: '123455709', veteranName: 'Mary D. Smith', daysOpen: 45, condition: 'Asthma/Rhinitis', status: 'Awaiting Evidence', reason: 'PACT Act - Burn Pit Exposure', fraudScore: 0.12, complianceScore: 87 },
      { claimId: '987654321', veteranName: 'John R. Williams', daysOpen: 78, condition: 'Lung Cancer', status: 'Decision Ready', reason: 'PACT Act - Over 60 days', fraudScore: 0.08, complianceScore: 95 },
      { claimId: '456789123', veteranName: 'Sarah M. Johnson', daysOpen: 92, condition: 'Chronic Bronchitis', status: 'Pending Review', reason: 'PACT Act - Over 90 days CRITICAL', fraudScore: 0.15, complianceScore: 82 },
      { claimId: '789123456', veteranName: 'Michael P. Davis', daysOpen: 67, condition: 'Sleep Apnea', status: 'Decision Ready', reason: 'PACT Act - Respiratory Issues', fraudScore: 0.05, complianceScore: 92 },
      { claimId: '321654987', veteranName: 'Jennifer L. Martinez', daysOpen: 55, condition: 'Sinusitis', status: 'Awaiting Evidence', reason: 'PACT Act - Missing VA Exam', fraudScore: 0.18, complianceScore: 78 },
      { claimId: '654321789', veteranName: 'Robert T. Anderson', daysOpen: 83, condition: 'COPD', status: 'Decision Ready', reason: 'PACT Act - Over 60 days', fraudScore: 0.22, complianceScore: 88, fraudReason: 'Minor inconsistencies in deployment timeline. Service dates show 8-month deployment, but medical records reference 12-month exposure period.' },
      { claimId: '147258369', veteranName: 'Lisa K. Thompson', daysOpen: 72, condition: 'Lung Disease', status: 'Pending Review', reason: 'PACT Act - Complex Case', fraudScore: 0.35, complianceScore: 72, fraudReason: 'Multiple red flags detected: Service records show non-combat MOS with limited field exposure. Medical evidence timing questionable - condition diagnosed 2 weeks after PACT Act announcement. Similar claim pattern detected from same medical provider.' },
      { claimId: '369258147', veteranName: 'David S. Wilson', daysOpen: 48, condition: 'Asthma', status: 'Awaiting Evidence', reason: 'PACT Act - Service Records Needed', fraudScore: 0.09, complianceScore: 90 },
      { claimId: '258147369', veteranName: 'Patricia A. Moore', daysOpen: 95, condition: 'Emphysema', status: 'Decision Ready', reason: 'PACT Act - Over 90 days CRITICAL', fraudScore: 0.11, complianceScore: 85 },
      { claimId: '741852963', veteranName: 'James B. Taylor', daysOpen: 61, condition: 'Chronic Cough', status: 'Pending Review', reason: 'PACT Act - Burn Pit Exposure', fraudScore: 0.28, complianceScore: 79, fraudReason: 'Deployment records incomplete. Unit assignment documentation shows primarily stateside duty, but claim asserts 18 months burn pit exposure. Medical provider has history of PACT Act claims with questionable documentation.' },
      { claimId: '852963741', veteranName: 'Linda C. Jackson', daysOpen: 58, condition: 'Respiratory Issues', status: 'Awaiting Evidence', reason: 'PACT Act - Medical Records Needed', fraudScore: 0.14, complianceScore: 83 },
      { claimId: '963852741', veteranName: 'William H. White', daysOpen: 88, condition: 'Lung Scarring', status: 'Decision Ready', reason: 'PACT Act - Over 60 days', fraudScore: 0.19, complianceScore: 86 },
      { claimId: '159357486', veteranName: 'Barbara E. Harris', daysOpen: 52, condition: 'Sinusitis', status: 'Pending Review', reason: 'PACT Act - Deployment Verification', fraudScore: 0.07, complianceScore: 91 },
      { claimId: '357159486', veteranName: 'Thomas G. Clark', daysOpen: 76, condition: 'Sleep Apnea', status: 'Decision Ready', reason: 'PACT Act - Over 60 days', fraudScore: 0.10, complianceScore: 89 },
      { claimId: '486159357', veteranName: 'Susan R. Lewis', daysOpen: 43, condition: 'Asthma', status: 'Awaiting Evidence', reason: 'PACT Act - Nexus Letter Needed', fraudScore: 0.13, complianceScore: 84 },
      { claimId: '789456123', veteranName: 'Charles D. Robinson', daysOpen: 101, condition: 'Lung Cancer', status: 'Decision Ready', reason: 'PACT Act - Over 100 days URGENT', fraudScore: 0.42, complianceScore: 68, fraudReason: 'HIGH RISK: Multiple serious inconsistencies detected. Service dates conflict with deployment records by 6 months. Medical evidence shows possible digital alteration (forensics confidence: 0.78). Veteran previously denied similar claim in 2019, new claim filed immediately after PACT Act with identical medical provider. Pattern matches known fraud ring (4 related cases identified).' },
      { claimId: '456123789', veteranName: 'Nancy M. Walker', daysOpen: 69, condition: 'COPD', status: 'Pending Review', reason: 'PACT Act - Complex Medical History', fraudScore: 0.16, complianceScore: 81 },
    ],
    allClaimsList: [
      // Priority claims (17 PACT Act claims)
      { claimId: '123455709', veteranName: 'Mary D. Smith', daysOpen: 45, condition: 'Asthma/Rhinitis', status: 'Awaiting Evidence', reason: 'PACT Act - Burn Pit Exposure', fraudScore: 0.12, complianceScore: 87 },
      { claimId: '987654321', veteranName: 'John R. Williams', daysOpen: 78, condition: 'Lung Cancer', status: 'Decision Ready', reason: 'PACT Act - Over 60 days', fraudScore: 0.08, complianceScore: 95 },
      { claimId: '456789123', veteranName: 'Sarah M. Johnson', daysOpen: 92, condition: 'Chronic Bronchitis', status: 'Pending Review', reason: 'PACT Act - Over 90 days CRITICAL', fraudScore: 0.15, complianceScore: 82 },
      { claimId: '789123456', veteranName: 'Michael P. Davis', daysOpen: 67, condition: 'Sleep Apnea', status: 'Decision Ready', reason: 'PACT Act - Respiratory Issues', fraudScore: 0.05, complianceScore: 92 },
      { claimId: '321654987', veteranName: 'Jennifer L. Martinez', daysOpen: 55, condition: 'Sinusitis', status: 'Awaiting Evidence', reason: 'PACT Act - Missing VA Exam', fraudScore: 0.18, complianceScore: 78 },
      { claimId: '654321789', veteranName: 'Robert T. Anderson', daysOpen: 83, condition: 'COPD', status: 'Decision Ready', reason: 'PACT Act - Over 60 days', fraudScore: 0.22, complianceScore: 88, fraudReason: 'Minor inconsistencies in deployment timeline. Service dates show 8-month deployment, but medical records reference 12-month exposure period.' },
      { claimId: '147258369', veteranName: 'Lisa K. Thompson', daysOpen: 72, condition: 'Lung Disease', status: 'Pending Review', reason: 'PACT Act - Complex Case', fraudScore: 0.35, complianceScore: 72, fraudReason: 'Multiple red flags detected: Service records show non-combat MOS with limited field exposure. Medical evidence timing questionable - condition diagnosed 2 weeks after PACT Act announcement. Similar claim pattern detected from same medical provider.' },
      { claimId: '369258147', veteranName: 'David S. Wilson', daysOpen: 48, condition: 'Asthma', status: 'Awaiting Evidence', reason: 'PACT Act - Service Records Needed', fraudScore: 0.09, complianceScore: 90 },
      { claimId: '258147369', veteranName: 'Patricia A. Moore', daysOpen: 95, condition: 'Emphysema', status: 'Decision Ready', reason: 'PACT Act - Over 90 days CRITICAL', fraudScore: 0.11, complianceScore: 85 },
      { claimId: '741852963', veteranName: 'James B. Taylor', daysOpen: 61, condition: 'Chronic Cough', status: 'Pending Review', reason: 'PACT Act - Burn Pit Exposure', fraudScore: 0.28, complianceScore: 79, fraudReason: 'Deployment records incomplete. Unit assignment documentation shows primarily stateside duty, but claim asserts 18 months burn pit exposure. Medical provider has history of PACT Act claims with questionable documentation.' },
      { claimId: '852963741', veteranName: 'Linda C. Jackson', daysOpen: 58, condition: 'Respiratory Issues', status: 'Awaiting Evidence', reason: 'PACT Act - Medical Records Needed', fraudScore: 0.14, complianceScore: 83 },
      { claimId: '963852741', veteranName: 'William H. White', daysOpen: 88, condition: 'Lung Scarring', status: 'Decision Ready', reason: 'PACT Act - Over 60 days', fraudScore: 0.19, complianceScore: 86 },
      { claimId: '159357486', veteranName: 'Barbara E. Harris', daysOpen: 52, condition: 'Sinusitis', status: 'Pending Review', reason: 'PACT Act - Deployment Verification', fraudScore: 0.07, complianceScore: 91 },
      { claimId: '357159486', veteranName: 'Thomas G. Clark', daysOpen: 76, condition: 'Sleep Apnea', status: 'Decision Ready', reason: 'PACT Act - Over 60 days', fraudScore: 0.10, complianceScore: 89 },
      { claimId: '486159357', veteranName: 'Susan R. Lewis', daysOpen: 43, condition: 'Asthma', status: 'Awaiting Evidence', reason: 'PACT Act - Nexus Letter Needed', fraudScore: 0.13, complianceScore: 84 },
      { claimId: '789456123', veteranName: 'Charles D. Robinson', daysOpen: 101, condition: 'Lung Cancer', status: 'Decision Ready', reason: 'PACT Act - Over 100 days URGENT', fraudScore: 0.42, complianceScore: 68, fraudReason: 'HIGH RISK: Multiple serious inconsistencies detected. Service dates conflict with deployment records by 6 months. Medical evidence shows possible digital alteration (forensics confidence: 0.78). Veteran previously denied similar claim in 2019, new claim filed immediately after PACT Act with identical medical provider. Pattern matches known fraud ring (4 related cases identified).' },
      { claimId: '456123789', veteranName: 'Nancy M. Walker', daysOpen: 69, condition: 'COPD', status: 'Pending Review', reason: 'PACT Act - Complex Medical History', fraudScore: 0.16, complianceScore: 81 },
      // Non-priority claims (regular claims - 28 additional)
      // Claims approaching 60-day deadline (53-59 days) - 5 claims
      { claimId: '111222333', veteranName: 'George K. Miller', daysOpen: 57, condition: 'Back Pain', status: 'Pending Review', reason: 'Standard - Approaching Deadline', fraudScore: 0.03, complianceScore: 94 },
      { claimId: '222333444', veteranName: 'Helen R. Brown', daysOpen: 54, condition: 'Knee Injury', status: 'Awaiting Evidence', reason: 'Standard - Medical Records', fraudScore: 0.04, complianceScore: 92 },
      { claimId: '333444555', veteranName: 'Ivan P. Carter', daysOpen: 56, condition: 'PTSD', status: 'Pending Review', reason: 'Standard - Mental Health Eval', fraudScore: 0.06, complianceScore: 88 },
      { claimId: '444555666', veteranName: 'Julia M. Evans', daysOpen: 58, condition: 'Hearing Loss', status: 'Decision Ready', reason: 'Standard - Audiogram Complete', fraudScore: 0.02, complianceScore: 96 },
      { claimId: '555666777', veteranName: 'Kevin L. Foster', daysOpen: 55, condition: 'Shoulder Injury', status: 'Decision Ready', reason: 'Standard - Complete File', fraudScore: 0.05, complianceScore: 93 },
      { claimId: '666777888', veteranName: 'Laura S. Green', daysOpen: 41, condition: 'Migraine', status: 'Pending Review', reason: 'Standard - Neurologist Review', fraudScore: 0.07, complianceScore: 89 },
      { claimId: '777888999', veteranName: 'Mark T. Hughes', daysOpen: 15, condition: 'Ankle Sprain', status: 'Awaiting Evidence', reason: 'Standard - X-rays Required', fraudScore: 0.03, complianceScore: 95 },
      { claimId: '888999111', veteranName: 'Nicole D. James', daysOpen: 33, condition: 'Tinnitus', status: 'Pending Review', reason: 'Standard - Service Connection', fraudScore: 0.08, complianceScore: 87 },
      { claimId: '999111222', veteranName: 'Oliver W. King', daysOpen: 25, condition: 'Carpal Tunnel', status: 'Decision Ready', reason: 'Standard - Ready for Decision', fraudScore: 0.04, complianceScore: 91 },
      { claimId: '101112131', veteranName: 'Paula V. Lewis', daysOpen: 19, condition: 'Arthritis', status: 'Awaiting Evidence', reason: 'Standard - Rheumatology Report', fraudScore: 0.05, complianceScore: 90 },
      { claimId: '121314151', veteranName: 'Quinn R. Mason', daysOpen: 37, condition: 'Depression', status: 'Pending Review', reason: 'Standard - Psychiatric Eval', fraudScore: 0.09, complianceScore: 85 },
      { claimId: '131415161', veteranName: 'Rachel N. Nelson', daysOpen: 29, condition: 'Hip Replacement', status: 'Decision Ready', reason: 'Standard - Complete Records', fraudScore: 0.06, complianceScore: 92 },
      { claimId: '141516171', veteranName: 'Samuel J. Owen', daysOpen: 14, condition: 'Vision Loss', status: 'Awaiting Evidence', reason: 'Standard - Ophthalmology Report', fraudScore: 0.03, complianceScore: 94 },
      { claimId: '151617181', veteranName: 'Teresa K. Parker', daysOpen: 31, condition: 'Diabetes', status: 'Pending Review', reason: 'Standard - Service Connection Review', fraudScore: 0.07, complianceScore: 88 },
      { claimId: '161718191', veteranName: 'Ulysses F. Quinn', daysOpen: 24, condition: 'Hypertension', status: 'Awaiting Evidence', reason: 'Standard - Blood Pressure Logs', fraudScore: 0.04, complianceScore: 93 },
      { claimId: '171819202', veteranName: 'Vanessa H. Reed', daysOpen: 38, condition: 'Sleep Disorder', status: 'Pending Review', reason: 'Standard - Sleep Study Results', fraudScore: 0.08, complianceScore: 86 },
      { claimId: '181920212', veteranName: 'Walter G. Scott', daysOpen: 21, condition: 'Elbow Injury', status: 'Decision Ready', reason: 'Standard - Ready for Approval', fraudScore: 0.02, complianceScore: 97 },
      { claimId: '192021222', veteranName: 'Xena L. Turner', daysOpen: 16, condition: 'Skin Condition', status: 'Awaiting Evidence', reason: 'Standard - Dermatology Report', fraudScore: 0.05, complianceScore: 91 },
      { claimId: '202122232', veteranName: 'Yolanda M. Upton', daysOpen: 42, condition: 'Fibromyalgia', status: 'Pending Review', reason: 'Standard - Pain Management Review', fraudScore: 0.11, complianceScore: 83 },
      { claimId: '212223242', veteranName: 'Zachary P. Valdez', daysOpen: 27, condition: 'TMJ Disorder', status: 'Awaiting Evidence', reason: 'Standard - Dental Records', fraudScore: 0.06, complianceScore: 89 },
      { claimId: '222324252', veteranName: 'Amy R. West', daysOpen: 20, condition: 'Sciatica', status: 'Decision Ready', reason: 'Standard - Complete Documentation', fraudScore: 0.03, complianceScore: 95 },
      { claimId: '232425262', veteranName: 'Benjamin S. Young', daysOpen: 34, condition: 'Anxiety', status: 'Pending Review', reason: 'Standard - Mental Health Assessment', fraudScore: 0.09, complianceScore: 84 },
      { claimId: '242526272', veteranName: 'Catherine T. Zhang', daysOpen: 13, condition: 'Wrist Injury', status: 'Awaiting Evidence', reason: 'Standard - MRI Results', fraudScore: 0.02, complianceScore: 96 },
      { claimId: '252627282', veteranName: 'Daniel U. Adams', daysOpen: 39, condition: 'Insomnia', status: 'Pending Review', reason: 'Standard - Sleep Clinic Report', fraudScore: 0.10, complianceScore: 82 },
      { claimId: '262728292', veteranName: 'Emily V. Baker', daysOpen: 26, condition: 'Foot Pain', status: 'Decision Ready', reason: 'Standard - Ready for Review', fraudScore: 0.04, complianceScore: 93 },
      { claimId: '272829303', veteranName: 'Frank W. Clark', daysOpen: 17, condition: 'Allergies', status: 'Awaiting Evidence', reason: 'Standard - Allergy Test Results', fraudScore: 0.03, complianceScore: 94 },
      { claimId: '282930313', veteranName: 'Grace X. Davis', daysOpen: 44, condition: 'Chronic Fatigue', status: 'Pending Review', reason: 'Standard - Comprehensive Exam', fraudScore: 0.12, complianceScore: 80 },
      { claimId: '293031323', veteranName: 'Henry Y. Ellis', daysOpen: 23, condition: 'Plantar Fasciitis', status: 'Awaiting Evidence', reason: 'Standard - Podiatry Report', fraudScore: 0.05, complianceScore: 90 },
    ],
    evidenceTracker: {
      serviceTreatmentRecord: true,
      vaExam: true,
      privateMedicalRecord: true,
      layWitnessStatement: true,
    },
    avgDecisionTime: [85, 82, 80, 83, 87, 90, 95],
  });

  const handleReviewClaim = (claim: PriorityClaim) => {
    setSelectedClaim(claim);
    // Populate the current claim section with this claim's data
    setData({
      ...data,
      currentClaim: {
        name: claim.veteranName,
        claimId: claim.claimId,
        dateSubmitted: '10/05/2023', // In real app, would come from API
        daysOpen: claim.daysOpen,
        claimedConditions: claim.condition,
        currentStatus: claim.status,
        pactAct: true,
        branch: 'Army', // In real app, would come from API
      }
    });
    
    // Clear evaluation when switching claims
    setShowEvaluation(false);
    setEvaluationChunks([]);
    setAgentSteps([]);
    
    // Scroll to the current claim section
    setTimeout(() => {
      document.getElementById('current-claim-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const handleNextClaim = () => {
    if (!selectedClaim) {
      alert('Please select a claim to review first');
      return;
    }
    // Get the currently filtered claims list
    const currentList = getFilteredClaims();
    // Find the current claim's index in the filtered list
    const currentIndex = currentList.findIndex(c => c.claimId === selectedClaim.claimId);
    if (currentIndex < currentList.length - 1) {
      // Move to the next claim
      const nextClaim = currentList[currentIndex + 1];
      handleReviewClaim(nextClaim);
    } else {
      alert('You are at the last claim in the current filtered list');
    }
  };

  const handlePreviousClaim = () => {
    if (!selectedClaim) {
      alert('Please select a claim to review first');
      return;
    }
    // Get the currently filtered claims list
    const currentList = getFilteredClaims();
    // Find the current claim's index in the filtered list
    const currentIndex = currentList.findIndex(c => c.claimId === selectedClaim.claimId);
    if (currentIndex > 0) {
      // Move to the previous claim
      const previousClaim = currentList[currentIndex - 1];
      handleReviewClaim(previousClaim);
    } else {
      alert('You are at the first claim in the current filtered list');
    }
  };

  const handleApproveClaim = () => {
    if (!selectedClaim) {
      alert('Please select a claim to review first');
      return;
    }
    const claimName = data.currentClaim.name;
    const claimId = data.currentClaim.claimId;
    
    // Add to processed claims list (will hide from table until refresh)
    setProcessedClaimIds(prev => [...prev, claimId]);
    
    // Show success notification
    setSuccessMessage({ type: 'approved', claimId, veteranName: claimName });
    setShowSuccessNotification(true);
    
    // Auto-hide notification after 3 seconds
    setTimeout(() => {
      setShowSuccessNotification(false);
    }, 3000);
    
    // The useEffect will automatically load the next claim since filteredClaims will update
  };

  const handleDenyClaim = () => {
    if (!selectedClaim) {
      alert('Please select a claim to review first');
      return;
    }
    const claimName = data.currentClaim.name;
    const claimId = data.currentClaim.claimId;
    
    // Add to processed claims list (will hide from table until refresh)
    setProcessedClaimIds(prev => [...prev, claimId]);
    
    // Show success notification
    setSuccessMessage({ type: 'denied', claimId, veteranName: claimName });
    setShowSuccessNotification(true);
    
    // Auto-hide notification after 3 seconds
    setTimeout(() => {
      setShowSuccessNotification(false);
    }, 3000);
    
    // The useEffect will automatically load the next claim since filteredClaims will update
  };

  const handleRequestEvidence = () => {
    if (!selectedClaim) {
      alert('Please select a claim to review first');
      return;
    }
    alert(`Requesting additional evidence for claim ${data.currentClaim.claimId}`);
    // API call to request evidence
  };

  const handleEvaluateClaim = async () => {
    if (!selectedClaim) {
      alert('Please select a claim to review first');
      return;
    }

    setIsEvaluating(true);
    setEvaluationChunks([]);
    setAgentSteps([]);
    setShowEvaluation(true);

    // NOTE: Using mock agent response for demo purposes since database IDs don't match UI claims
    // Simulating realistic agent workflow with function calls and analysis
    try {
      await simulateAgentEvaluation();
    } catch (error) {
      console.error('Error in agent evaluation:', error);
      setEvaluationChunks([{ 
        id: 'error', 
        content: `Error: ${error instanceof Error ? error.message : 'Failed to evaluate claim'}` 
      }]);
    } finally {
      setIsEvaluating(false);
    }

    // Scroll to evaluation section
    setTimeout(() => {
      document.getElementById('evaluation-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const simulateAgentEvaluation = async () => {
    const claimId = selectedClaim?.claimId || 'UNKNOWN';
    const veteranName = selectedClaim?.veteranName || 'Unknown Veteran';
    const condition = selectedClaim?.condition || 'respiratory condition';
    
    // Simulate streaming with realistic delays
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    
    // Step 1: Initial analysis
    const step1 = {
      stepNumber: 1,
      itemId: 'step-1',
      messages: [{
        role: 'assistant',
        content: `# Eligibility Evaluation for Claim ${claimId}

I'll conduct a comprehensive evaluation of this veteran's claim for ${condition} related to potential PACT Act exposure. Let me retrieve the necessary records from all available databases.`
      }],
      functionCalls: [],
      functionOutputs: [],
      timestamp: new Date().toISOString()
    };
    
    setAgentSteps([step1]);
    setEvaluationChunks([{ id: 'step-1', content: step1.messages[0].content }]);
    await delay(800);
    
    // Step 2: Service history retrieval
    const step2 = {
      stepNumber: 2,
      itemId: 'step-2',
      messages: [],
      functionCalls: [{
        name: 'retrieve_service_history',
        callId: 'call_001',
        arguments: JSON.stringify({ claimant_id: claimId, include_deployments: true }, null, 2)
      }],
      functionOutputs: [{
        callId: 'call_001',
        output: JSON.stringify({
          service_branch: 'Army',
          service_start: '2003-04-15',
          service_end: '2007-08-20',
          deployments: [
            {
              location: 'Iraq',
              start_date: '2004-03-01',
              end_date: '2005-02-28',
              unit: '3rd Infantry Division',
              burn_pit_exposure: true,
              airborne_hazards: ['particulate matter', 'sulfur dioxide']
            },
            {
              location: 'Afghanistan',
              start_date: '2006-01-15',
              end_date: '2006-12-30',
              unit: '101st Airborne Division',
              burn_pit_exposure: true,
              airborne_hazards: ['smoke', 'dust']
            }
          ],
          awards: ['Iraq Campaign Medal', 'Global War on Terrorism Service Medal'],
          discharge_status: 'Honorable'
        }, null, 2)
      }],
      timestamp: new Date().toISOString()
    };
    
    setAgentSteps(prev => [...prev, step2]);
    setEvaluationChunks(prev => [...prev, { 
      id: 'step-2', 
      content: `🔧 **Function Call**: retrieve_service_history()\n\`\`\`json\n${step2.functionCalls[0].arguments}\n\`\`\`` 
    }]);
    await delay(1000);
    
    // Step 3: Medical records retrieval
    const step3 = {
      stepNumber: 3,
      itemId: 'step-3',
      messages: [],
      functionCalls: [{
        name: 'retrieve_medical_records',
        callId: 'call_002',
        arguments: JSON.stringify({ 
          claimant_id: claimId, 
          condition_type: 'respiratory',
          include_diagnostics: true 
        }, null, 2)
      }],
      functionOutputs: [{
        callId: 'call_002',
        output: JSON.stringify({
          primary_diagnosis: 'Chronic Obstructive Pulmonary Disease (COPD)',
          icd10_code: 'J44.9',
          diagnosis_date: '2019-06-15',
          treating_physician: 'Dr. Sarah Johnson, VA Medical Center',
          symptoms: [
            'Persistent cough',
            'Shortness of breath',
            'Wheezing',
            'Chest tightness'
          ],
          diagnostic_tests: [
            {
              test_type: 'Pulmonary Function Test',
              date: '2019-06-10',
              result: 'FEV1 58% predicted - moderate obstruction'
            },
            {
              test_type: 'Chest X-Ray',
              date: '2019-06-12',
              result: 'Hyperinflation consistent with COPD'
            }
          ],
          treatment_history: 'Bronchodilators, corticosteroids, pulmonary rehabilitation',
          onset_correlation: 'Symptoms began approximately 12 years post-deployment'
        }, null, 2)
      }],
      timestamp: new Date().toISOString()
    };
    
    setAgentSteps(prev => [...prev, step3]);
    setEvaluationChunks(prev => [...prev, { 
      id: 'step-3', 
      content: `✅ **Function Output**: Medical records retrieved\n\`\`\`json\n${step3.functionOutputs[0].output.substring(0, 200)}...\n\`\`\`` 
    }]);
    await delay(1000);
    
    // Step 4: PACT Act policy check
    const step4 = {
      stepNumber: 4,
      itemId: 'step-4',
      messages: [],
      functionCalls: [{
        name: 'check_pact_act_eligibility',
        callId: 'call_003',
        arguments: JSON.stringify({ 
          deployments: ['Iraq', 'Afghanistan'],
          condition: 'COPD',
          exposure_types: ['burn_pit', 'airborne_hazards']
        }, null, 2)
      }],
      functionOutputs: [{
        callId: 'call_003',
        output: JSON.stringify({
          pact_act_eligible: true,
          qualifying_criteria: [
            'Service in designated Southwest Asia theater (Iraq) during qualifying period',
            'Service in Afghanistan during qualifying period',
            'Documented burn pit exposure at both deployment locations',
            'Respiratory condition on PACT Act presumptive conditions list'
          ],
          relevant_statute: '38 U.S.C. § 1116A - Presumptions of service connection for diseases associated with exposure to certain herbicide agents',
          policy_memo: 'VBA Policy Memo 21-04: Implementation of PACT Act Provisions',
          evidence_standard: 'Presumptive service connection - no nexus letter required'
        }, null, 2)
      }],
      timestamp: new Date().toISOString()
    };
    
    setAgentSteps(prev => [...prev, step4]);
    setEvaluationChunks(prev => [...prev, { 
      id: 'step-4', 
      content: `🔧 **PACT Act Policy Check**\n\`\`\`json\n${step4.functionOutputs[0].output}\n\`\`\`` 
    }]);
    await delay(1000);
    
    // Step 5: Final recommendation
    const step5 = {
      stepNumber: 5,
      itemId: 'step-5',
      messages: [{
        role: 'assistant',
        content: `# Final Evaluation Summary

## ✅ RECOMMENDATION: **APPROVE CLAIM**

### Evidence Analysis

**Service Connection Established:**
- ✅ Verified honorable service: ${veteranName} served in the U.S. Army from 2003-2007
- ✅ Two combat deployments with documented burn pit exposure (Iraq 2004-2005, Afghanistan 2006)
- ✅ Exposure to airborne hazards including particulate matter, sulfur dioxide, smoke, and dust

**Medical Evidence:**
- ✅ Current diagnosis: Chronic Obstructive Pulmonary Disease (COPD) - ICD-10: J44.9
- ✅ Diagnosis confirmed by pulmonary function testing (FEV1 58% predicted)
- ✅ Radiographic evidence supporting diagnosis
- ✅ Ongoing treatment documented

**PACT Act Eligibility:**
- ✅ Service in qualifying locations (Iraq & Afghanistan) during PACT Act covered periods
- ✅ COPD is on the PACT Act presumptive conditions list for burn pit exposure
- ✅ Meets all criteria for **presumptive service connection** under 38 U.S.C. § 1116A

### Compliance Score: **94/100** (Excellent)

**Rating Recommendation:** 
- Initial rating: **60%** based on moderate pulmonary obstruction (FEV1 58%)
- Eligible for future increases if condition worsens

### Required Actions:
1. ✅ No additional evidence needed - presumptive service connection applies
2. ✅ Proceed with approval
3. ✅ Schedule C&P exam for rating determination (already sufficient evidence for service connection)
4. ✅ Notify veteran of approval and effective date

**Processing Priority:** High - PACT Act claim with clear qualifying criteria

---

*This evaluation was conducted using the VBA Claims Agent Framework with access to integrated service history, medical records, and current PACT Act policy guidance.*`
      }],
      functionCalls: [],
      functionOutputs: [],
      timestamp: new Date().toISOString()
    };
    
    setAgentSteps(prev => [...prev, step5]);
    setEvaluationChunks(prev => [...prev, { id: 'step-5', content: step5.messages[0].content }]);
  };

  // Old real API call code - keeping for future use when database IDs are aligned
  const handleEvaluateClaimReal = async () => {
    try {
      const response = await fetchClaimsApi('/evaluate-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimant_id: selectedClaim?.claimId })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let currentChunkId = '';
      let currentContent = '';
      let currentStepNumber = 0;
      const stepsMap = new Map<string, any>();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (!line.trim()) continue;
            
            try {
              let parsed: any;
              
              // Handle SSE format (data: {...})
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;
                parsed = JSON.parse(data);
              } else {
                // Handle plain JSON
                parsed = JSON.parse(line);
              }
              
              // Handle different chunk types from Databricks Agent Framework
              const chunkType = parsed.type;
              const itemId = parsed.item_id || currentChunkId || 'step-1';
              
              // Initialize step if new item_id
              if (!stepsMap.has(itemId)) {
                currentStepNumber++;
                stepsMap.set(itemId, {
                  stepNumber: currentStepNumber,
                  itemId: itemId,
                  messages: [],
                  functionCalls: [],
                  functionOutputs: [],
                  timestamp: new Date().toISOString(),
                  streamingText: ''
                });
              }
              
              const currentStep = stepsMap.get(itemId);
              
              if (chunkType === 'response.content_part.delta') {
                // Accumulate streaming text
                const delta = parsed.delta || '';
                currentStep.streamingText += delta;
                
                // For evaluation chunks (keep existing behavior)
                if (itemId !== currentChunkId) {
                  if (currentContent) {
                    setEvaluationChunks(prev => [...prev, { id: currentChunkId, content: currentContent }]);
                  }
                  currentChunkId = itemId;
                  currentContent = delta;
                } else {
                  currentContent += delta;
                }
                
                setEvaluationChunks(prev => {
                  const filtered = prev.filter(c => c.id !== currentChunkId);
                  return [...filtered, { id: currentChunkId, content: currentContent }];
                });
                
              } else if (chunkType === 'response.output_item.done') {
                // Item completed - categorize it
                const item = parsed.item || {};
                
                if (item.type === 'message') {
                  const content = item.content || [];
                  let textContent = '';
                  
                  if (Array.isArray(content)) {
                    textContent = content.map((c: any) => c.text || '').join('\n');
                  } else if (typeof content === 'string') {
                    textContent = content;
                  }
                  
                  currentStep.messages.push({
                    role: item.role || 'assistant',
                    content: textContent || currentStep.streamingText
                  });
                  currentStep.streamingText = ''; // Clear streaming text
                  
                  if (textContent && !currentContent) {
                    setEvaluationChunks(prev => {
                      const filtered = prev.filter(c => c.id !== itemId);
                      return [...filtered, { id: itemId, content: textContent }];
                    });
                  }
                  
                } else if (item.type === 'function_call') {
                  const funcName = item.name || 'unknown';
                  const funcArgs = item.arguments || '{}';
                  const callId = item.call_id || item.id || 'unknown';
                  
                  currentStep.functionCalls.push({
                    name: funcName,
                    callId: callId,
                    arguments: funcArgs
                  });
                  
                  setEvaluationChunks(prev => {
                    const filtered = prev.filter(c => c.id !== itemId);
                    return [...filtered, { 
                      id: itemId, 
                      content: `🔧 Function Call: ${funcName}\nArguments: ${funcArgs}` 
                    }];
                  });
                  
                } else if (item.type === 'function_call_output') {
                  const output = item.output || '';
                  const callId = item.call_id || 'unknown';
                  
                  currentStep.functionOutputs.push({
                    callId: callId,
                    output: output
                  });
                  
                  setEvaluationChunks(prev => {
                    const filtered = prev.filter(c => c.id !== itemId);
                    return [...filtered, { 
                      id: itemId, 
                      content: `✅ Function Output:\n${output}` 
                    }];
                  });
                }
                
                // Update agentSteps state
                setAgentSteps(Array.from(stepsMap.values()));
              }
            } catch (e) {
              console.error('Error parsing chunk:', e, line);
            }
          }
        }

        // Final update
        if (currentContent) {
          setEvaluationChunks(prev => {
            const filtered = prev.filter(c => c.id !== currentChunkId);
            return [...filtered, { id: currentChunkId, content: currentContent }];
          });
        }
        
        // Final agent steps update
        setAgentSteps(Array.from(stepsMap.values()));
      }
    } catch (error) {
      console.error('Error evaluating claim:', error);
      setEvaluationChunks([{ 
        id: 'error', 
        content: `Error: ${error instanceof Error ? error.message : 'Failed to evaluate claim'}` 
      }]);
    } finally {
      setIsEvaluating(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setTimeseriesLoading(true);
      setTimeseriesError(null);
      try {
        const tsRes = await fetchClaimsApi('/adjudication/timeseries');
        if (tsRes.ok) {
          const ts = await tsRes.json();
          setTimeseriesRows(Array.isArray(ts) ? ts : []);
        } else {
          let msg = `HTTP ${tsRes.status}`;
          try {
            const errBody = (await tsRes.json()) as { detail?: string };
            if (typeof errBody?.detail === 'string') {
              msg = errBody.detail;
            }
          } catch {
            /* keep msg */
          }
          setTimeseriesError(msg);
          setTimeseriesRows([]);
        }
      } catch (error) {
        console.error('Error loading timeseries:', error);
        setTimeseriesError(error instanceof Error ? error.message : 'Network error');
        setTimeseriesRows([]);
      } finally {
        setTimeseriesLoading(false);
      }
    };
    void loadData();
  }, []);

  useEffect(() => {
    setSuggestResult(null);
  }, [selectedClaim?.claimId]);

  const chartData = (() => {
    const byWeek: Record<string, { weekStart: string; total: number; pact: number }> = {};
    for (const r of timeseriesRows) {
      const k = r.weekStart || 'unknown';
      if (!byWeek[k]) byWeek[k] = { weekStart: k, total: 0, pact: 0 };
      byWeek[k].total += r.claimCount;
      byWeek[k].pact += r.pactEligibleCount;
    }
    return Object.values(byWeek).sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  })();

  const runAdjudicationSuggest = async () => {
    if (!selectedClaim?.claimId) return;
    setSuggestLoading(true);
    setSuggestResult(null);
    try {
      const res = await fetchClaimsApi('/adjudication/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId: selectedClaim.claimId }),
      });
      if (res.ok) {
        setSuggestResult(await res.json());
      } else {
        setSuggestResult({
          decision: 'ERROR',
          confidence: 0,
          reasons: [`HTTP ${res.status}`],
          citations: [],
          disclaimer: '',
          source: 'error',
        });
      }
    } catch (e) {
      setSuggestResult({
        decision: 'ERROR',
        confidence: 0,
        reasons: [e instanceof Error ? e.message : 'Request failed'],
        citations: [],
        disclaimer: '',
        source: 'error',
      });
    } finally {
      setSuggestLoading(false);
    }
  };

  // Auto-load first claim when filter changes or claims are processed
  useEffect(() => {
    const currentFilteredClaims = getFilteredClaims();
    if (currentFilteredClaims.length > 0) {
      const firstClaim = currentFilteredClaims[0];
      setSelectedClaim(firstClaim);
      setData({
        ...data,
        currentClaim: {
          name: firstClaim.veteranName,
          claimId: firstClaim.claimId,
          dateSubmitted: '10/05/2023',
          daysOpen: firstClaim.daysOpen,
          claimedConditions: firstClaim.condition,
          currentStatus: firstClaim.status,
          pactAct: true,
          branch: 'Army',
        }
      });
    } else {
      // No more claims in this filter
      setSelectedClaim(null);
    }
  }, [selectedFilter, specificClaimIds, processedClaimIds]);

  // Calculate actual counts from ALL claims (excluding processed ones)
  const actualCounts = {
    priority: data.priorityClaimsList.filter(c => !processedClaimIds.includes(c.claimId)).length,
    pendingReview: data.allClaimsList.filter(c => c.status === 'Pending Review' && !processedClaimIds.includes(c.claimId)).length,
    awaitingEvidence: data.allClaimsList.filter(c => c.status === 'Awaiting Evidence' && !processedClaimIds.includes(c.claimId)).length,
    decisionReady: data.allClaimsList.filter(c => c.status === 'Decision Ready' && !processedClaimIds.includes(c.claimId)).length,
    needsEvidence: data.allClaimsList.filter(c => c.status === 'Needs Evidence' && !processedClaimIds.includes(c.claimId)).length,
  };

  const total = actualCounts.pendingReview + actualCounts.awaitingEvidence + actualCounts.decisionReady + actualCounts.needsEvidence;
  
  // Calculate remaining assigned claims
  const remainingAssignedClaims = data.myAssignedClaims - processedClaimIds.length;

  // Filter claims based on selected filter
  const getFilteredClaims = (): PriorityClaim[] => {
    let filtered: PriorityClaim[] = [];
    
    if (selectedFilter === 'priority') {
      filtered = data.priorityClaimsList; // Show only priority claims
    } else if (selectedFilter === 'over100days') {
      // Show claims over 100 days old
      filtered = data.allClaimsList.filter(claim => claim.daysOpen > 100);
    } else if (selectedFilter === 'approaching60days') {
      // Show claims between 53-59 days (approaching 60-day deadline)
      filtered = data.allClaimsList.filter(claim => claim.daysOpen >= 53 && claim.daysOpen < 60);
    } else if (selectedFilter === 'specificClaim') {
      // Show specific claims by ID (from alert clicks)
      filtered = data.allClaimsList.filter(claim => specificClaimIds.includes(claim.claimId));
    } else {
      // Filter by status from ALL claims
      filtered = data.allClaimsList.filter(claim => {
        if (selectedFilter === 'pendingReview') return claim.status === 'Pending Review';
        if (selectedFilter === 'awaitingEvidence') return claim.status === 'Awaiting Evidence';
        if (selectedFilter === 'decisionReady') return claim.status === 'Decision Ready';
        if (selectedFilter === 'needsEvidence') return claim.status === 'Needs Evidence';
        return true;
      });
    }
    
    // Exclude processed claims (approved/denied in this session)
    return filtered.filter(claim => !processedClaimIds.includes(claim.claimId));
  };

  const filteredClaims = getFilteredClaims();

  const getTableTitle = (): string => {
    if (selectedFilter === 'priority') return 'PRIORITY CLAIMS';
    if (selectedFilter === 'over100days') return 'CLAIMS OVER 100 DAYS OLD';
    if (selectedFilter === 'approaching60days') return 'CLAIMS APPROACHING 60-DAY DEADLINE';
    if (selectedFilter === 'specificClaim') return 'ALERT CLAIMS';
    if (selectedFilter === 'pendingReview') return 'PENDING REVIEW CLAIMS';
    if (selectedFilter === 'awaitingEvidence') return 'AWAITING EVIDENCE CLAIMS';
    if (selectedFilter === 'decisionReady') return 'DECISION READY CLAIMS';
    if (selectedFilter === 'needsEvidence') return 'NEEDS EVIDENCE CLAIMS';
    return 'CLAIMS';
  };

  // Check if specific alerts should be shown
  const showOver100DaysAlert = data.allClaimsList.some(c => c.daysOpen > 100 && !processedClaimIds.includes(c.claimId));
  const showApproaching60DaysAlert = data.allClaimsList.some(c => c.daysOpen >= 53 && c.daysOpen < 60 && !processedClaimIds.includes(c.claimId));
  const marySmithClaim = data.allClaimsList.find(c => c.veteranName === 'Mary D. Smith');
  const showMarySmithAlert = marySmithClaim && !processedClaimIds.includes(marySmithClaim.claimId);
  const johnWilliamsClaim = data.allClaimsList.find(c => c.veteranName === 'John R. Williams');
  const showJohnWilliamsAlert = johnWilliamsClaim && !processedClaimIds.includes(johnWilliamsClaim.claimId);

  // Alert handlers
  const handleOver100DaysAlert = () => {
    setSelectedFilter('over100days');
    // Scroll to table after a short delay to allow state update
    setTimeout(() => {
      document.getElementById('claims-table-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleApproaching60DaysAlert = () => {
    setSelectedFilter('approaching60days');
    setTimeout(() => {
      document.getElementById('claims-table-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleMarySmithAlert = () => {
    // Find Mary D. Smith's claim
    const marysClaim = data.allClaimsList.find(c => c.veteranName === 'Mary D. Smith');
    if (marysClaim) {
      setSpecificClaimIds([marysClaim.claimId]);
      setSelectedFilter('specificClaim');
      setTimeout(() => {
        document.getElementById('claims-table-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  const handleJohnWilliamsAlert = () => {
    // Find John R. Williams' claim
    const johnsClaim = data.allClaimsList.find(c => c.veteranName === 'John R. Williams');
    if (johnsClaim) {
      setSpecificClaimIds([johnsClaim.claimId]);
      setSelectedFilter('specificClaim');
      setTimeout(() => {
        document.getElementById('claims-table-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-[#09234c] text-white shadow-lg">
        <div className="max-w-[1600px] mx-auto px-8 py-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-wide">CLAIMS ADJUDICATION DASHBOARD</h1>
          <div className="flex items-center gap-4">
            {/* VA Logo */}
            <img 
              src="https://media.defense.gov/2020/Jul/17/2002459063/1920/1080/0/200717-D-OH989-0001.JPG" 
              alt="U.S. Department of Veterans Affairs" 
              className="h-20 w-auto"
            />
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-8 py-6">
        {/* Weekly trends — full width, collapsible (expanded by default) */}
        <div className="mb-6">
          <Card className="border-2 border-gray-300 bg-white shadow-md">
            <CardHeader className="space-y-1.5 pb-2">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 rounded-md py-1 text-left outline-none ring-offset-2 transition-colors hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-blue-600"
                onClick={() => setTrendsExpanded((e) => !e)}
                aria-expanded={trendsExpanded}
                aria-controls="claims-trends-panel"
              >
                <span className="text-lg font-bold tracking-wide text-gray-900">
                  CLAIMS TRENDS (weekly)
                </span>
                {trendsExpanded ? (
                  <ChevronUp className="h-5 w-5 shrink-0 text-gray-600" aria-hidden />
                ) : (
                  <ChevronDown className="h-5 w-5 shrink-0 text-gray-600" aria-hidden />
                )}
              </button>
              <p className="text-sm text-gray-600">
                From Unity Catalog gold_claims_timeseries after SDP run
              </p>
            </CardHeader>
            {trendsExpanded ? (
              <CardContent id="claims-trends-panel" className="h-72 pt-0">
                {timeseriesLoading ? (
                  <div className="flex h-full items-center justify-center text-sm text-gray-500">
                    Loading trends…
                  </div>
                ) : timeseriesError ? (
                  <div className="max-h-full space-y-2 overflow-auto pr-1 text-sm">
                    <p className="font-semibold text-red-700">Could not load weekly trends</p>
                    <p className="break-words text-gray-800">{timeseriesError}</p>
                    <p className="text-xs text-gray-500">
                      On the Databricks App, set <code className="bg-gray-100 px-1">DATABRICKS_TOKEN</code>,{' '}
                      <code className="bg-gray-100 px-1">DATABRICKS_HOST</code>, UC catalog/schema, and optionally{' '}
                      <code className="bg-gray-100 px-1">DATABRICKS_SQL_WAREHOUSE_ID</code> for SQL execution.
                      Ensure SDP has materialized <code className="bg-gray-100 px-1">gold_claims_timeseries</code>.
                    </p>
                  </div>
                ) : chartData.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No rows in gold_claims_timeseries — run the SDP pipeline for this Unity Catalog schema,
                    then refresh.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <XAxis dataKey="weekStart" tick={{ fontSize: 10 }} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="total" name="Claims" fill="#1e40af" />
                      <Bar dataKey="pact" name="PACT-eligible" fill="#059669" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            ) : null}
          </Card>
        </div>

        {/* TWO COLUMN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* LEFT COLUMN */}
          <div className="flex flex-col gap-6">
            {/* MY ASSIGNED CLAIMS */}
            <Card className="bg-white border-2 border-gray-300 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold">MY ASSIGNED CLAIMS</CardTitle>
                <p className="text-sm text-gray-600">Total claims in your queue</p>
              </CardHeader>
              <CardContent className="pt-2 pb-4">
                <div className="text-5xl font-bold text-gray-900">{remainingAssignedClaims}</div>
              </CardContent>
            </Card>

            {/* CLAIM STATUS */}
            <Card className="bg-white border-2 border-gray-300 shadow-md flex-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold">CLAIM STATUS</CardTitle>
                <p className="text-sm text-gray-600">Click any status to filter claims table below</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div 
                  className={`cursor-pointer transition-all ${selectedFilter === 'priority' ? 'bg-blue-50 p-3 -m-3 rounded-lg border-2 border-blue-400' : 'hover:bg-gray-50 p-3 -m-3 rounded-lg'}`}
                  onClick={() => setSelectedFilter('priority')}
                >
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-semibold text-blue-700">Priority Claims</span>
                    <span className="font-bold text-blue-900">{actualCounts.priority}</span>
                  </div>
                  <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="absolute left-0 h-full bg-blue-600 rounded-full"
                      style={{ width: `${(actualCounts.priority / total) * 100}%` }}
                    />
                  </div>
                </div>
                <div 
                  className={`cursor-pointer transition-all ${selectedFilter === 'pendingReview' ? 'bg-blue-50 p-3 -m-3 rounded-lg border-2 border-blue-400' : 'hover:bg-gray-50 p-3 -m-3 rounded-lg'}`}
                  onClick={() => setSelectedFilter('pendingReview')}
                >
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-700">Pending Review</span>
                    <span className="font-semibold text-gray-900">{actualCounts.pendingReview}</span>
                  </div>
                  <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="absolute left-0 h-full bg-blue-600 rounded-full"
                      style={{ width: `${(actualCounts.pendingReview / total) * 100}%` }}
                    />
                  </div>
                </div>
                <div 
                  className={`cursor-pointer transition-all ${selectedFilter === 'awaitingEvidence' ? 'bg-blue-50 p-3 -m-3 rounded-lg border-2 border-blue-400' : 'hover:bg-gray-50 p-3 -m-3 rounded-lg'}`}
                  onClick={() => setSelectedFilter('awaitingEvidence')}
                >
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-700">Awaiting Evidence</span>
                    <span className="font-semibold text-gray-900">{actualCounts.awaitingEvidence}</span>
                  </div>
                  <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="absolute left-0 h-full bg-blue-600 rounded-full"
                      style={{ width: `${(actualCounts.awaitingEvidence / total) * 100}%` }}
                    />
                  </div>
                </div>
                <div 
                  className={`cursor-pointer transition-all ${selectedFilter === 'decisionReady' ? 'bg-blue-50 p-3 -m-3 rounded-lg border-2 border-blue-400' : 'hover:bg-gray-50 p-3 -m-3 rounded-lg'}`}
                  onClick={() => setSelectedFilter('decisionReady')}
                >
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-700">Decision Ready</span>
                    <span className="font-semibold text-gray-900">{actualCounts.decisionReady}</span>
                  </div>
                  <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="absolute left-0 h-full bg-blue-600 rounded-full"
                      style={{ width: `${(actualCounts.decisionReady / total) * 100}%` }}
                    />
                  </div>
                </div>
                <div 
                  className={`cursor-pointer transition-all ${selectedFilter === 'needsEvidence' ? 'bg-blue-50 p-3 -m-3 rounded-lg border-2 border-blue-400' : 'hover:bg-gray-50 p-3 -m-3 rounded-lg'}`}
                  onClick={() => setSelectedFilter('needsEvidence')}
                >
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-700">Needs Evidence</span>
                    <span className="font-semibold text-gray-900">{actualCounts.needsEvidence}</span>
                  </div>
                  <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="absolute left-0 h-full bg-blue-600 rounded-full"
                      style={{ width: `${(actualCounts.needsEvidence / total) * 100}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN - ALERTS */}
          <div className="flex flex-col gap-6">
            <Card className="bg-white border-2 border-orange-300 shadow-md flex-1">
              <CardHeader className="pb-3 bg-orange-50">
                <CardTitle className="text-lg font-bold text-orange-900">ALERTS</CardTitle>
                <p className="text-sm text-orange-700">Important updates requiring your attention</p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-200">
                  {/* Critical Alert */}
                  {showOver100DaysAlert && (
                    <div 
                      onClick={handleOver100DaysAlert}
                      className="p-4 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer border-l-4 border-red-600"
                    >
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-red-600 rounded-full mt-2 animate-pulse"></div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className="bg-red-600 text-white text-xs font-bold">CRITICAL</Badge>
                          <span className="text-xs text-gray-600">2 min ago</span>
                        </div>
                        <div className="text-sm font-semibold text-gray-900">1 claim over 100 days old requires immediate action</div>
                        <div className="text-xs text-gray-600 mt-1">Charles Robinson (101 days)</div>
                      </div>
                    </div>
                    </div>
                  )}

                  {/* High Priority Alert */}
                  {showMarySmithAlert && (
                    <div 
                      onClick={handleMarySmithAlert}
                      className="p-4 bg-yellow-50 hover:bg-yellow-100 transition-colors cursor-pointer border-l-4 border-yellow-600"
                    >
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-yellow-600 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className="bg-yellow-600 text-white text-xs font-bold">HIGH</Badge>
                          <span className="text-xs text-gray-600">15 min ago</span>
                        </div>
                        <div className="text-sm font-semibold text-gray-900">New evidence uploaded for Mary D. Smith</div>
                        <div className="text-xs text-gray-600 mt-1">Medical records and VA exam results now available for review</div>
                      </div>
                    </div>
                    </div>
                  )}

                  {/* Warning Alert */}
                  {showApproaching60DaysAlert && (
                    <div 
                      onClick={handleApproaching60DaysAlert}
                      className="p-4 hover:bg-orange-50 transition-colors cursor-pointer border-l-4 border-orange-400"
                    >
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-orange-400 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="border-orange-400 text-orange-700 text-xs font-bold">WARNING</Badge>
                          <span className="text-xs text-gray-600">1 hour ago</span>
                        </div>
                        <div className="text-sm font-semibold text-gray-900">5 claims approaching 60-day deadline</div>
                        <div className="text-xs text-gray-600 mt-1">These claims need decisions within 7 days to avoid SLA breach</div>
                      </div>
                    </div>
                    </div>
                  )}

                  {/* Info Alert */}
                  {showJohnWilliamsAlert && (
                    <div 
                      onClick={handleJohnWilliamsAlert}
                      className="p-4 hover:bg-gray-50 transition-colors cursor-pointer border-l-4 border-blue-400"
                    >
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="border-blue-400 text-blue-700 text-xs font-bold">INFO</Badge>
                          <span className="text-xs text-gray-600">3 hours ago</span>
                        </div>
                        <div className="text-sm font-semibold text-gray-900">Supervisor comment on John Williams claim</div>
                        <div className="text-xs text-gray-600 mt-1">"Please verify burn pit exposure dates before approval"</div>
                      </div>
                    </div>
                    </div>
                  )}

                  {/* System Alert */}
                  <div className="p-4 hover:bg-gray-50 transition-colors cursor-pointer border-l-4 border-gray-400">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-gray-400 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="border-gray-400 text-gray-700 text-xs font-bold">SYSTEM</Badge>
                          <span className="text-xs text-gray-600">Today 9:00 AM</span>
                        </div>
                        <div className="text-sm font-semibold text-gray-900">New PACT Act guidelines published</div>
                        <div className="text-xs text-gray-600 mt-1">Updated presumptive conditions list effective immediately - review before processing</div>
                      </div>
                    </div>
                  </div>

                  {/* Success Alert */}
                  <div className="p-4 hover:bg-gray-50 transition-colors cursor-pointer border-l-4 border-green-400">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="border-green-400 text-green-700 text-xs font-bold">SUCCESS</Badge>
                          <span className="text-xs text-gray-600">Today 8:30 AM</span>
                        </div>
                        <div className="text-sm font-semibold text-gray-900">You've completed 12 claims today</div>
                        <div className="text-xs text-gray-600 mt-1">Great work! You're 20% ahead of your daily target</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CLAIMS TABLE - FULL WIDTH (Filtered based on selected status) */}
        <div id="claims-table-section" className="mb-6">
          <Card className="bg-white border-2 border-blue-400 shadow-xl">
            <CardHeader className="bg-blue-50 border-b-2 border-blue-200">
              <div>
                <CardTitle className="text-2xl font-bold text-blue-900">{getTableTitle()} ({filteredClaims.length})</CardTitle>
                <p className="text-sm text-blue-700 mt-1">
                  {selectedFilter === 'priority' 
                    ? 'All urgent PACT Act claims requiring immediate attention - click Review to take action'
                    : `Showing claims with status: ${getTableTitle().replace(' CLAIMS', '').toLowerCase()}`
                  }
                </p>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b-2 border-gray-300 sticky top-0">
                    <tr>
                      <th className="text-left p-4 text-sm font-bold text-gray-700">CLAIM ID</th>
                      <th className="text-left p-4 text-sm font-bold text-gray-700">VETERAN NAME</th>
                      <th className="text-left p-4 text-sm font-bold text-gray-700">DAYS OPEN</th>
                      <th className="text-left p-4 text-sm font-bold text-gray-700">CONDITION</th>
                      <th className="text-left p-4 text-sm font-bold text-gray-700">STATUS</th>
                      <th className="text-left p-4 text-sm font-bold text-gray-700">FRAUD SCORE</th>
                      <th className="text-left p-4 text-sm font-bold text-gray-700">COMPLIANCE</th>
                      <th className="text-left p-4 text-sm font-bold text-gray-700">PRIORITY REASON</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredClaims.map((claim) => (
                      <tr 
                        key={claim.claimId} 
                        onClick={() => handleReviewClaim(claim)}
                        className="cursor-pointer hover:bg-blue-50 transition-colors"
                      >
                        <td className="p-4 text-sm font-mono text-gray-900">{claim.claimId}</td>
                        <td className="p-4 text-sm font-semibold text-gray-900">{claim.veteranName}</td>
                        <td className="p-4">
                          <Badge 
                            variant={claim.daysOpen > 90 ? "destructive" : claim.daysOpen > 60 ? "default" : "secondary"}
                            className={claim.daysOpen > 90 ? "bg-red-600" : claim.daysOpen > 60 ? "bg-yellow-600" : "bg-green-600"}
                          >
                            {claim.daysOpen} days
                          </Badge>
                        </td>
                        <td className="p-4 text-sm text-gray-900">{claim.condition}</td>
                        <td className="p-4">
                          <Badge 
                            variant="outline"
                            className={
                              claim.status === 'Decision Ready' ? 'border-green-500 text-green-700' :
                              claim.status === 'Pending Review' ? 'border-yellow-500 text-yellow-700' :
                              'border-blue-500 text-blue-700'
                            }
                          >
                            {claim.status}
                          </Badge>
                        </td>
                        <td className="p-4 text-sm text-gray-900">
                          {(claim.fraudScore * 100).toFixed(0)}%
                        </td>
                        <td className="p-4 text-sm text-gray-900">
                          {claim.complianceScore}%
                        </td>
                        <td className="p-4 text-sm text-gray-700">{claim.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CURRENT CLAIM - TAKE ACTION (AT THE BOTTOM) */}
        <div id="current-claim-section">
          <Card className={`bg-white border-2 shadow-lg ${selectedClaim ? 'border-blue-400' : 'border-gray-300'}`}>
            <CardHeader className={`pb-3 ${selectedClaim ? 'bg-blue-50' : 'bg-gray-50'}`}>
              <CardTitle className={`text-lg font-bold ${selectedClaim ? 'text-blue-900' : 'text-gray-500'}`}>
                CURRENT CLAIM - TAKE ACTION
              </CardTitle>
              <p className={`text-sm ${selectedClaim ? 'text-blue-700' : 'text-gray-500'}`}>
                {selectedClaim ? 'Review the claim details below and choose an action' : 'Click "Review" on any priority claim above to begin'}
              </p>
            </CardHeader>
            <CardContent className="pt-4">
              {selectedClaim ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* LEFT — Claim & veteran */}
                    <div className="space-y-6 lg:col-span-2">
                      <div className="rounded-lg bg-gray-50 p-6">
                        <h3 className="mb-4 text-sm font-bold text-gray-500">Claim Information</h3>
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <div className="mb-1 text-xs text-gray-500">Claim ID</div>
                            <div className="text-base font-semibold text-gray-900">{data.currentClaim.claimId}</div>
                          </div>
                          <div>
                            <div className="mb-1 text-xs text-gray-500">Days Open</div>
                            <div
                              className={`text-base font-semibold ${data.currentClaim.daysOpen > 60 ? 'text-red-600' : data.currentClaim.daysOpen > 30 ? 'text-yellow-600' : 'text-green-600'}`}
                            >
                              {data.currentClaim.daysOpen} days
                            </div>
                          </div>
                          <div>
                            <div className="mb-1 text-xs text-gray-500">Submission Date</div>
                            <div className="text-base text-gray-900">{data.currentClaim.dateSubmitted}</div>
                          </div>
                          <div>
                            <div className="mb-1 text-xs text-gray-500">Status</div>
                            <Badge className="border-0 bg-blue-100 text-blue-800">{data.currentClaim.currentStatus}</Badge>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-lg bg-gray-50 p-6">
                        <h3 className="mb-4 text-sm font-bold text-gray-500">Veteran Information</h3>
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <div className="mb-1 text-xs text-gray-500">Veteran Name</div>
                            <div className="text-base font-semibold text-gray-900">{data.currentClaim.name}</div>
                          </div>
                          <div>
                            <div className="mb-1 text-xs text-gray-500">Branch of Service</div>
                            <div className="text-base text-gray-900">{data.currentClaim.branch}</div>
                          </div>
                          <div className="col-span-2">
                            <div className="mb-1 text-xs text-gray-500">Claimed Condition</div>
                            <div className="text-base text-gray-900">{data.currentClaim.claimedConditions}</div>
                          </div>
                          {data.currentClaim.pactAct && (
                            <div className="col-span-2">
                              <Badge className="bg-blue-600 px-4 py-1 text-sm font-bold text-white">PACT ACT</Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* RIGHT — Compliance & fraud only */}
                    <div className="space-y-4">
                      <div className="rounded-lg bg-gray-50 p-6">
                        <h3 className="mb-4 text-sm font-bold text-gray-500">Compliance</h3>

                        <div className="flex flex-col items-center">
                          <div className="relative h-32 w-32">
                            <svg className="h-32 w-32 -rotate-90 transform">
                              <circle cx="64" cy="64" r="56" stroke="#e5e7eb" strokeWidth="12" fill="none" />
                              <circle
                                cx="64"
                                cy="64"
                                r="56"
                                stroke={
                                  selectedClaim.complianceScore >= 90
                                    ? '#10b981'
                                    : selectedClaim.complianceScore >= 75
                                      ? '#f59e0b'
                                      : '#ef4444'
                                }
                                strokeWidth="12"
                                fill="none"
                                strokeDasharray={`${(selectedClaim.complianceScore / 100) * 351.86} 351.86`}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <div className="text-3xl font-bold text-gray-900">{selectedClaim.complianceScore}</div>
                              <div className="text-xs uppercase text-gray-500">
                                {selectedClaim.complianceScore >= 90
                                  ? 'HIGH'
                                  : selectedClaim.complianceScore >= 75
                                    ? 'MEDIUM'
                                    : 'LOW'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-lg bg-gray-50 p-6">
                        <h3 className="mb-4 text-sm font-bold text-gray-500">Fraud Score</h3>

                        <div className="mb-4 flex flex-col items-center">
                          <div className="mb-1 text-4xl font-bold text-gray-900">
                            {(selectedClaim.fraudScore * 100).toFixed(0)}%
                          </div>
                          <div
                            className={`text-sm font-semibold ${selectedClaim.fraudScore > 0.3 ? 'text-red-600' : selectedClaim.fraudScore > 0.15 ? 'text-yellow-600' : 'text-green-600'}`}
                          >
                            {selectedClaim.fraudScore > 0.3
                              ? 'HIGH RISK'
                              : selectedClaim.fraudScore > 0.15
                                ? 'MEDIUM RISK'
                                : 'LOW RISK'}
                          </div>
                        </div>

                        {selectedClaim.fraudScore > 0.2 && (
                          <>
                            <h4 className="mb-3 border-t border-gray-200 pt-4 text-xs font-bold text-gray-500">
                              AI Fraud Analysis:
                            </h4>
                            {selectedClaim.fraudReason ? (
                              <div className="mb-3 rounded border border-gray-300 bg-white p-3">
                                <p className="text-sm leading-relaxed text-gray-700">{selectedClaim.fraudReason}</p>
                              </div>
                            ) : (
                              <ul className="space-y-2">
                                {selectedClaim.fraudScore > 0.3 && (
                                  <li className="text-sm text-gray-600">• High fraud risk detected</li>
                                )}
                                {selectedClaim.complianceScore < 75 && (
                                  <li className="text-sm text-gray-600">• Low compliance score</li>
                                )}
                                {data.currentClaim.daysOpen > 60 && (
                                  <li className="text-sm text-gray-600">• Claim overdue for review</li>
                                )}
                              </ul>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bottom row: Take Action (left) + AI Decision Support (right) */}
                  <div className="grid grid-cols-1 gap-6 border-t border-gray-200 pt-6 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                      <h3 className="mb-3 text-center text-sm font-bold text-gray-800 lg:text-left">TAKE ACTION</h3>
              <div className="pt-0">
                <div className="mb-3 text-center text-sm font-bold text-gray-700">ADJUDICATOR ACTIONS:</div>
                
                {/* Evaluate Claim Button - Prominent */}
                <div className="flex justify-center mb-4">
                  <Button 
                    onClick={handleEvaluateClaim}
                    disabled={isEvaluating}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-12 py-6 text-lg"
                  >
                    {isEvaluating ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        EVALUATING...
                      </>
                    ) : (
                      <>
                        <FileText className="w-5 h-5 mr-2" />
                        EVALUATE THIS CLAIM
                      </>
                    )}
                  </Button>
                </div>

                <div className="mb-3 flex flex-wrap justify-center gap-3">
                  <Button 
                    onClick={handleApproveClaim}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold px-8"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    APPROVE
                  </Button>
                  <Button 
                    onClick={() => setShowDenyForm(!showDenyForm)}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold px-8"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    DENY
                  </Button>
                  <Button 
                    onClick={() => setShowEvidenceForm(!showEvidenceForm)}
                    variant="outline"
                    className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-bold px-8"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    REQUEST MORE EVIDENCE
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="border-2 border-indigo-700 bg-indigo-50 font-bold text-indigo-900 hover:bg-indigo-100 px-8"
                    disabled={!selectedClaim || suggestLoading}
                    onClick={() => void runAdjudicationSuggest()}
                    title="Policy-grounded adjudication suggestion for the selected claim"
                  >
                    {suggestLoading ? 'Working…' : 'AI DECISION'}
                  </Button>
                </div>

                {/* DENY FORM */}
                {showDenyForm && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-3">
                    <div className="text-sm font-bold text-gray-700 mb-2">Reason for Denial:</div>
                    <select 
                      value={denyReason}
                      onChange={(e) => setDenyReason(e.target.value)}
                      className="w-full mb-3 p-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">Select a reason...</option>
                      <option value="insufficient_evidence">Insufficient Medical Evidence</option>
                      <option value="no_service_connection">No Service Connection Established</option>
                      <option value="condition_preexisting">Condition Pre-existed Service</option>
                      <option value="incomplete_application">Incomplete Application</option>
                      <option value="fraud_detected">Fraud Detected</option>
                      <option value="other">Other</option>
                    </select>
                    <div className="text-sm font-bold text-gray-700 mb-2">Additional Details (Optional):</div>
                    <textarea
                      value={denyDetails}
                      onChange={(e) => setDenyDetails(e.target.value)}
                      placeholder="Add any additional notes or details..."
                      className="w-full p-2 border border-gray-300 rounded-md text-sm mb-3 h-20 resize-none"
                    />
                    <div className="flex justify-end gap-2">
                      <Button 
                        onClick={() => {
                          setShowDenyForm(false);
                          setDenyReason('');
                          setDenyDetails('');
                        }}
                        variant="outline"
                        className="text-sm"
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={() => {
                          if (!denyReason) {
                            alert('Please select a reason for denial');
                            return;
                          }
                          handleDenyClaim();
                          setShowDenyForm(false);
                          setDenyReason('');
                          setDenyDetails('');
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white text-sm"
                      >
                        Confirm Denial
                      </Button>
                    </div>
                  </div>
                )}

                {/* REQUEST EVIDENCE FORM */}
                {showEvidenceForm && (
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-3">
                    <div className="text-sm font-bold text-gray-700 mb-2">Type of Evidence Required:</div>
                    <select 
                      value={evidenceType}
                      onChange={(e) => setEvidenceType(e.target.value)}
                      className="w-full mb-3 p-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">Select evidence type...</option>
                      <option value="medical_records">Additional Medical Records</option>
                      <option value="service_records">Service Records</option>
                      <option value="nexus_letter">Nexus Letter</option>
                      <option value="buddy_statement">Buddy Statement</option>
                      <option value="lay_statement">Lay Statement</option>
                      <option value="employment_records">Employment Records</option>
                      <option value="other">Other Documentation</option>
                    </select>
                    <div className="text-sm font-bold text-gray-700 mb-2">Specific Details (Optional):</div>
                    <textarea
                      value={evidenceDetails}
                      onChange={(e) => setEvidenceDetails(e.target.value)}
                      placeholder="Describe what specific evidence is needed..."
                      className="w-full p-2 border border-gray-300 rounded-md text-sm mb-3 h-20 resize-none"
                    />
                    <div className="flex justify-end gap-2">
                      <Button 
                        onClick={() => {
                          setShowEvidenceForm(false);
                          setEvidenceType('');
                          setEvidenceDetails('');
                        }}
                        variant="outline"
                        className="text-sm"
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={() => {
                          if (!evidenceType) {
                            alert('Please select an evidence type');
                            return;
                          }
                          handleRequestEvidence();
                          setShowEvidenceForm(false);
                          setEvidenceType('');
                          setEvidenceDetails('');
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
                      >
                        Submit Request
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* NAVIGATION BUTTONS */}
                <div className="flex justify-center gap-3 pt-3 border-t border-gray-200">
                  <Button 
                    onClick={handlePreviousClaim}
                    className="bg-gray-600 hover:bg-gray-700 text-white font-bold px-8"
                  >
                    ← PREVIOUS CLAIM
                  </Button>
                  <Button 
                    onClick={handleNextClaim}
                    className="bg-gray-600 hover:bg-gray-700 text-white font-bold px-8"
                  >
                    NEXT CLAIM →
                  </Button>
                </div>
              </div>
                    </div>

                    {/* AI suggestion results only — trigger is AI DECISION in Take Action */}
                    {suggestResult ? (
                      <div className="self-start space-y-2 rounded-lg border-2 border-blue-200 bg-white p-3 text-sm shadow-sm lg:sticky lg:top-4">
                        <div>
                          <strong>Decision:</strong> {suggestResult.decision}{' '}
                          <span className="text-gray-600">
                            (confidence {(suggestResult.confidence * 100).toFixed(0)}%)
                          </span>
                        </div>
                        <div>
                          <strong>Reasons:</strong>
                          <ul className="list-disc pl-5">
                            {suggestResult.reasons.map((r, i) => (
                              <li key={i}>{r}</li>
                            ))}
                          </ul>
                        </div>
                        {suggestResult.citations?.length ? (
                          <div>
                            <strong>Citations:</strong>
                            <ul className="list-disc pl-5">
                              {suggestResult.citations.map((c, i) => (
                                <li key={i}>
                                  {c.title || c.chunkId}
                                  {c.sourceUrl ? (
                                    <>
                                      {' '}
                                      <a
                                        href={c.sourceUrl}
                                        className="text-blue-700 underline"
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        source
                                      </a>
                                    </>
                                  ) : null}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        <p className="text-xs text-gray-600">{suggestResult.disclaimer}</p>
                        <p className="text-xs text-gray-400">Source: {suggestResult.source}</p>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📋</div>
                  <div className="text-lg font-semibold text-gray-500 mb-2">No Claim Selected</div>
                  <div className="text-sm text-gray-400">Select a claim from the Priority Claims table above to begin reviewing</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* AGENT EVALUATION RESULTS */}
        {showEvaluation && (
          <div id="evaluation-section" className="mb-6">
            <Card className="bg-white border-2 border-purple-400 shadow-xl">
              <CardHeader className="bg-purple-50 border-b-2 border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl font-bold text-purple-900">
                      AI AGENT EVALUATION
                    </CardTitle>
                    <p className="text-sm text-purple-700 mt-1">
                      Real-time analysis from VBA Claims Agent for Claim {selectedClaim?.claimId}
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowEvaluation(false)}
                    variant="outline"
                    className="border-purple-400 text-purple-700 hover:bg-purple-100"
                  >
                    Close
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {evaluationChunks.length === 0 && isEvaluating && (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-900 mx-auto mb-4"></div>
                      <p className="text-gray-600">Connecting to AI agent...</p>
                    </div>
                  </div>
                )}
                
                <div className="space-y-4">
                  {evaluationChunks.map((chunk, index) => (
                    <div key={index} className="border-l-4 border-purple-400 bg-purple-50 rounded-r-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge className="bg-purple-600 text-white text-xs font-bold">
                          STEP {index + 1}
                        </Badge>
                        <span className="text-xs text-gray-500 font-mono">ID: {chunk.id}</span>
                      </div>
                      <div className="prose prose-sm max-w-none text-gray-800">
                        <ReactMarkdown
                          components={{
                            h1: ({node, ...props}) => <h1 className="text-xl font-bold mb-2 text-purple-900" {...props} />,
                            h2: ({node, ...props}) => <h2 className="text-lg font-bold mb-2 text-purple-800" {...props} />,
                            h3: ({node, ...props}) => <h3 className="text-base font-bold mb-1 text-purple-700" {...props} />,
                            p: ({node, ...props}) => <p className="mb-2 leading-relaxed" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc list-inside mb-2 space-y-1" {...props} />,
                            ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-2 space-y-1" {...props} />,
                            li: ({node, ...props}) => <li className="ml-2" {...props} />,
                            strong: ({node, ...props}) => <strong className="font-bold text-purple-900" {...props} />,
                            em: ({node, ...props}) => <em className="italic text-purple-800" {...props} />,
                            code: ({node, ...props}) => <code className="bg-purple-100 px-1 py-0.5 rounded text-xs font-mono" {...props} />,
                            pre: ({node, ...props}) => <pre className="bg-purple-100 p-2 rounded overflow-x-auto text-xs font-mono mb-2" {...props} />,
                            blockquote: ({node, ...props}) => <blockquote className="border-l-2 border-purple-400 pl-3 italic text-gray-700 mb-2" {...props} />,
                          }}
                        >
                          {chunk.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ))}
                </div>

                {!isEvaluating && evaluationChunks.length > 0 && (
                  <div className="mt-6 p-4 bg-green-50 border-2 border-green-400 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-semibold text-green-900">
                        Evaluation Complete - {evaluationChunks.length} step(s) processed
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* AGENT FRAMEWORK EXECUTION STEPS */}
        {showEvaluation && agentSteps.length > 0 && (
          <div className="mb-6">
            <Card className="bg-gray-900 border-2 border-gray-700 shadow-xl">
              <CardHeader className="bg-gray-800 border-b-2 border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold text-green-400 font-mono">
                      🔍 AGENT FRAMEWORK EXECUTION TRACE
                    </CardTitle>
                    <p className="text-xs text-gray-400 mt-1 font-mono">
                      Step-by-step breakdown of agent activities • {agentSteps.length} steps executed
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowRawLogs(!showRawLogs)}
                    variant="outline"
                    size="sm"
                    className="border-gray-600 text-gray-300 hover:bg-gray-700 font-mono text-xs"
                  >
                    {showRawLogs ? 'Collapse' : 'Expand'} Steps
                  </Button>
                </div>
              </CardHeader>
              
              {showRawLogs && (
                <CardContent className="p-4 max-h-[600px] overflow-y-auto bg-gray-950">
                  <div className="space-y-4">
                    {agentSteps.map((step, stepIndex) => (
                      <div key={stepIndex} className="border-2 border-gray-700 rounded-lg bg-gray-900">
                        {/* Step Header */}
                        <div className="bg-gray-800 p-3 border-b-2 border-gray-700">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Badge className="bg-purple-600 text-white font-bold">
                                STEP {step.stepNumber}
                              </Badge>
                              <span className="text-xs text-gray-400 font-mono">ID: {step.itemId}</span>
                            </div>
                            <span className="text-[10px] text-gray-500">
                              {new Date(step.timestamp).toLocaleTimeString('en-US', { 
                                hour12: false, 
                                hour: '2-digit', 
                                minute: '2-digit', 
                                second: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>

                        <div className="p-4 space-y-3">
                          {/* Function Calls */}
                          {step.functionCalls.length > 0 && (
                            <div className="border border-yellow-800 rounded bg-yellow-950 bg-opacity-30">
                              <div className="bg-yellow-900 bg-opacity-50 px-3 py-2 border-b border-yellow-800">
                                <div className="flex items-center gap-2">
                                  <span className="text-yellow-300 font-bold text-xs">🔧 FUNCTION CALLS</span>
                                  <Badge className="bg-yellow-700 text-yellow-100 text-[10px]">
                                    {step.functionCalls.length}
                                  </Badge>
                                </div>
                              </div>
                              <div className="p-3 space-y-2">
                                {step.functionCalls.map((call, idx) => (
                                  <div key={idx} className="text-xs">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-yellow-300 font-semibold">{call.name}()</span>
                                      <span className="text-yellow-600 text-[10px]">Call ID: {call.callId}</span>
                                    </div>
                                    <pre className="text-yellow-200 text-[10px] bg-gray-950 p-2 rounded overflow-x-auto">
                                      {call.arguments}
                                    </pre>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Function Outputs */}
                          {step.functionOutputs.length > 0 && (
                            <div className="border border-green-800 rounded bg-green-950 bg-opacity-30">
                              <div className="bg-green-900 bg-opacity-50 px-3 py-2 border-b border-green-800">
                                <div className="flex items-center gap-2">
                                  <span className="text-green-300 font-bold text-xs">✅ FUNCTION OUTPUTS</span>
                                  <Badge className="bg-green-700 text-green-100 text-[10px]">
                                    {step.functionOutputs.length}
                                  </Badge>
                                </div>
                              </div>
                              <div className="p-3 space-y-2">
                                {step.functionOutputs.map((output, idx) => (
                                  <div key={idx} className="text-xs">
                                    <div className="text-green-600 text-[10px] mb-1">Call ID: {output.callId}</div>
                                    <div className="text-green-200 text-[11px] bg-gray-950 p-2 rounded max-h-48 overflow-y-auto whitespace-pre-wrap">
                                      {output.output}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Messages / Analysis */}
                          {step.messages.length > 0 && (
                            <div className="border border-blue-800 rounded bg-blue-950 bg-opacity-30">
                              <div className="bg-blue-900 bg-opacity-50 px-3 py-2 border-b border-blue-800">
                                <div className="flex items-center gap-2">
                                  <span className="text-blue-300 font-bold text-xs">💬 AGENT REASONING</span>
                                  <Badge className="bg-blue-700 text-blue-100 text-[10px]">
                                    {step.messages.length}
                                  </Badge>
                                </div>
                              </div>
                              <div className="p-3 space-y-2">
                                {step.messages.map((msg, idx) => (
                                  <div key={idx} className="text-xs">
                                    <div className="text-blue-400 text-[10px] mb-1 uppercase">{msg.role}</div>
                                    <div className="text-blue-100 text-[11px] bg-gray-950 p-3 rounded whitespace-pre-wrap leading-relaxed">
                                      {msg.content}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {isEvaluating && (
                    <div className="mt-4 text-center">
                      <div className="inline-flex items-center gap-2 text-green-400">
                        <div className="animate-pulse">●</div>
                        <span className="text-xs">Listening for events...</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          </div>
        )}

        {/* Success Notification */}
        {showSuccessNotification && successMessage && (
          <div className="fixed top-8 right-8 z-50 animate-in slide-in-from-right duration-300">
            <div className={`rounded-lg shadow-2xl border-2 p-6 min-w-[400px] ${
              successMessage.type === 'approved' 
                ? 'bg-green-50 border-green-500' 
                : 'bg-red-50 border-red-500'
            }`}>
              <div className="flex items-start gap-4">
                <div className={`rounded-full p-2 ${
                  successMessage.type === 'approved' 
                    ? 'bg-green-500' 
                    : 'bg-red-500'
                }`}>
                  {successMessage.type === 'approved' ? (
                    <CheckCircle className="w-6 h-6 text-white" />
                  ) : (
                    <XCircle className="w-6 h-6 text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <div className={`text-lg font-bold mb-1 ${
                    successMessage.type === 'approved' 
                      ? 'text-green-900' 
                      : 'text-red-900'
                  }`}>
                    {successMessage.type === 'approved' ? 'CLAIM APPROVED' : 'CLAIM DENIED'}
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-gray-700">
                      <span className="font-semibold">Claim ID:</span> {successMessage.claimId}
                    </div>
                    <div className="text-sm text-gray-700">
                      <span className="font-semibold">Veteran:</span> {successMessage.veteranName}
                    </div>
                    <div className={`text-sm font-semibold mt-2 ${
                      successMessage.type === 'approved' 
                        ? 'text-green-700' 
                        : 'text-red-700'
                    }`}>
                      Status: {successMessage.type === 'approved' ? 'Approved' : 'Denied'} and removed from queue
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowSuccessNotification(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <GenieClaimsChat genieSpaceUrl={GENIE_SPACE_URL} />
    </div>
  );
};

export default PactActAdjudicationDashboard;
