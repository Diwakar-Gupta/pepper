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

if __name__ == "__main__":
    SIGNALING_SERVER_URL = "http://localhost:8080"  # <-- replace with your deployed signaling server
    JUDGE_CODE_FILE = ".judge_code"

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

        try:
            sio.connect(SIGNALING_SERVER_URL, transports=["websocket"])
            sio.wait()
        except Exception as e:
            print(f"Failed to connect to signaling server: {e}")

    # Start signaling
    start_webrtc_signaling()
