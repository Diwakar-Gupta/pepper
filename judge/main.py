import subprocess
import shutil
import tempfile
import os
import difflib
import asyncio
from aiortc import RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, RTCConfiguration, RTCIceServer
import threading
import json
import requests
import socketio
import random
import string
import signal
import sys
import time
import urllib.request
import hashlib
from submission_db import SubmissionDB

SIGNALING_SERVER_URL = "https://pepper-isjb.onrender.com"
TEST_CASES_SERVER_URL = "https://diwakar-gupta.github.io/pepper"
JUDGE_CODE_FILE = ".judge_code"
TEST_CASES_CACHE_DIR = ".test_cases_cache"

# Retry configuration for Render webapp suspension
MAX_RETRY_ATTEMPTS = 5
RETRY_DELAY_BASE = 2  # Base delay in seconds
WAKEUP_TIMEOUT = 30  # Timeout for wakeup request

LANG_COMMANDS = {
    "python": ["python3", "--version"],
    "java": ["java", "-version"],
    "cpp": ["g++", "--version"]
}

EXECUTORS = {
    "python": lambda code, input_text: run_python(code, input_text),
    "java": lambda code, input_text: run_java(code, input_text),
    "cpp": lambda code, input_text: run_cpp(code, input_text)
}

# Initialize submission database
submission_db = SubmissionDB()

def detect_languages():
    result = {}
    for lang, cmd in LANG_COMMANDS.items():
        try:
            version = subprocess.check_output(cmd, stderr=subprocess.STDOUT).decode().split('\n')[0]
            result[lang] = version
        except Exception as e:
            result[lang] = None
    return result

def run_python(code, input_text):
    with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as f:
        f.write(code)
        filepath = f.name
    try:
        result = subprocess.run(["python3", filepath], input=input_text.encode(), capture_output=True, timeout=5)
        return result.stdout.decode(), result.stderr.decode()
    finally:
        os.remove(filepath)

def run_cpp(code, input_text):
    with tempfile.TemporaryDirectory() as tempdir:
        source = os.path.join(tempdir, "main.cpp")
        binary = os.path.join(tempdir, "main.out")
        with open(source, "w") as f:
            f.write(code)
        compile_result = subprocess.run(["g++", source, "-o", binary], capture_output=True)
        if compile_result.returncode != 0:
            return "", compile_result.stderr.decode()
        run_result = subprocess.run([binary], input=input_text.encode(), capture_output=True, timeout=5)
        return run_result.stdout.decode(), run_result.stderr.decode()

def run_java(code, input_text):
    with tempfile.TemporaryDirectory() as tempdir:
        source_path = os.path.join(tempdir, "Main.java")
        with open(source_path, "w") as f:
            f.write(code)
        compile = subprocess.run(["javac", source_path], capture_output=True)
        if compile.returncode != 0:
            return "", compile.stderr.decode()
        run = subprocess.run(["java", "-cp", tempdir, "Main"], input=input_text.encode(), capture_output=True, timeout=5)
        return run.stdout.decode(), run.stderr.decode()

def compare_outputs(actual, expected):
    # Split into lines, strip each line, ignore line ending differences
    actual_lines = [line.rstrip() for line in actual.strip().splitlines()]
    expected_lines = [line.rstrip() for line in expected.strip().splitlines()]
    passed = actual_lines == expected_lines
    diff = None
    if not passed:
        diff = '\n'.join(difflib.unified_diff(expected_lines, actual_lines, fromfile='expected', tofile='output', lineterm=''))
    return passed, diff

def get_cache_key(problem_slug):
    """Generate a cache key for a problem"""
    return hashlib.md5(problem_slug.encode()).hexdigest()

def get_cached_test_cases(problem_slug):
    """Get test cases from cache if available"""
    try:
        if not os.path.exists(TEST_CASES_CACHE_DIR):
            return None
        
        cache_key = get_cache_key(problem_slug)
        cache_file = os.path.join(TEST_CASES_CACHE_DIR, f"{cache_key}.json")
        
        if os.path.exists(cache_file):
            with open(cache_file, 'r') as f:
                return json.load(f)
        return None
    except Exception as e:
        print(f"Error reading cache for {problem_slug}: {e}")
        return None

