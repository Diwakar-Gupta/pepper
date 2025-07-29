#!/usr/bin/env python3
"""
Test script for the submission database functionality.
This script tests all the main features of the SubmissionDB class.
"""

import os
import json
import time
from submission_db import SubmissionDB

def test_submission_db():
    """Test all submission database functionality"""
    print("🧪 Testing Submission Database...")
    
    # Use a test database file
    test_db_path = "test_submissions.db"
    
    # Clean up any existing test database
    if os.path.exists(test_db_path):
        os.remove(test_db_path)
    
    # Initialize database
    db = SubmissionDB(test_db_path)
    print("✅ Database initialized")
    
    # Test 1: Add submissions
    print("\n📝 Test 1: Adding submissions...")
    
    # Add a successful submission
    submission_id_1 = db.add_submission(
        problem_slug="two-sum",
        language="python",
        code="def two_sum(nums, target):\n    return [0, 1]",
        status="success",
        test_results={"total_test_cases": 3, "passed_test_cases": 3, "all_passed": True}
    )
    print(f"✅ Added successful submission: {submission_id_1}")
    
    # Add a failed submission
    submission_id_2 = db.add_submission(
        problem_slug="two-sum",
        language="java",
        code="public class Solution { /* incomplete */ }",
        status="failed",
        test_results={"total_test_cases": 3, "passed_test_cases": 1, "failed_test_case": {"testCase": 2}},
        error_message="Test case 2 failed"
    )
    print(f"✅ Added failed submission: {submission_id_2}")
    
    # Add an error submission
    submission_id_3 = db.add_submission(
        problem_slug="reverse-string",
        language="cpp",
        code="invalid c++ code",
        status="error",
        error_message="Compilation error"
    )
    print(f"✅ Added error submission: {submission_id_3}")
    
    # Add another successful submission for different problem
    submission_id_4 = db.add_submission(
        problem_slug="reverse-string",
        language="python",
        code="def reverse_string(s):\n    return s[::-1]",
        status="success",
        test_results={"total_test_cases": 2, "passed_test_cases": 2, "all_passed": True}
    )
    print(f"✅ Added another successful submission: {submission_id_4}")
    
    # Test 2: Get submission history
    print("\n📚 Test 2: Getting submission history...")
    
    two_sum_history = db.get_submission_history("two-sum")
    print(f"✅ Two-sum history: {len(two_sum_history)} submissions")
    for i, submission in enumerate(two_sum_history):
        print(f"   {i+1}. {submission['language']} - {submission['status']} ({submission['datetime']})")
    
    reverse_string_history = db.get_submission_history("reverse-string")
    print(f"✅ Reverse-string history: {len(reverse_string_history)} submissions")
    for i, submission in enumerate(reverse_string_history):
        print(f"   {i+1}. {submission['language']} - {submission['status']} ({submission['datetime']})")
    
    # Test 3: Check problems status
    print("\n🔍 Test 3: Checking problems status...")
    
    problem_list = ["two-sum", "reverse-string", "fibonacci", "binary-search"]
    status_map = db.check_problems_status(problem_list)
    
    print("✅ Problem statuses:")
    for problem, status in status_map.items():
        print(f"   {problem}: {status}")
    
    # Test 4: Get all solved problems
    print("\n🏆 Test 4: Getting all solved problems...")
    
    solved_problems = db.get_all_solved_problems()
    print(f"✅ Solved problems: {solved_problems}")
    
    # Test 5: Get submission statistics
    print("\n📊 Test 5: Getting submission statistics...")
    
    stats = db.get_submission_stats()
    print("✅ Submission statistics:")
    for key, value in stats.items():
        print(f"   {key}: {value}")
    
    # Test 6: Get recent submissions
    print("\n⏰ Test 6: Getting recent submissions...")
    
    recent = db.get_recent_submissions(limit=5)
    print(f"✅ Recent submissions ({len(recent)}):")
    for submission in recent:
        print(f"   {submission['problem_slug']} - {submission['language']} - {submission['status']}")
    
    # Test 7: Database info
    print("\n💾 Test 7: Database information...")
    
    db_info = db.get_database_info()
    print("✅ Database info:")
    for key, value in db_info.items():
        print(f"   {key}: {value}")
    
    # Test 8: Backup to JSON
    print("\n💾 Test 8: Creating JSON backup...")
    
    backup_path = "test_backup.json"
    db.backup_to_json(backup_path)
    
    # Verify backup file
    if os.path.exists(backup_path):
        with open(backup_path, 'r') as f:
            backup_data = json.load(f)
        print(f"✅ Backup created with {len(backup_data)} submissions")
        
        # Clean up backup file
        os.remove(backup_path)
    else:
        print("❌ Backup file not created")
    
    # Test 9: Performance test with multiple submissions
    print("\n⚡ Test 9: Performance test...")
    
    start_time = time.time()
    
    # Add 100 submissions quickly
    for i in range(100):
        db.add_submission(
            problem_slug=f"problem-{i % 10}",  # 10 different problems
            language=["python", "java", "cpp"][i % 3],  # 3 different languages
            code=f"// Solution {i}",
            status=["success", "failed", "error"][i % 3],  # Mix of statuses
            test_results={"test_number": i} if i % 3 == 0 else None,
            error_message=f"Error {i}" if i % 3 == 2 else None
        )
    
    end_time = time.time()
    print(f"✅ Added 100 submissions in {end_time - start_time:.3f} seconds")
    
    # Test bulk status check performance
    start_time = time.time()
    bulk_problems = [f"problem-{i}" for i in range(50)]
    bulk_status = db.check_problems_status(bulk_problems)
    end_time = time.time()
    print(f"✅ Checked status of 50 problems in {end_time - start_time:.3f} seconds")
    
    # Final statistics
    final_stats = db.get_submission_stats()
    print(f"\n📈 Final statistics: {final_stats['total_submissions']} total submissions")
    
    # Clean up test database
    if os.path.exists(test_db_path):
        os.remove(test_db_path)
        print("✅ Test database cleaned up")
    
    print("\n🎉 All tests completed successfully!")

def test_message_types():
    """Test the message types that would be sent from the frontend"""
    print("\n🔄 Testing message type examples...")
    
    # Example messages that the frontend would send
    example_messages = [
        {
            "type": "submit",
            "code": "def two_sum(nums, target):\n    return [0, 1]",
            "language": "python",
            "problemSlug": "two-sum"
        },
        {
            "type": "submission_history",
            "problemSlug": "two-sum"
        },
        {
            "type": "check_problems_status",
            "problemSlugs": ["two-sum", "reverse-string", "fibonacci"]
        },
        {
            "type": "submission_stats"
        },
        {
            "type": "recent_submissions",
            "limit": 5
        }
    ]
    
    print("✅ Example message types:")
    for i, msg in enumerate(example_messages, 1):
        print(f"   {i}. {msg['type']}: {json.dumps(msg, indent=6)}")

if __name__ == "__main__":
    test_submission_db()
    test_message_types()
