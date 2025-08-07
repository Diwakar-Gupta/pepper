import os

# Server URLs
SIGNALING_SERVER_URL = "https://pepper-isjb.onrender.com"
TEST_CASES_SERVER_URL = "https://diwakar-gupta.github.io/pepper"

# File paths
JUDGE_CODE_FILE = ".judge_code"
TEST_CASES_CACHE_DIR = ".test_cases_cache"

# Retry configuration for Render webapp suspension
MAX_RETRY_ATTEMPTS = 5
RETRY_DELAY_BASE = 2  # Base delay in seconds
WAKEUP_TIMEOUT = 30  # Timeout for wakeup request

# Language configurations
LANG_COMMANDS = {
    "python": ["python3", "--version"],
    "java": ["java", "-version"],
    "cpp": ["g++", "--version"]
}

# Ensure cache directory exists
if not os.path.exists(TEST_CASES_CACHE_DIR):
    os.makedirs(TEST_CASES_CACHE_DIR)