def cache_test_cases(problem_slug, test_cases):
    """Cache test cases for a problem"""
    try:
        if not os.path.exists(TEST_CASES_CACHE_DIR):
            os.makedirs(TEST_CASES_CACHE_DIR)
        
        cache_key = get_cache_key(problem_slug)
        cache_file = os.path.join(TEST_CASES_CACHE_DIR, f"{cache_key}.json")
        
        with open(cache_file, 'w') as f:
            json.dump(test_cases, f)
        
        print(f"Cached {len(test_cases)} test cases for {problem_slug}")
    except Exception as e:
        print(f"Error caching test cases for {problem_slug}: {e}")

def fetch_test_cases(problem_slug):
    """Fetch test cases for a problem from the frontend server with caching"""
    # First try to get from cache
    cached_test_cases = get_cached_test_cases(problem_slug)
    if cached_test_cases is not None:
        print(f"Using cached test cases for {problem_slug}")
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
                # Fetch input file
                input_url = f"{TEST_CASES_SERVER_URL}/database/testcases/{problem_slug}/{test_case['input']}"
                with urllib.request.urlopen(input_url) as response:
                    input_data = response.read().decode().strip()
                
                # Fetch output file
                output_url = f"{TEST_CASES_SERVER_URL}/database/testcases/{problem_slug}/{test_case['output']}"
                with urllib.request.urlopen(output_url) as response:
                    output_data = response.read().decode().strip()
                
                test_cases.append({
                    'input': input_data,
                    'expectedOutput': output_data
                })
            except Exception as e:
                print(f"Error fetching test case: {e}")
                continue
        
        # Cache the test cases for future use
        if test_cases:
            cache_test_cases(problem_slug, test_cases)
        
        return test_cases
    except Exception as e:
        print(f"Error fetching test cases for {problem_slug}: {e}")
        return []

def wake_up_render_app(url, timeout=WAKEUP_TIMEOUT):
    """Wake up a suspended Render webapp by making an HTTP request"""
    try:
        print(f"Attempting to wake up Render app at {url}...")
        response = requests.get(url, timeout=timeout)
        if response.status_code == 200:
            print("✓ Render app is awake and responding")
            return True
        else:
            print(f"⚠ Render app responded with status {response.status_code}")
            return False
    except requests.exceptions.Timeout:
        print(f"⚠ Timeout waiting for Render app to wake up ({timeout}s)")
        return False
    except requests.exceptions.ConnectionError:
        print("⚠ Connection error - Render app may still be starting up")
        return False
    except Exception as e:
        print(f"⚠ Error waking up Render app: {e}")
        return False

def connect_with_retry(sio, url, max_attempts=MAX_RETRY_ATTEMPTS):
    """Connect to signaling server with retry logic for suspended Render apps"""
    for attempt in range(1, max_attempts + 1):
        try:
            print(f"\n--- Connection Attempt {attempt}/{max_attempts} ---")
            
            # First, try to wake up the Render app
            if attempt > 1:  # Skip wake-up on first attempt
                print("Render app may be suspended, attempting to wake it up...")
                wake_up_render_app(url)
                # Give the app some time to fully start up
                time.sleep(3)
            
            print(f"Connecting to signaling server: {url}")
            sio.connect(url, transports=["websocket"])
            print("✓ Successfully connected to signaling server!")
            return True
            
        except Exception as e:
            error_msg = str(e).lower()
            print(f"✗ Connection attempt {attempt} failed: {e}")
            
            if attempt < max_attempts:
                # Calculate exponential backoff delay
                delay = RETRY_DELAY_BASE ** attempt
                print(f"Waiting {delay} seconds before retry...")
                time.sleep(delay)
            else:
                print(f"\n❌ All {max_attempts} connection attempts failed.")
                print("\nPossible solutions:")
                print("1. Check if the Render app URL is correct")
                print("2. Verify the Render app is deployed and running")
                print("3. Wait a few minutes and try again (Render apps can take time to start)")
                print("4. Check Render dashboard for any deployment issues")
                return False
    
    return False

