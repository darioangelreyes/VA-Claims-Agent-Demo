import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, CheckCircle, XCircle, FileText } from 'lucide-react';

interface PriorityClaim {
  claimId: string;
  veteranName: string;
  daysOpen: number;
  condition: string;
  status: string;
  reason: string;
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
  const [loading, setLoading] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<PriorityClaim | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>('priority'); // 'priority', 'pendingReview', 'awaitingEvidence', 'decisionReady', 'needsEvidence'
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
      { claimId: '123455709', veteranName: 'Mary D. Smith', daysOpen: 45, condition: 'Asthma/Rhinitis', status: 'Awaiting Evidence', reason: 'PACT Act - Burn Pit Exposure' },
      { claimId: '987654321', veteranName: 'John R. Williams', daysOpen: 78, condition: 'Lung Cancer', status: 'Decision Ready', reason: 'PACT Act - Over 60 days' },
      { claimId: '456789123', veteranName: 'Sarah M. Johnson', daysOpen: 92, condition: 'Chronic Bronchitis', status: 'Pending Review', reason: 'PACT Act - Over 90 days CRITICAL' },
      { claimId: '789123456', veteranName: 'Michael P. Davis', daysOpen: 67, condition: 'Sleep Apnea', status: 'Decision Ready', reason: 'PACT Act - Respiratory Issues' },
      { claimId: '321654987', veteranName: 'Jennifer L. Martinez', daysOpen: 55, condition: 'Sinusitis', status: 'Awaiting Evidence', reason: 'PACT Act - Missing VA Exam' },
      { claimId: '654321789', veteranName: 'Robert T. Anderson', daysOpen: 83, condition: 'COPD', status: 'Decision Ready', reason: 'PACT Act - Over 60 days' },
      { claimId: '147258369', veteranName: 'Lisa K. Thompson', daysOpen: 72, condition: 'Lung Disease', status: 'Pending Review', reason: 'PACT Act - Complex Case' },
      { claimId: '369258147', veteranName: 'David S. Wilson', daysOpen: 48, condition: 'Asthma', status: 'Awaiting Evidence', reason: 'PACT Act - Service Records Needed' },
      { claimId: '258147369', veteranName: 'Patricia A. Moore', daysOpen: 95, condition: 'Emphysema', status: 'Decision Ready', reason: 'PACT Act - Over 90 days CRITICAL' },
      { claimId: '741852963', veteranName: 'James B. Taylor', daysOpen: 61, condition: 'Chronic Cough', status: 'Pending Review', reason: 'PACT Act - Burn Pit Exposure' },
      { claimId: '852963741', veteranName: 'Linda C. Jackson', daysOpen: 58, condition: 'Respiratory Issues', status: 'Awaiting Evidence', reason: 'PACT Act - Medical Records Needed' },
      { claimId: '963852741', veteranName: 'William H. White', daysOpen: 88, condition: 'Lung Scarring', status: 'Decision Ready', reason: 'PACT Act - Over 60 days' },
      { claimId: '159357486', veteranName: 'Barbara E. Harris', daysOpen: 52, condition: 'Sinusitis', status: 'Pending Review', reason: 'PACT Act - Deployment Verification' },
      { claimId: '357159486', veteranName: 'Thomas G. Clark', daysOpen: 76, condition: 'Sleep Apnea', status: 'Decision Ready', reason: 'PACT Act - Over 60 days' },
      { claimId: '486159357', veteranName: 'Susan R. Lewis', daysOpen: 43, condition: 'Asthma', status: 'Awaiting Evidence', reason: 'PACT Act - Nexus Letter Needed' },
      { claimId: '789456123', veteranName: 'Charles D. Robinson', daysOpen: 101, condition: 'Lung Cancer', status: 'Decision Ready', reason: 'PACT Act - Over 100 days URGENT' },
      { claimId: '456123789', veteranName: 'Nancy M. Walker', daysOpen: 69, condition: 'COPD', status: 'Pending Review', reason: 'PACT Act - Complex Medical History' },
    ],
    allClaimsList: [
      // Priority claims (17 PACT Act claims)
      { claimId: '123455709', veteranName: 'Mary D. Smith', daysOpen: 45, condition: 'Asthma/Rhinitis', status: 'Awaiting Evidence', reason: 'PACT Act - Burn Pit Exposure' },
      { claimId: '987654321', veteranName: 'John R. Williams', daysOpen: 78, condition: 'Lung Cancer', status: 'Decision Ready', reason: 'PACT Act - Over 60 days' },
      { claimId: '456789123', veteranName: 'Sarah M. Johnson', daysOpen: 92, condition: 'Chronic Bronchitis', status: 'Pending Review', reason: 'PACT Act - Over 90 days CRITICAL' },
      { claimId: '789123456', veteranName: 'Michael P. Davis', daysOpen: 67, condition: 'Sleep Apnea', status: 'Decision Ready', reason: 'PACT Act - Respiratory Issues' },
      { claimId: '321654987', veteranName: 'Jennifer L. Martinez', daysOpen: 55, condition: 'Sinusitis', status: 'Awaiting Evidence', reason: 'PACT Act - Missing VA Exam' },
      { claimId: '654321789', veteranName: 'Robert T. Anderson', daysOpen: 83, condition: 'COPD', status: 'Decision Ready', reason: 'PACT Act - Over 60 days' },
      { claimId: '147258369', veteranName: 'Lisa K. Thompson', daysOpen: 72, condition: 'Lung Disease', status: 'Pending Review', reason: 'PACT Act - Complex Case' },
      { claimId: '369258147', veteranName: 'David S. Wilson', daysOpen: 48, condition: 'Asthma', status: 'Awaiting Evidence', reason: 'PACT Act - Service Records Needed' },
      { claimId: '258147369', veteranName: 'Patricia A. Moore', daysOpen: 95, condition: 'Emphysema', status: 'Decision Ready', reason: 'PACT Act - Over 90 days CRITICAL' },
      { claimId: '741852963', veteranName: 'James B. Taylor', daysOpen: 61, condition: 'Chronic Cough', status: 'Pending Review', reason: 'PACT Act - Burn Pit Exposure' },
      { claimId: '852963741', veteranName: 'Linda C. Jackson', daysOpen: 58, condition: 'Respiratory Issues', status: 'Awaiting Evidence', reason: 'PACT Act - Medical Records Needed' },
      { claimId: '963852741', veteranName: 'William H. White', daysOpen: 88, condition: 'Lung Scarring', status: 'Decision Ready', reason: 'PACT Act - Over 60 days' },
      { claimId: '159357486', veteranName: 'Barbara E. Harris', daysOpen: 52, condition: 'Sinusitis', status: 'Pending Review', reason: 'PACT Act - Deployment Verification' },
      { claimId: '357159486', veteranName: 'Thomas G. Clark', daysOpen: 76, condition: 'Sleep Apnea', status: 'Decision Ready', reason: 'PACT Act - Over 60 days' },
      { claimId: '486159357', veteranName: 'Susan R. Lewis', daysOpen: 43, condition: 'Asthma', status: 'Awaiting Evidence', reason: 'PACT Act - Nexus Letter Needed' },
      { claimId: '789456123', veteranName: 'Charles D. Robinson', daysOpen: 101, condition: 'Lung Cancer', status: 'Decision Ready', reason: 'PACT Act - Over 100 days URGENT' },
      { claimId: '456123789', veteranName: 'Nancy M. Walker', daysOpen: 69, condition: 'COPD', status: 'Pending Review', reason: 'PACT Act - Complex Medical History' },
      // Non-priority claims (regular claims - 28 additional)
      { claimId: '111222333', veteranName: 'George K. Miller', daysOpen: 22, condition: 'Back Pain', status: 'Pending Review', reason: 'Standard - Initial Review' },
      { claimId: '222333444', veteranName: 'Helen R. Brown', daysOpen: 18, condition: 'Knee Injury', status: 'Awaiting Evidence', reason: 'Standard - Medical Records' },
      { claimId: '333444555', veteranName: 'Ivan P. Carter', daysOpen: 35, condition: 'PTSD', status: 'Pending Review', reason: 'Standard - Mental Health Eval' },
      { claimId: '444555666', veteranName: 'Julia M. Evans', daysOpen: 12, condition: 'Hearing Loss', status: 'Awaiting Evidence', reason: 'Standard - Audiogram Needed' },
      { claimId: '555666777', veteranName: 'Kevin L. Foster', daysOpen: 28, condition: 'Shoulder Injury', status: 'Decision Ready', reason: 'Standard - Complete File' },
      { claimId: '666777888', veteranName: 'Laura S. Green', daysOpen: 41, condition: 'Migraine', status: 'Pending Review', reason: 'Standard - Neurologist Review' },
      { claimId: '777888999', veteranName: 'Mark T. Hughes', daysOpen: 15, condition: 'Ankle Sprain', status: 'Awaiting Evidence', reason: 'Standard - X-rays Required' },
      { claimId: '888999111', veteranName: 'Nicole D. James', daysOpen: 33, condition: 'Tinnitus', status: 'Pending Review', reason: 'Standard - Service Connection' },
      { claimId: '999111222', veteranName: 'Oliver W. King', daysOpen: 25, condition: 'Carpal Tunnel', status: 'Decision Ready', reason: 'Standard - Ready for Decision' },
      { claimId: '101112131', veteranName: 'Paula V. Lewis', daysOpen: 19, condition: 'Arthritis', status: 'Awaiting Evidence', reason: 'Standard - Rheumatology Report' },
      { claimId: '121314151', veteranName: 'Quinn R. Mason', daysOpen: 37, condition: 'Depression', status: 'Pending Review', reason: 'Standard - Psychiatric Eval' },
      { claimId: '131415161', veteranName: 'Rachel N. Nelson', daysOpen: 29, condition: 'Hip Replacement', status: 'Decision Ready', reason: 'Standard - Complete Records' },
      { claimId: '141516171', veteranName: 'Samuel J. Owen', daysOpen: 14, condition: 'Vision Loss', status: 'Awaiting Evidence', reason: 'Standard - Ophthalmology Report' },
      { claimId: '151617181', veteranName: 'Teresa K. Parker', daysOpen: 31, condition: 'Diabetes', status: 'Pending Review', reason: 'Standard - Service Connection Review' },
      { claimId: '161718191', veteranName: 'Ulysses F. Quinn', daysOpen: 24, condition: 'Hypertension', status: 'Awaiting Evidence', reason: 'Standard - Blood Pressure Logs' },
      { claimId: '171819202', veteranName: 'Vanessa H. Reed', daysOpen: 38, condition: 'Sleep Disorder', status: 'Pending Review', reason: 'Standard - Sleep Study Results' },
      { claimId: '181920212', veteranName: 'Walter G. Scott', daysOpen: 21, condition: 'Elbow Injury', status: 'Decision Ready', reason: 'Standard - Ready for Approval' },
      { claimId: '192021222', veteranName: 'Xena L. Turner', daysOpen: 16, condition: 'Skin Condition', status: 'Awaiting Evidence', reason: 'Standard - Dermatology Report' },
      { claimId: '202122232', veteranName: 'Yolanda M. Upton', daysOpen: 42, condition: 'Fibromyalgia', status: 'Pending Review', reason: 'Standard - Pain Management Review' },
      { claimId: '212223242', veteranName: 'Zachary P. Valdez', daysOpen: 27, condition: 'TMJ Disorder', status: 'Awaiting Evidence', reason: 'Standard - Dental Records' },
      { claimId: '222324252', veteranName: 'Amy R. West', daysOpen: 20, condition: 'Sciatica', status: 'Decision Ready', reason: 'Standard - Complete Documentation' },
      { claimId: '232425262', veteranName: 'Benjamin S. Young', daysOpen: 34, condition: 'Anxiety', status: 'Pending Review', reason: 'Standard - Mental Health Assessment' },
      { claimId: '242526272', veteranName: 'Catherine T. Zhang', daysOpen: 13, condition: 'Wrist Injury', status: 'Awaiting Evidence', reason: 'Standard - MRI Results' },
      { claimId: '252627282', veteranName: 'Daniel U. Adams', daysOpen: 39, condition: 'Insomnia', status: 'Pending Review', reason: 'Standard - Sleep Clinic Report' },
      { claimId: '262728292', veteranName: 'Emily V. Baker', daysOpen: 26, condition: 'Foot Pain', status: 'Decision Ready', reason: 'Standard - Ready for Review' },
      { claimId: '272829303', veteranName: 'Frank W. Clark', daysOpen: 17, condition: 'Allergies', status: 'Awaiting Evidence', reason: 'Standard - Allergy Test Results' },
      { claimId: '282930313', veteranName: 'Grace X. Davis', daysOpen: 44, condition: 'Chronic Fatigue', status: 'Pending Review', reason: 'Standard - Comprehensive Exam' },
      { claimId: '293031323', veteranName: 'Henry Y. Ellis', daysOpen: 23, condition: 'Plantar Fasciitis', status: 'Awaiting Evidence', reason: 'Standard - Podiatry Report' },
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
    
    // API call to approve would go here
    alert(`✅ APPROVED: Claim ${claimId} for ${claimName}\n\nMoving to next claim...`);
    
    // Automatically move to the next claim
    setTimeout(() => {
      handleNextClaim();
    }, 500);
  };

  const handleDenyClaim = () => {
    if (!selectedClaim) {
      alert('Please select a claim to review first');
      return;
    }
    const claimName = data.currentClaim.name;
    const claimId = data.currentClaim.claimId;
    
    // API call to deny would go here
    alert(`❌ DENIED: Claim ${claimId} for ${claimName}\n\nMoving to next claim...`);
    
    // Automatically move to the next claim
    setTimeout(() => {
      handleNextClaim();
    }, 500);
  };

  const handleRequestEvidence = () => {
    if (!selectedClaim) {
      alert('Please select a claim to review first');
      return;
    }
    alert(`Requesting additional evidence for claim ${data.currentClaim.claimId}`);
    // API call to request evidence
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // const response = await fetch('/api/claims/adjudication/dashboard');
        // const apiData = await response.json();
        // setData(apiData);
      } catch (error) {
        console.error('Error loading dashboard:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Calculate actual counts from ALL claims (not just priority)
  const actualCounts = {
    priority: data.priorityClaimsList.length,
    pendingReview: data.allClaimsList.filter(c => c.status === 'Pending Review').length,
    awaitingEvidence: data.allClaimsList.filter(c => c.status === 'Awaiting Evidence').length,
    decisionReady: data.allClaimsList.filter(c => c.status === 'Decision Ready').length,
    needsEvidence: data.allClaimsList.filter(c => c.status === 'Needs Evidence').length,
  };

  const total = actualCounts.pendingReview + actualCounts.awaitingEvidence + actualCounts.decisionReady + actualCounts.needsEvidence;

  // Filter claims based on selected filter
  const getFilteredClaims = (): PriorityClaim[] => {
    if (selectedFilter === 'priority') {
      return data.priorityClaimsList; // Show only priority claims
    }
    // Filter by status from ALL claims
    return data.allClaimsList.filter(claim => {
      if (selectedFilter === 'pendingReview') return claim.status === 'Pending Review';
      if (selectedFilter === 'awaitingEvidence') return claim.status === 'Awaiting Evidence';
      if (selectedFilter === 'decisionReady') return claim.status === 'Decision Ready';
      if (selectedFilter === 'needsEvidence') return claim.status === 'Needs Evidence';
      return true;
    });
  };

  const filteredClaims = getFilteredClaims();

  const getTableTitle = (): string => {
    if (selectedFilter === 'priority') return 'PRIORITY CLAIMS';
    if (selectedFilter === 'pendingReview') return 'PENDING REVIEW CLAIMS';
    if (selectedFilter === 'awaitingEvidence') return 'AWAITING EVIDENCE CLAIMS';
    if (selectedFilter === 'decisionReady') return 'DECISION READY CLAIMS';
    if (selectedFilter === 'needsEvidence') return 'NEEDS EVIDENCE CLAIMS';
    return 'CLAIMS';
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-[#0f3057] text-white shadow-lg">
        <div className="max-w-[1600px] mx-auto px-8 py-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-wide">CLAIMS ADJUDICATION DASHBOARD</h1>
          <div className="flex items-center gap-4">
            {/* VA Logo */}
            <img 
              src="/va-logo.png" 
              alt="U.S. Department of Veterans Affairs" 
              className="h-20 w-auto"
            />
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-8 py-6">
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
                <div className="text-5xl font-bold text-gray-900">{data.myAssignedClaims}</div>
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
                  <div className="p-4 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer border-l-4 border-red-600">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-red-600 rounded-full mt-2 animate-pulse"></div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className="bg-red-600 text-white text-xs font-bold">CRITICAL</Badge>
                          <span className="text-xs text-gray-600">2 min ago</span>
                        </div>
                        <div className="text-sm font-semibold text-gray-900">3 claims over 100 days old require immediate action</div>
                        <div className="text-xs text-gray-600 mt-1">Charles Robinson (101 days), Sarah Johnson (92 days), Patricia Moore (95 days)</div>
                      </div>
                    </div>
                  </div>

                  {/* High Priority Alert */}
                  <div className="p-4 bg-yellow-50 hover:bg-yellow-100 transition-colors cursor-pointer border-l-4 border-yellow-600">
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

                  {/* Warning Alert */}
                  <div className="p-4 hover:bg-gray-50 transition-colors cursor-pointer border-l-4 border-orange-400">
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

                  {/* Info Alert */}
                  <div className="p-4 hover:bg-gray-50 transition-colors cursor-pointer border-l-4 border-blue-400">
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
        <div className="mb-6">
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
                      <th className="text-left p-4 text-sm font-bold text-gray-700">PRIORITY REASON</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredClaims.map((claim) => (
                      <tr 
                        key={claim.claimId} 
                        onClick={() => handleReviewClaim(claim)}
                        className={`cursor-pointer hover:bg-blue-100 transition-colors ${claim.daysOpen > 90 ? 'bg-red-50 hover:bg-red-100' : claim.daysOpen > 60 ? 'bg-yellow-50 hover:bg-yellow-100' : 'hover:bg-blue-50'}`}
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
            <CardContent className="space-y-4 pt-4">
              {selectedClaim ? (
                <>
                  <div>
                    <div className="text-3xl font-bold text-gray-900">{data.currentClaim.name}</div>
                    <div className="text-sm text-gray-600 mt-1">Claim ID: {data.currentClaim.claimId}</div>
                    <div className="text-sm text-gray-600">Submitted: {data.currentClaim.dateSubmitted}</div>
                    <div className={`text-sm font-semibold mt-1 ${data.currentClaim.daysOpen > 60 ? 'text-red-600' : data.currentClaim.daysOpen > 30 ? 'text-yellow-600' : 'text-green-600'}`}>
                      Open for {data.currentClaim.daysOpen} days {data.currentClaim.daysOpen > 60 ? '(OVERDUE!)' : ''}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-700">Claimed conditions</span>
                      <span className="text-gray-900">{data.currentClaim.claimedConditions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-700">Current status</span>
                      <span className="text-gray-900">{data.currentClaim.currentStatus}</span>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    {data.currentClaim.pactAct && (
                      <Badge className="bg-blue-600 text-white px-4 py-1 text-sm font-bold">PACT ACT</Badge>
                    )}
                    <Badge variant="outline" className="border-gray-400 text-gray-900 px-4 py-1 text-sm font-semibold">{data.currentClaim.branch}</Badge>
                  </div>

                  {/* ACTION BUTTONS */}
                  <div className="pt-4 border-t-2 border-gray-200">
                    <div className="text-sm font-bold text-gray-700 mb-3">ADJUDICATOR ACTIONS:</div>
                    <div className="grid grid-cols-2 gap-3">
                      <Button 
                        onClick={handleApproveClaim}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        APPROVE
                      </Button>
                      <Button 
                        onClick={handleDenyClaim}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        DENY
                      </Button>
                      <Button 
                        onClick={handleRequestEvidence}
                        variant="outline"
                        className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-bold col-span-2"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        REQUEST MORE EVIDENCE
                      </Button>
                    </div>
                    
                    {/* NAVIGATION BUTTONS */}
                    <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-200">
                      <Button 
                        onClick={handlePreviousClaim}
                        className="bg-gray-600 hover:bg-gray-700 text-white font-bold"
                      >
                        ← PREVIOUS CLAIM
                      </Button>
                      <Button 
                        onClick={handleNextClaim}
                        className="bg-gray-600 hover:bg-gray-700 text-white font-bold"
                      >
                        NEXT CLAIM →
                      </Button>
                    </div>
                  </div>
                </>
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
      </div>
    </div>
  );
};

export default PactActAdjudicationDashboard;
