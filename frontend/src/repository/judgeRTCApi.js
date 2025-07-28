// judgeRTCApi.js
// Communicates with the local judge server using WebRTC DataChannel and a public signaling server
import io from "socket.io-client";
import {SIGNALING_SERVER_URL} from "../constants";

const STUN_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];
const JUDGE_CODE_KEY = "pepper_judge_code";

let dataChannel = null;
let connected = false;
let pendingQueue = [];
let responseResolvers = {};
let msgId = 0;
let rtcPc = null;
let socket = null;
let sessionId = null;
let onConnectionStatusChange = null;
let onLanguagesReceived = null;

// Connection status events
export const CONNECTION_STATUS = {
  DISCONNECTED: "disconnected",
  CONNECTING: "connecting", 
  CONNECTED: "connected",
  ERROR: "error"
};

export function setConnectionStatusCallback(callback) {
  onConnectionStatusChange = callback;
}

export function setLanguagesReceivedCallback(callback) {
  onLanguagesReceived = callback;
}

function updateConnectionStatus(status, message = "") {
  if (onConnectionStatusChange) {
    onConnectionStatusChange(status, message);
  }
}

function getStoredJudgeCode() {
  return localStorage.getItem(JUDGE_CODE_KEY);
}

function storeJudgeCode(code) {
  localStorage.setItem(JUDGE_CODE_KEY, code);
}

export function setJudgeCode(code) {
  // Remove any non-alphanumeric characters and convert to uppercase
  const cleanCode = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (cleanCode.length !== 8) {
    throw new Error("Judge code must be 8 characters long");
  }
  storeJudgeCode(cleanCode);
  sessionId = cleanCode;
  // Disconnect current connection to use new code
  disconnect();
  // Automatically attempt to connect with the new code
  setTimeout(() => {
    connectRTC().catch(error => {
      console.log("Auto-connection failed:", error);
    });
  }, 100);
  return cleanCode;
}

// Auto-connect if there's a stored code
export function autoConnectIfStored() {
  const storedCode = getStoredJudgeCode();
  if (storedCode) {
    console.log("Found stored judge code, auto-connecting...");
    sessionId = storedCode;
    connectRTC().catch(error => {
      console.log("Auto-connection failed:", error);
    });
  }
}

export function getJudgeCode() {
  return getStoredJudgeCode();
}

export function disconnect() {
  if (dataChannel) {
    dataChannel.close();
    dataChannel = null;
  }
  if (rtcPc) {
    rtcPc.close();
    rtcPc = null;
  }
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  connected = false;
  sessionId = null;
  // Clear stored languages
  window.judgeLanguages = null;
  updateConnectionStatus(CONNECTION_STATUS.DISCONNECTED);
}

