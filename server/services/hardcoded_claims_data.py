"""
Hardcoded claims data for Priority Claims table
"""
from datetime import date, timedelta


def get_date_from_days_open(days_open):
    """Calculate date submitted from days open"""
    return (date.today() - timedelta(days=days_open)).strftime("%m/%d/%Y")


PRIORITY_CLAIMS_DATA = [
    {
        "claimId": "CLMT-005005",
        "veteranName": "Mary D. Smith",
        "daysOpen": 45,
        "dateSubmitted": get_date_from_days_open(45),
        "claimedCondition": "Asthma/Rhinitis",
        "currentStatus": "Awaiting Evidence",
        "priorityLevel": "PACT Act - Burn Pit Exposure",
        "fraudScore": 12.0,
        "complianceScore": 87.0,
        "isPactAct": True
    },
    {
        "claimId": "CLMT-012512",
        "veteranName": "John R. Williams",
        "daysOpen": 78,
        "dateSubmitted": get_date_from_days_open(78),
        "claimedCondition": "Lung Cancer",
        "currentStatus": "Decision Ready",
        "priorityLevel": "PACT Act - Over 60 days",
        "fraudScore": 8.0,
        "complianceScore": 95.0,
        "isPactAct": True
    },
    {
        "claimId": "CLMT-015120",
        "veteranName": "Sarah M. Johnson",
        "daysOpen": 92,
        "dateSubmitted": get_date_from_days_open(92),
        "claimedCondition": "Chronic Bronchitis",
        "currentStatus": "Pending Review",
        "priorityLevel": "PACT Act - Over 90 days CRITICAL",
        "fraudScore": 15.0,
        "complianceScore": 82.0,
        "isPactAct": True
    },
    {
        "claimId": "CLMT-014618",
        "veteranName": "Michael P. Davis",
        "daysOpen": 67,
        "dateSubmitted": get_date_from_days_open(67),
        "claimedCondition": "Sleep Apnea",
        "currentStatus": "Decision Ready",
        "priorityLevel": "PACT Act - Respiratory Issues",
        "fraudScore": 5.0,
        "complianceScore": 92.0,
        "isPactAct": True
    },
    {
        "claimId": "CLMT-003116",
        "veteranName": "Jennifer L. Martinez",
        "daysOpen": 55,
        "dateSubmitted": get_date_from_days_open(55),
        "claimedCondition": "Sinusitis",
        "currentStatus": "Awaiting Evidence",
        "priorityLevel": "PACT Act - Missing VA Exam",
        "fraudScore": 18.0,
        "complianceScore": 78.0,
        "isPactAct": True
    },
    {
        "claimId": "CLMT-008261",
        "veteranName": "Robert T. Anderson",
        "daysOpen": 83,
        "dateSubmitted": get_date_from_days_open(83),
        "claimedCondition": "COPD",
        "currentStatus": "Decision Ready",
        "priorityLevel": "PACT Act - Over 60 days",
        "fraudScore": 22.0,
        "complianceScore": 88.0,
        "isPactAct": True,
        "fraudReason": "Minor inconsistencies in deployment timeline. Service dates show 8-month deployment, but medical records reference 12-month exposure period."
    },
    {
        "claimId": "CLMT-010139",
        "veteranName": "Lisa K. Thompson",
        "daysOpen": 72,
        "dateSubmitted": get_date_from_days_open(72),
        "claimedCondition": "Lung Disease",
        "currentStatus": "Pending Review",
        "priorityLevel": "PACT Act - Complex Case",
        "fraudScore": 35.0,
        "complianceScore": 72.0,
        "isPactAct": True,
        "fraudReason": "Multiple red flags detected: Service records show non-combat MOS with limited field exposure. Medical evidence timing questionable - condition diagnosed 2 weeks after PACT Act announcement. Similar claim pattern detected from same medical provider."
    },
    {
        "claimId": "CLMT-011243",
        "veteranName": "David S. Wilson",
        "daysOpen": 48,
        "dateSubmitted": get_date_from_days_open(48),
        "claimedCondition": "Asthma",
        "currentStatus": "Awaiting Evidence",
        "priorityLevel": "PACT Act - Service Records Needed",
        "fraudScore": 9.0,
        "complianceScore": 90.0,
        "isPactAct": True
    },
    {
        "claimId": "CLMT-013341",
        "veteranName": "Patricia A. Moore",
        "daysOpen": 95,
        "dateSubmitted": get_date_from_days_open(95),
        "claimedCondition": "Emphysema",
        "currentStatus": "Decision Ready",
        "priorityLevel": "PACT Act - Over 90 days CRITICAL",
        "fraudScore": 11.0,
        "complianceScore": 85.0,
        "isPactAct": True
    },
    {
        "claimId": "CLMT-013630",
        "veteranName": "James B. Taylor",
        "daysOpen": 61,
        "dateSubmitted": get_date_from_days_open(61),
        "claimedCondition": "Chronic Cough",
        "currentStatus": "Pending Review",
        "priorityLevel": "PACT Act - Burn Pit Exposure",
        "fraudScore": 28.0,
        "complianceScore": 79.0,
        "isPactAct": True,
        "fraudReason": "Deployment records incomplete. Unit assignment documentation shows primarily stateside duty, but claim asserts 18 months burn pit exposure. Medical provider has history of PACT Act claims with questionable documentation."
    },
    {
        "claimId": "CLMT-014204",
        "veteranName": "Linda C. Jackson",
        "daysOpen": 58,
        "dateSubmitted": get_date_from_days_open(58),
        "claimedCondition": "Respiratory Issues",
        "currentStatus": "Awaiting Evidence",
        "priorityLevel": "PACT Act - Medical Records Needed",
        "fraudScore": 14.0,
        "complianceScore": 83.0,
        "isPactAct": True
    },
    {
        "claimId": "CLMT-014186",
        "veteranName": "William H. White",
        "daysOpen": 88,
        "dateSubmitted": get_date_from_days_open(88),
        "claimedCondition": "Lung Scarring",
        "currentStatus": "Decision Ready",
        "priorityLevel": "PACT Act - Over 60 days",
        "fraudScore": 19.0,
        "complianceScore": 86.0,
        "isPactAct": True
    },
    {
        "claimId": "CLMT-014597",
        "veteranName": "Barbara E. Harris",
        "daysOpen": 52,
        "dateSubmitted": get_date_from_days_open(52),
        "claimedCondition": "Sinusitis",
        "currentStatus": "Pending Review",
        "priorityLevel": "PACT Act - Deployment Verification",
        "fraudScore": 7.0,
        "complianceScore": 91.0,
        "isPactAct": True
    },
    {
        "claimId": "CLMT-008700",
        "veteranName": "Thomas G. Clark",
        "daysOpen": 76,
        "dateSubmitted": get_date_from_days_open(76),
        "claimedCondition": "Sleep Apnea",
        "currentStatus": "Decision Ready",
        "priorityLevel": "PACT Act - Over 60 days",
        "fraudScore": 10.0,
        "complianceScore": 89.0,
        "isPactAct": True
    },
    {
        "claimId": "CLMT-014268",
        "veteranName": "Susan R. Lewis",
        "daysOpen": 43,
        "dateSubmitted": get_date_from_days_open(43),
        "claimedCondition": "Asthma",
        "currentStatus": "Awaiting Evidence",
        "priorityLevel": "PACT Act - Nexus Letter Needed",
        "fraudScore": 13.0,
        "complianceScore": 84.0,
        "isPactAct": True
    },
    {
        "claimId": "CLMT-015714",
        "veteranName": "Charles D. Robinson",
        "daysOpen": 101,
        "dateSubmitted": get_date_from_days_open(101),
        "claimedCondition": "Lung Cancer",
        "currentStatus": "Decision Ready",
        "priorityLevel": "PACT Act - Over 100 days URGENT",
        "fraudScore": 42.0,
        "complianceScore": 68.0,
        "isPactAct": True,
        "fraudReason": "HIGH RISK: Multiple serious inconsistencies detected. Service dates conflict with deployment records by 6 months. Medical evidence shows possible digital alteration (forensics confidence: 0.78). Veteran previously denied similar claim in 2019, new claim filed immediately after PACT Act with identical medical provider. Pattern matches known fraud ring (4 related cases identified)."
    },
    {
        "claimId": "CLMT-014207",
        "veteranName": "Nancy M. Walker",
        "daysOpen": 69,
        "dateSubmitted": get_date_from_days_open(69),
        "claimedCondition": "COPD",
        "currentStatus": "Pending Review",
        "priorityLevel": "PACT Act - Complex Medical History",
        "fraudScore": 16.0,
        "complianceScore": 81.0,
        "isPactAct": True
    },
]

