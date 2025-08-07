import asyncio
import json
from aiortc import RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, RTCConfiguration, RTCIceServer
from code_executor import detect_languages
from message_handler import MessageHandler


class WebRTCHandler:
    def __init__(self, session_id, sio, submission_db):
        self.session_id = session_id
        self.sio = sio
        self.submission_db = submission_db
        self.message_handler = MessageHandler(submission_db)
        self.rtc_pc = None
        self.data_channel = None
        self.channel_ready = asyncio.Event()
    
    def handle_offer(self, signal, loop):
        """Handle WebRTC offer from browser"""
        print("Received offer from browser.")
        print("Creating RTCPeerConnection...")
        try:
            # Create proper RTCConfiguration with RTCIceServer
            ice_server = RTCIceServer(urls=["stun:stun.l.google.com:19302"])
            config = RTCConfiguration(iceServers=[ice_server])
            print(f"Created RTCConfiguration: {config}")
            self.rtc_pc = RTCPeerConnection(configuration=config)
            print("RTCPeerConnection created successfully")
        except Exception as e:
            print(f"Error creating RTCPeerConnection: {e}")
            import traceback
            traceback.print_exc()
            return
        
        @self.rtc_pc.on("datachannel")
        def on_datachannel(channel):
            self.data_channel = channel
            print("WebRTC DataChannel established with browser.")
            
            # Send languages immediately when DataChannel opens
            print("Sending initial languages to browser...")
            initial_languages = {"languages": detect_languages()}
            print(f"Initial languages: {initial_languages}")
            channel.send(json.dumps(initial_languages))
            
            @channel.on("message")
            def on_message(message):
                print(f"Received message from browser: {message}")
                self.message_handler.handle_message(message, channel)
            
            self.channel_ready.set()
        
        @self.rtc_pc.on("icecandidate")
        def on_icecandidate(event):
            if event.candidate:
                print(f"Sending ICE candidate to browser: {event.candidate}")
                self.sio.emit("signal", {
                    "sessionId": self.session_id,
                    "from": "judge",
                    "signal": {"type": "ice", "candidate": event.candidate}
                })
        
        # Process the offer
        asyncio.run_coroutine_threadsafe(self._process_offer(signal), loop)
    
    async def _process_offer(self, signal):
        """Process the WebRTC offer"""
        try:
            print("Setting remote description from offer...")
            offer_sdp = RTCSessionDescription(sdp=signal["offer"]["sdp"], type=signal["offer"]["type"])
            await self.rtc_pc.setRemoteDescription(offer_sdp)
            print("Remote description set successfully")
            print("Creating answer...")
            answer = await self.rtc_pc.createAnswer()
            print("Answer created successfully")
            print("Setting local description...")
            await self.rtc_pc.setLocalDescription(answer)
            print("Local description set successfully")
            print(f"Sending answer to browser: {self.rtc_pc.localDescription.sdp[:100]}...")
            self.sio.emit("signal", {
                "sessionId": self.session_id,
                "from": "judge",
                "signal": {"type": "answer", "answer": {
                    "sdp": self.rtc_pc.localDescription.sdp,
                    "type": self.rtc_pc.localDescription.type
                }}
            })
            print("Answer sent to browser")
            print("Waiting for DataChannel to be ready...")
            await self.channel_ready.wait()
            print("DataChannel is ready!")
        except Exception as e:
            print(f"Error creating/sending answer: {e}")
            import traceback
            traceback.print_exc()
    
    def handle_ice_candidate(self, signal, loop):
        """Handle ICE candidate from browser"""
        print(f"Received ICE candidate from browser: {signal['candidate']}")
        if self.rtc_pc:
            asyncio.run_coroutine_threadsafe(self._add_ice_candidate(signal), loop)
    
    async def _add_ice_candidate(self, signal):
        """Add ICE candidate to peer connection"""
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
            await self.rtc_pc.addIceCandidate(candidate)
            print("Added ICE candidate from browser")
        except Exception as e:
            print(f"Error adding ICE candidate: {e}")
            print(f"signal: {signal}")