async function connectRTC() {
  if (connected) return;
  
  // Get judge code
  if (!sessionId) {
    sessionId = getStoredJudgeCode();
    if (!sessionId) {
      updateConnectionStatus(CONNECTION_STATUS.ERROR, "No judge code set. Please enter the judge code.");
      throw new Error("No judge code set");
    }
  }

  console.log("Attempting to connect to judge with code:", sessionId);
  updateConnectionStatus(CONNECTION_STATUS.CONNECTING, "Connecting to judge...");
  
  if (!socket) {
    console.log("Creating socket connection to:", SIGNALING_SERVER_URL);
    socket = io(SIGNALING_SERVER_URL, { transports: ["websocket"] });
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.log("Signaling server connection timeout");
        reject(new Error("Signaling server timeout"));
      }, 10000);
      socket.on("connect", () => {
        console.log("Connected to signaling server");
        clearTimeout(timeout);
        resolve();
      });
      socket.on("connect_error", (error) => {
        console.log("Signaling connection error:", error);
        clearTimeout(timeout);
        reject(new Error(`Signaling connection failed: ${error.message}`));
      });
    });
    console.log("Joining signaling room with sessionId:", sessionId);
    socket.emit("join", { sessionId });
  }

  console.log("Creating WebRTC peer connection");
  rtcPc = new window.RTCPeerConnection({ iceServers: STUN_SERVERS });
  dataChannel = rtcPc.createDataChannel("judge");

  dataChannel.onopen = () => {
    console.log("=== DataChannel onopen ===");
    console.log("DataChannel readyState:", dataChannel.readyState);
    console.log("DataChannel bufferedAmount:", dataChannel.bufferedAmount);
    connected = true;
    updateConnectionStatus(CONNECTION_STATUS.CONNECTED);
    console.log("Calling pending queue functions...");
    pendingQueue.forEach((fn) => fn());
    pendingQueue = [];
    console.log("DataChannel onopen completed");
    
    // Set a timeout to check if we receive the initial languages message
    setTimeout(() => {
      if (!window.judgeLanguages) {
        console.log("⚠️ No languages received from judge after 3 seconds");
        console.log("This might indicate the judge is not sending the initial languages message");
      } else {
        console.log("✅ Languages received from judge:", window.judgeLanguages);
      }
    }, 3000);
  };
  
  dataChannel.onclose = () => {
    console.log("WebRTC DataChannel closed");
    connected = false;
    dataChannel = null;
    updateConnectionStatus(CONNECTION_STATUS.DISCONNECTED, "Disconnected from judge");
  };
  
  dataChannel.onerror = (error) => {
    console.log("WebRTC DataChannel error:", error);
    connected = false;
    dataChannel = null;
    updateConnectionStatus(CONNECTION_STATUS.ERROR, "Connection error");
  };
  
  dataChannel.onmessage = (event) => {
    console.log("=== DataChannel onmessage ===");
    console.log("Raw message data:", event.data);
    console.log("Message type:", typeof event.data);
    console.log("Message length:", event.data.length);
    try {
      const msg = JSON.parse(event.data);
      console.log("Parsed message:", msg);
      console.log("Message has _msgId:", !!msg._msgId);
      console.log("Message has languages:", !!msg.languages);
      
      // Handle languages response (sent immediately when DataChannel opens)
      if (msg.languages) {
        console.log("Received languages from judge:", msg.languages);
        // Store languages for immediate use
        window.judgeLanguages = msg.languages;
        console.log("Stored languages in window.judgeLanguages");
        if (onLanguagesReceived) {
          console.log("Calling onLanguagesReceived callback");
          onLanguagesReceived(msg.languages);
        } else {
          console.log("No onLanguagesReceived callback set");
        }
        return;
      }
      
      // Handle regular message responses with _msgId
      if (msg._msgId && responseResolvers[msg._msgId]) {
        console.log("Found resolver for msgId:", msg._msgId);
        console.log("Resolving with message:", msg);
        responseResolvers[msg._msgId](msg);
        delete responseResolvers[msg._msgId];
        console.log("Resolver removed for msgId:", msg._msgId);
      } else if (msg._msgId) {
        console.log("Message has _msgId but no resolver found:", msg._msgId);
        console.log("Available resolvers:", Object.keys(responseResolvers));
      }
    } catch (e) {
      console.log("Error parsing message:", e);
      console.log("Raw message that failed to parse:", event.data);
    }
  };

  // Handle signaling
  rtcPc.onicecandidate = (event) => {
    if (event.candidate) {
      console.log("Sending ICE candidate to judge");
      socket.emit("signal", {
        sessionId,
        from: "browser",
        signal: { type: "ice", candidate: event.candidate },
      });
    }
  };

  socket.on("signal", async (data) => {
    console.log("=== Received signal from judge ===");
    console.log("Signal data:", data);
    if (data.from === "judge") {
      const signal = data.signal;
      console.log("Signal type:", signal.type);
      if (signal.type === "answer") {
        console.log("Setting remote description from judge answer");
        await rtcPc.setRemoteDescription(new window.RTCSessionDescription(signal.answer));
        console.log("Remote description set successfully");
      } else if (signal.type === "ice") {
        try {
          console.log("Adding ICE candidate from judge");
          await rtcPc.addIceCandidate(signal.candidate);
          console.log("ICE candidate added successfully");
        } catch (e) {
          console.log("Error adding ICE candidate:", e);
        }
      }
    }
  });

  // Create offer
  console.log("Creating WebRTC offer");
  const offer = await rtcPc.createOffer();
  await rtcPc.setLocalDescription(offer);
  console.log("Sending offer to judge");
  socket.emit("signal", {
    sessionId,
    from: "browser",
    signal: { type: "offer", offer: rtcPc.localDescription },
  });

  // Wait for data channel to open
  console.log("Waiting for DataChannel to open...");
  await new Promise((resolve, reject) => {
    if (connected) return resolve();
    const timeout = setTimeout(() => {
      console.log("RTC connection timeout");
      reject(new Error("RTC connect timeout"));
    }, 10000);
    pendingQueue.push(() => {
      console.log("DataChannel opened, resolving connection");
      clearTimeout(timeout);
      resolve();
    });
  });
}

