#!/usr/bin/env python3
"""
Test script for PACT Act Adjudication API endpoints
Run this after starting the backend server to verify all endpoints work correctly.
"""

import requests
import json
from typing import Dict, Any

BASE_URL = "http://localhost:8000/api"

def print_section(title: str):
    """Print a formatted section header"""
    print("\n" + "="*80)
    print(f"  {title}")
    print("="*80 + "\n")

def test_endpoint(name: str, method: str, url: str, data: Dict[str, Any] = None) -> bool:
    """Test a single endpoint and print results"""
    try:
        print(f"Testing: {name}")
        print(f"  → {method} {url}")
        
        if method == "GET":
            response = requests.get(url, timeout=30)
        elif method == "POST":
            response = requests.post(url, json=data, timeout=30)
        else:
            print(f"  ✗ Unknown method: {method}")
            return False
        
        if response.status_code == 200:
            print(f"  ✓ Status: {response.status_code} OK")
            result = response.json()
            print(f"  ✓ Response preview: {json.dumps(result, indent=2)[:200]}...")
            return True
        else:
            print(f"  ✗ Status: {response.status_code}")
            print(f"  ✗ Error: {response.text}")
            return False
    except requests.exceptions.ConnectionError:
        print(f"  ✗ Connection Error: Is the backend server running on port 8000?")
        return False
    except Exception as e:
        print(f"  ✗ Error: {str(e)}")
        return False

def main():
    """Run all API endpoint tests"""
    print_section("PACT ACT ADJUDICATION API TESTS")
    
    results = []
    
    # Test 1: Get full adjudication dashboard
    print_section("1. Full Adjudication Dashboard")
    results.append(test_endpoint(
        "Get Complete Dashboard Data",
        "GET",
        f"{BASE_URL}/claims/adjudication/dashboard"
    ))
    
    # Test 2: Get adjudicator stats
    print_section("2. Adjudicator Statistics")
    results.append(test_endpoint(
        "Get Adjudicator Stats",
        "GET",
        f"{BASE_URL}/claims/adjudication/stats"
    ))
    
    # Test 3: Get pending claims
    print_section("3. Pending Claims")
    results.append(test_endpoint(
        "Get Pending Claims (limit 10)",
        "GET",
        f"{BASE_URL}/claims/adjudication/pending?limit=10"
    ))
    
    # Test 4: Get high priority claims
    print_section("4. High Priority Claims")
    results.append(test_endpoint(
        "Get High Priority Claims",
        "GET",
        f"{BASE_URL}/claims/adjudication/high-priority?limit=5"
    ))
    
    # Test 5: Get PACT Act statistics
    print_section("5. PACT Act Statistics")
    results.append(test_endpoint(
        "Get PACT Act Stats",
        "GET",
        f"{BASE_URL}/claims/adjudication/pact-act-stats"
    ))
    
    # Test 6: Get specific claim detail
    print_section("6. Claim Detail")
    results.append(test_endpoint(
        "Get Claim Detail (ID: 1234567890)",
        "GET",
        f"{BASE_URL}/claims/adjudication/claim/1234567890"
    ))
    
    # Test 7: Update claim status (approve)
    print_section("7. Update Claim Status")
    results.append(test_endpoint(
        "Approve Claim",
        "POST",
        f"{BASE_URL}/claims/adjudication/claim/1234567890/action",
        data={
            "action": "approve",
            "notes": "All requirements met. PACT Act eligibility confirmed.",
            "adjudicatorId": "test_adjudicator"
        }
    ))
    
    # Test 8: Flag claim for review
    print_section("8. Flag Claim for Review")
    results.append(test_endpoint(
        "Flag Claim for Review",
        "POST",
        f"{BASE_URL}/claims/adjudication/claim/1234567892/action",
        data={
            "action": "flag_review",
            "notes": "High fraud score detected. Escalating to supervisor.",
            "adjudicatorId": "test_adjudicator"
        }
    ))
    
    # Test 9: Original dashboard endpoint (backward compatibility)
    print_section("9. Legacy Dashboard Endpoint")
    results.append(test_endpoint(
        "Get Legacy Dashboard Data",
        "GET",
        f"{BASE_URL}/claims/dashboard"
    ))
    
    # Print summary
    print_section("TEST SUMMARY")
    total_tests = len(results)
    passed_tests = sum(results)
    failed_tests = total_tests - passed_tests
    
    print(f"Total Tests:  {total_tests}")
    print(f"Passed:       {passed_tests} ✓")
    print(f"Failed:       {failed_tests} ✗")
    print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
    
    if passed_tests == total_tests:
        print("\n🎉 All tests passed! API is ready for production.")
    else:
        print("\n⚠️  Some tests failed. Check the errors above.")
    
    print("\n" + "="*80 + "\n")

if __name__ == "__main__":
    main()





