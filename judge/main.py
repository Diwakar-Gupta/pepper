import asyncio
import threading
import signal
import sys
import socketio
from submission_db import SubmissionDB
from config import SIGNALING_SERVER_URL
from connection_manager import connect_with_retry
from judge_code_manager import get_or_create_judge_code, format_judge_code
from webrtc_handler import WebRTCHandler


def main():
    # Initialize submission database
    submission_db = SubmissionDB()
    
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
        nonlocal sio, loop
        sio = socketio.Client()
        session_id = get_or_create_judge_code()
        print(f"\n=== JUDGE CODE: {format_judge_code(session_id)} ===")
        print("Enter this code in your browser to connect.")
        print("=" * 40)
        print("Press Ctrl+C to exit")
        
        webrtc_handler = WebRTCHandler(session_id, sio, submission_db)
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
            signal = data.get("signal")
            print(f"Received signal from browser: {signal['type']}")
            
            if signal["type"] == "offer":
                webrtc_handler.handle_offer(signal, loop)
            elif signal["type"] == "ice":
                webrtc_handler.handle_ice_candidate(signal, loop)
        
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


if __name__ == "__main__":
    main()