function sendMessage(msg) {
  return new Promise(async (resolve, reject) => {
    console.log("=== sendMessage called ===");
    console.log("Message to send:", msg);
    console.log("Current connected state:", connected);
    console.log("Current dataChannel state:", dataChannel ? "exists" : "null");
    
    await connectRTC();
    console.log("After connectRTC - connected:", connected);
    console.log("After connectRTC - dataChannel:", dataChannel ? "exists" : "null");
    
    const thisMsgId = ++msgId;
    msg._msgId = thisMsgId;
    console.log("Message with ID:", msg);
    
    responseResolvers[thisMsgId] = resolve;
    console.log("Added resolver for msgId:", thisMsgId);
    console.log("Current responseResolvers:", Object.keys(responseResolvers));
    
    console.log("Sending message via dataChannel...");
    dataChannel.send(JSON.stringify(msg));
    console.log("Message sent successfully");
    
    // Increase timeout to 30 seconds for better reliability
    setTimeout(() => {
      console.log("Timeout check for msgId:", thisMsgId);
      console.log("Resolver still exists:", !!responseResolvers[thisMsgId]);
      if (responseResolvers[thisMsgId]) {
        console.log("Timeout reached, rejecting promise");
        delete responseResolvers[thisMsgId];
        reject(new Error("RTC judge timeout"));
      }
    }, 30000);
  });
}

export const getLanguages = async () => {
  console.log("=== getLanguages called ===");
  console.log("window.judgeLanguages:", window.judgeLanguages);
  
  // If we have languages stored from the initial connection, use them
  if (window.judgeLanguages) {
    console.log("Using stored languages:", window.judgeLanguages);
    return window.judgeLanguages;
  }
  
  // Otherwise, request languages from judge
  console.log("No stored languages, requesting from judge...");
  const resp = await sendMessage({ type: "languages" });
  console.log("sendMessage response:", resp);
  if (resp.languages) return resp.languages;
  throw new Error(resp.error || "Unknown error");
};

export const executeCode = async ({ code, language, input }) => {
  const resp = await sendMessage({ type: "execute", code, language, input });
  if (resp.results && resp.results.length > 0) {
    const firstResult = resp.results[0];
    return {
      stdout: firstResult.actualOutput,
      stderr: firstResult.stderr,
      results: resp.results,
      summary: resp.summary,
    };
  }
  if (resp.error) throw new Error(resp.error);
  return resp;
};

export const executeCodeWithTestCases = async ({ code, language, testCases }) => {
  const resp = await sendMessage({ type: "execute", code, language, testCases });
  if (resp.error) throw new Error(resp.error);
  return resp;
};

export const submitCodeWithTestCases = async ({ code, language, problemSlug }) => {
  const resp = await sendMessage({ type: "submit", code, language, problemSlug });
  if (resp.error) throw new Error(resp.error);
  return resp;
}; 