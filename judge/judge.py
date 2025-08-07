import difflib
from code_executor import execute_code
from test_case_manager import fetch_test_cases


def compare_outputs(actual, expected):
    """Compare actual output with expected output"""
    # Split into lines, strip each line, ignore line ending differences
    actual_lines = [line.rstrip() for line in actual.strip().splitlines()]
    expected_lines = [line.rstrip() for line in expected.strip().splitlines()]
    passed = actual_lines == expected_lines
    diff = None
    if not passed:
        diff = '\n'.join(difflib.unified_diff(expected_lines, actual_lines, fromfile='expected', tofile='output', lineterm=''))
    return passed, diff


def execute_test_cases(language, code, test_cases):
    """Execute code against multiple test cases"""
    results = []
    for i, test_case in enumerate(test_cases):
        input_text = test_case.get("input", "")
        expected_output = test_case.get("expectedOutput", "")
        try:
            stdout, stderr = execute_code(language, code, input_text)
            actual_output = stdout.strip()
            expected_output = expected_output.strip()
            passed, diff = (None, None)
            if expected_output:
                passed, diff = compare_outputs(actual_output, expected_output)
            results.append({
                "testCase": i + 1,
                "input": input_text,
                "expectedOutput": expected_output,
                "actualOutput": actual_output,
                "stderr": stderr,
                "passed": passed,
                "diff": diff,
                "error": None
            })
        except Exception as e:
            results.append({
                "testCase": i + 1,
                "input": input_text,
                "expectedOutput": expected_output,
                "actualOutput": "",
                "stderr": str(e),
                "passed": False,
                "diff": None,
                "error": str(e)
            })
    return results


def judge_submission(language, code, problem_slug, submission_db):
    """Judge a code submission against problem test cases"""
    if not problem_slug:
        return {"error": "Problem slug is required"}
    
    # Fetch test cases for the problem
    test_cases = fetch_test_cases(problem_slug)
    if not test_cases:
        error_message = "No test cases found for this problem"
        submission_id = submission_db.add_submission(
            problem_slug=problem_slug,
            language=language,
            code=code,
            status="error",
            error_message=error_message
        )
        return {
            "error": error_message,
            "submissionId": submission_id
        }
    
    results = []
    failed_test_case = None
    
    for i, test_case in enumerate(test_cases):
        input_text = test_case.get("input", "")
        expected_output = test_case.get("expectedOutput", "")
        try:
            stdout, stderr = execute_code(language, code, input_text)
            actual_output = stdout.strip()
            expected_output = expected_output.strip()
            passed, diff = compare_outputs(actual_output, expected_output)
            
            result = {
                "testCase": i + 1,
                "input": input_text,
                "expectedOutput": expected_output,
                "actualOutput": actual_output,
                "stderr": stderr,
                "passed": passed,
                "diff": diff,
                "error": None
            }
            results.append(result)
            
            # If this test case failed, stop execution and return details
            if not passed:
                failed_test_case = result
                break
                
        except Exception as e:
            result = {
                "testCase": i + 1,
                "input": input_text,
                "expectedOutput": expected_output,
                "actualOutput": "",
                "stderr": str(e),
                "passed": False,
                "diff": None,
                "error": str(e)
            }
            results.append(result)
            failed_test_case = result
            break
    
    # Determine submission status and save to database
    if failed_test_case:
        # Submission failed
        status = "failed"
        test_results = {
            "total_test_cases": len(test_cases),
            "passed_test_cases": len(results) - 1,  # All except the failed one
            "failed_test_case": failed_test_case
        }
        error_message = f"Test case {failed_test_case['testCase']} failed"
        
        # Save failed submission to database
        submission_id = submission_db.add_submission(
            problem_slug=problem_slug,
            language=language,
            code=code,
            status=status,
            test_results=test_results,
            error_message=error_message
        )
        
        # Return the failed test case details
        return {
            "failed": True,
            "failedTestCase": failed_test_case,
            "testCaseNumber": failed_test_case["testCase"],
            "message": error_message,
            "submissionId": submission_id
        }
    else:
        # All test cases passed
        status = "success"
        test_results = {
            "total_test_cases": len(test_cases),
            "passed_test_cases": len(results),
            "all_passed": True
        }
        
        # Save successful submission to database
        submission_id = submission_db.add_submission(
            problem_slug=problem_slug,
            language=language,
            code=code,
            status=status,
            test_results=test_results
        )
        
        return {
            "failed": False,
            "allPassed": True,
            "message": "All test cases passed!",
            "submissionId": submission_id
        }