if __name__ == "__main__":

    def generate_judge_code():
        """Generate 8-character alphanumeric code"""
        chars = string.ascii_uppercase + string.digits
        return ''.join(random.choice(chars) for _ in range(8))

    def format_judge_code(code):
        """Format code as XXXX-XXXX"""
        return f"{code[:4]}-{code[4:]}"

    def get_or_create_judge_code():
        """Get existing code or create new one"""
        if os.path.exists(JUDGE_CODE_FILE):
            with open(JUDGE_CODE_FILE, 'r') as f:
                code = f.read().strip()
                if len(code) == 8 and code.isalnum():
                    return code
        
        # Generate new code
        code = generate_judge_code()
        with open(JUDGE_CODE_FILE, 'w') as f:
            f.write(code)
        return code

    # Global variables for cleanup
    sio = None
    loop = None

    def signal_handler(sig, frame):
        print("\nShutting down judge...")
        if sio:
            sio.disconnect()
        if loop:
            loop.stop()
        sys.exit(0)

    # Set up signal handler
    signal.signal(signal.SIGINT, signal_handler)

    def start_webrtc_signaling():
        global sio, loop
        sio = socketio.Client()
        session_id = get_or_create_judge_code()
        print(f"\n=== JUDGE CODE: {format_judge_code(session_id)} ===")
        print("Enter this code in your browser to connect.")
        print("=" * 40)
        print("Press Ctrl+C to exit")

        rtc_pc = None
        data_channel = None
        ice_candidates = []
        browser_ice_candidates = []
        loop = asyncio.new_event_loop()

        def run_loop():
            asyncio.set_event_loop(loop)
            loop.run_forever()

        threading.Thread(target=run_loop, daemon=True).start()

        @sio.event
        def connect():
            print("Connected to signaling server.")
            sio.emit("join", {"sessionId": session_id})

        @sio.on("signal")
        def on_signal(data):
            nonlocal rtc_pc, data_channel, ice_candidates, browser_ice_candidates
            signal = data.get("signal")
            print(f"Received signal from browser: {signal['type']}")
            if signal["type"] == "offer":
                print("Received offer from browser.")
                print("Creating RTCPeerConnection...")
                try:
                    # Create proper RTCConfiguration with RTCIceServer
                    ice_server = RTCIceServer(urls=["stun:stun.l.google.com:19302"])
                    config = RTCConfiguration(iceServers=[ice_server])
                    print(f"Created RTCConfiguration: {config}")
                    rtc_pc = RTCPeerConnection(configuration=config)
                    print("RTCPeerConnection created successfully")
                except Exception as e:
                    print(f"Error creating RTCPeerConnection: {e}")
                    import traceback
                    traceback.print_exc()
                    return
                
                channel_ready = asyncio.Event()

                @rtc_pc.on("datachannel")
                def on_datachannel(channel):
                    nonlocal data_channel
                    data_channel = channel
                    print("WebRTC DataChannel established with browser.")
                    
                    # Send languages immediately when DataChannel opens
                    print("Sending initial languages to browser...")
                    initial_languages = {"languages": detect_languages()}
                    print(f"Initial languages: {initial_languages}")
                    channel.send(json.dumps(initial_languages))

                    @channel.on("message")
                    def on_message(message):
                        print(f"Received message from browser: {message}")
                        try:
                            data = json.loads(message)
                            msg_id = data.get("_msgId")
                            
                            if data.get("type") == "languages":
                                response = {"languages": detect_languages()}
                            elif data.get("type") == "execute":
                                code = data.get("code")
                                lang = data.get("language")
                                test_cases = data.get("testCases", [])
                                if not test_cases:
                                    input_text = data.get("input", "")
                                    test_cases = [{"input": input_text, "expectedOutput": ""}]
                                if lang not in EXECUTORS:
                                    response = {"error": "Unsupported language"}
                                else:
                                    results = []
                                    for i, test_case in enumerate(test_cases):
                                        input_text = test_case.get("input", "")
                                        expected_output = test_case.get("expectedOutput", "")
                                        try:
                                            stdout, stderr = EXECUTORS[lang](code, input_text)
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
                                    response = {
                                        "results": results,
                                        "summary": {
                                            "total": len(results),
                                            "passed": sum(1 for r in results if r["passed"] is True),
                                            "failed": sum(1 for r in results if r["passed"] is False),
                                            "noExpectedOutput": sum(1 for r in results if r["passed"] is None)
                                        }
                                    }
                            elif data.get("type") == "submit":
                                code = data.get("code")
                                lang = data.get("language")
                                problem_slug = data.get("problemSlug")
                                
                                if not problem_slug:
                                    response = {"error": "Problem slug is required"}
                                elif lang not in EXECUTORS:
                                    response = {"error": "Unsupported language"}
                                else:
                                    # Fetch test cases for the problem
                                    test_cases = fetch_test_cases(problem_slug)
                                    if not test_cases:
                                        # Save error submission to database
                                        error_message = "No test cases found for this problem"
                                        submission_id = submission_db.add_submission(
                                            problem_slug=problem_slug,
                                            language=lang,
                                            code=code,
                                            status="error",
                                            error_message=error_message
                                        )
                                        response = {
                                            "error": error_message,
                                            "submissionId": submission_id
                                        }
                                    else:
                                        results = []
                                        failed_test_case = None
                                        
                                        for i, test_case in enumerate(test_cases):
                                            input_text = test_case.get("input", "")
                                            expected_output = test_case.get("expectedOutput", "")
                                            try:
                                                stdout, stderr = EXECUTORS[lang](code, input_text)
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
                                                language=lang,
                                                code=code,
                                                status=status,
                                                test_results=test_results,
                                                error_message=error_message
                                            )
                                            
                                            # Return the failed test case details
                                            response = {
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
                                                language=lang,
                                                code=code,
                                                status=status,
                                                test_results=test_results
                                            )
                                            
                                            response = {
                                                "failed": False,
                                                "allPassed": True,
                                                "message": "All test cases passed!",
                                                "submissionId": submission_id
                                            }
                            elif data.get("type") == "submission_history":
                                        problem_slug = data.get("problemSlug")
                                        if not problem_slug:
                                            response = {"error": "Problem slug is required"}
                                        else:
                                            history = submission_db.get_submission_history(problem_slug)
                                            # Remove code from history for lighter response (only include metadata)
                                            history_summary = []
                                            for submission in history:
                                                summary = {
                                                    "id": submission["id"],
                                                    "language": submission["language"],
                                                    "status": submission["status"],
                                                    "timestamp": submission["timestamp"],
                                                    "datetime": submission["datetime"],
                                                    "error_message": submission.get("error_message")
                                                }
                                                if submission.get("test_results"):
                                                    summary["test_results"] = submission["test_results"]
                                                history_summary.append(summary)
                                            
                                            response = {
                                                "problemSlug": problem_slug,
                                                "history": history_summary,
                                                "totalSubmissions": len(history_summary)
                                            }
                            elif data.get("type") == "check_problems_status":
                                        problem_slugs = data.get("problemSlugs", [])
                                        if not isinstance(problem_slugs, list):
                                            response = {"error": "problemSlugs must be a list"}
                                        else:
                                            status_map = submission_db.check_problems_status(problem_slugs)
                                            response = {
                                                "problemStatuses": status_map,
                                                "totalProblems": len(problem_slugs),
                                                "solvedCount": sum(1 for status in status_map.values() if status == "success"),
                                                "failedCount": sum(1 for status in status_map.values() if status == "failed"),
                                                "errorCount": sum(1 for status in status_map.values() if status == "error"),
                                                "notAttemptedCount": sum(1 for status in status_map.values() if status == "not_attempted")
                                            }
                            elif data.get("type") == "submission_stats":
                                        stats = submission_db.get_submission_stats()
                                        response = {"stats": stats}
                            elif data.get("type") == "recent_submissions":
                                        limit = data.get("limit", 10)
                                        recent = submission_db.get_recent_submissions(limit)
                                        response = {
                                            "recentSubmissions": recent,
                                            "count": len(recent)
                                        }
                            else:
                                response = {"error": "Unknown type"}
                
                            # Include the _msgId in the response if it was provided
                            if msg_id is not None:
                                response["_msgId"] = msg_id
                            
                            print(f"Sending response to browser: {response}")
                            channel.send(json.dumps(response))
                        except Exception as e:
                            print(f"Error handling message: {e}")
                            error_response = {"error": str(e)}
                            if msg_id is not None:
                                error_response["_msgId"] = msg_id
                            channel.send(json.dumps(error_response))

                        channel_ready.set()

                @rtc_pc.on("icecandidate")
                def on_icecandidate(event):
                    if event.candidate:
                        print(f"Sending ICE candidate to browser: {event.candidate}")
                        sio.emit("signal", {
                            "sessionId": session_id,
                            "from": "judge",
                            "signal": {"type": "ice", "candidate": event.candidate}
                        })

                # Handle the offer immediately
                async def process_offer():
                    try:
                        print("Setting remote description from offer...")
                        offer_sdp = RTCSessionDescription(sdp=signal["offer"]["sdp"], type=signal["offer"]["type"])
                        await rtc_pc.setRemoteDescription(offer_sdp)
                        print("Remote description set successfully")
                        print("Creating answer...")
                        answer = await rtc_pc.createAnswer()
                        print("Answer created successfully")
                        print("Setting local description...")
                        await rtc_pc.setLocalDescription(answer)
                        print("Local description set successfully")
                        print(f"Sending answer to browser: {rtc_pc.localDescription.sdp[:100]}...")
                        sio.emit("signal", {
                            "sessionId": session_id,
                            "from": "judge",
                            "signal": {"type": "answer", "answer": {
                                "sdp": rtc_pc.localDescription.sdp,
                                "type": rtc_pc.localDescription.type
                            }}
                        })
                        print("Answer sent to browser")
                        print("Waiting for DataChannel to be ready...")
                        await channel_ready.wait()
                        print("DataChannel is ready!")
                    except Exception as e:
                        print(f"Error creating/sending answer: {e}")
                        import traceback
                        traceback.print_exc()

                # Run the offer processing
                asyncio.run_coroutine_threadsafe(process_offer(), loop)
            elif signal["type"] == "ice":
                print(f"Received ICE candidate from browser: {signal['candidate']}")
                if rtc_pc:
                    async def add_ice():
                        try:
                            # Convert dictionary to RTCIceCandidate object
                            candidate_dict = signal["candidate"]
                            candidate = RTCIceCandidate(
                                component=candidate_dict.get("component", 1),
                                foundation=candidate_dict.get("foundation", ""),
                                ip=candidate_dict.get("address", ""),
                                port=candidate_dict.get("port", 0),
                                priority=candidate_dict.get("priority", 0),
                                protocol=candidate_dict.get("protocol", ""),
                                type=candidate_dict.get("type", ""),
                                sdpMid=candidate_dict.get("sdpMid", ""),
                                sdpMLineIndex=candidate_dict.get("sdpMLineIndex", 0)
                            )
                            await rtc_pc.addIceCandidate(candidate)
                            print("Added ICE candidate from browser")
                        except Exception as e:
                            print(f"Error adding ICE candidate: {e}")
                            print(f"signal: {signal}")
                    asyncio.run_coroutine_threadsafe(add_ice(), loop)

        # Use retry logic to handle Render webapp suspension
        if connect_with_retry(sio, SIGNALING_SERVER_URL):
            print("\n🎯 Judge is ready and waiting for connections...")
            try:
                sio.wait()
            except KeyboardInterrupt:
                print("\n👋 Shutting down gracefully...")
            except Exception as e:
                print(f"\n⚠ Connection lost: {e}")
                print("The signaling server connection was interrupted.")
        else:
            print("\n❌ Could not establish connection to signaling server.")
            print("Please check the server status and try again.")

    # Start signaling
    start_webrtc_signaling()
