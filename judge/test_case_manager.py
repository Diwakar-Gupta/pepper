import os
import json
import urllib.request
import hashlib
from config import TEST_CASES_CACHE_DIR, TEST_CASES_SERVER_URL


def test_case_file_path(problem_slug, filename):
    """Generate file path for a test case input or output file"""
    if not os.path.exists(TEST_CASES_CACHE_DIR):
        os.makedirs(TEST_CASES_CACHE_DIR)
    
    # Sanitize problem_slug for filesystem
    safe_slug = problem_slug.replace("/", "_").replace("\\", "_")
    return os.path.join(TEST_CASES_CACHE_DIR, f"{safe_slug}__{filename}")


def fetch_and_cache_test_case_file(problem_slug, filename):
    """Fetch and cache a single test case file (input or output)"""
    file_path = test_case_file_path(problem_slug, filename)
    
    # If file already exists, return the path
    if os.path.exists(file_path):
        return file_path
    
    try:
        # Fetch the file from server
        url = f"{TEST_CASES_SERVER_URL}/database/testcases/{problem_slug}/{filename}"
        with urllib.request.urlopen(url) as response:
            data = response.read().decode().strip()
        
        # Save to cache
        with open(file_path, 'w') as f:
            f.write(data)
        
        print(f"Cached test case file: {filename} for problem {problem_slug}")
        return file_path
    except Exception as e:
        print(f"Error fetching test case file {filename} for {problem_slug}: {e}")
        return None


def load_test_case_file(problem_slug, filename):
    """Load a test case file, fetching if not cached"""
    file_path = test_case_file_path(problem_slug, filename)
    
    # If file doesn't exist, try to fetch it
    if not os.path.exists(file_path):
        file_path = fetch_and_cache_test_case_file(problem_slug, filename)
        if not file_path:
            return None
    
    try:
        with open(file_path, 'r') as f:
            return f.read().strip()
    except Exception as e:
        print(f"Error reading test case file {file_path}: {e}")
        return None


def get_cached_test_cases(problem_slug):
    """Get test cases from cache if available"""
    try:
        # Fetch problem details to get test case file names
        problem_url = f"{TEST_CASES_SERVER_URL}/database/problems/{problem_slug}.json"
        with urllib.request.urlopen(problem_url) as response:
            problem_data = json.loads(response.read().decode())
        
        if not problem_data.get('testCases'):
            return None
        
        # Check if all test case files are cached
        all_cached = True
        for test_case in problem_data['testCases']:
            input_path = test_case_file_path(problem_slug, test_case['input'])
            output_path = test_case_file_path(problem_slug, test_case['output'])
            if not os.path.exists(input_path) or not os.path.exists(output_path):
                all_cached = False
                break
        
        if all_cached:
            # Load test cases from individual files
            test_cases = []
            for test_case in problem_data['testCases']:
                input_data = load_test_case_file(problem_slug, test_case['input'])
                output_data = load_test_case_file(problem_slug, test_case['output'])
                if input_data is not None and output_data is not None:
                    test_cases.append({
                        'input': input_data,
                        'expectedOutput': output_data
                    })
            return test_cases if test_cases else None
        
        return None
    except Exception as e:
        print(f"Error checking cached test cases for {problem_slug}: {e}")
        return None


def fetch_test_cases(problem_slug):
    """Fetch test cases for a problem from the server, storing each file individually"""
    # First try to get from individual file cache
    cached_test_cases = get_cached_test_cases(problem_slug)
    if cached_test_cases is not None:
        print(f"Using cached test case files for {problem_slug}")
        return cached_test_cases
    
    try:
        # Fetch problem details to get test case file names
        problem_url = f"{TEST_CASES_SERVER_URL}/database/problems/{problem_slug}.json"
        with urllib.request.urlopen(problem_url) as response:
            problem_data = json.loads(response.read().decode())
        
        if not problem_data.get('testCases'):
            return []
        
        test_cases = []
        for test_case in problem_data['testCases']:
            try:
                # Fetch and cache input file
                input_data = load_test_case_file(problem_slug, test_case['input'])
                if input_data is None:
                    print(f"Failed to load input file: {test_case['input']}")
                    continue
                
                # Fetch and cache output file
                output_data = load_test_case_file(problem_slug, test_case['output'])
                if output_data is None:
                    print(f"Failed to load output file: {test_case['output']}")
                    continue
                
                test_cases.append({
                    'input': input_data,
                    'expectedOutput': output_data
                })
            except Exception as e:
                print(f"Error processing test case for {problem_slug}: {e}")
                continue
        
        print(f"Loaded {len(test_cases)} test cases for {problem_slug} from individual files")
        return test_cases
    except Exception as e:
        print(f"Error fetching test cases for {problem_slug}: {e}")
        return []


def fetch_and_cache_all_test_case_files(problem_slug):
    """Fetch and cache all test case files for a problem"""
    try:
        # Fetch problem details to get test case file names
        problem_url = f"{TEST_CASES_SERVER_URL}/database/problems/{problem_slug}.json"
        with urllib.request.urlopen(problem_url) as response:
            problem_data = json.loads(response.read().decode())
        
        if not problem_data.get('testCases'):
            return []
        
        cached_files = []
        for test_case in problem_data['testCases']:
            # Cache input file
            input_path = fetch_and_cache_test_case_file(problem_slug, test_case['input'])
            if input_path:
                cached_files.append(input_path)
            
            # Cache output file
            output_path = fetch_and_cache_test_case_file(problem_slug, test_case['output'])
            if output_path:
                cached_files.append(output_path)
        
        print(f"Cached {len(cached_files)} test case files for {problem_slug}")
        return cached_files
    except Exception as e:
        print(f"Error caching all test case files for {problem_slug}: {e}")
        return []
