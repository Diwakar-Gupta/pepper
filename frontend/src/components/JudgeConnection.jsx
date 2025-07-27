import React, { useState, useEffect } from 'react';
import { 
  setJudgeCode, 
  getJudgeCode, 
  disconnect
} from '../repository/judgeRTCApi';
import { useJudge } from '../contexts/JudgeContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPowerOff, faSyncAlt } from '@fortawesome/free-solid-svg-icons';


const JudgeConnection = () => {
  const [judgeCode, setJudgeCodeInput] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);

  // Use the shared judge context
  const {
    isConnected,
    isConnecting,
    connectionStatus,
    error: statusMessage
  } = useJudge();

  useEffect(() => {
    console.log('JudgeConnection: useEffect - checking stored code');
    // Check if we have a stored code
    const storedCode = getJudgeCode();
    if (storedCode) {
      console.log('JudgeConnection: Found stored code:', storedCode);
      setJudgeCodeInput(storedCode);
    } else {
      console.log('JudgeConnection: No stored code found, showing input');
      setShowCodeInput(true);
    }
  }, []);

  // Show code input if disconnected and no stored code
  useEffect(() => {
    console.log('JudgeConnection: Connection status changed:', { isConnected, connectionStatus });
    if (!isConnected && !getJudgeCode()) {
      console.log('JudgeConnection: Not connected and no stored code, showing input');
      setShowCodeInput(true);
    } else if (isConnected) {
      console.log('JudgeConnection: Connected, hiding input');
      setShowCodeInput(false);
    }
  }, [isConnected]);

  const handleCodeSubmit = (e) => {
    e.preventDefault();
    try {
      console.log('JudgeConnection: Submitting code:', judgeCode);
      const cleanCode = setJudgeCode(judgeCode);
      setJudgeCodeInput(cleanCode);
      setShowCodeInput(false);
      console.log("Judge code set successfully");
    } catch (error) {
      console.error('JudgeConnection: Error setting judge code:', error);
      alert(error.message);
    }
  };

  const handleDisconnect = () => {
    console.log('JudgeConnection: Disconnecting');
    disconnect();
  };

  const handleNewCode = () => {
    console.log('JudgeConnection: Requesting new code');
    disconnect();
    setShowCodeInput(true);
    setJudgeCodeInput('');
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return '🟢';
      case 'connecting':
        return '🟡';
      case 'error':
        return '🔴';
      default:
        return '⚪';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected to Judge';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Connection Error';
      default:
        return 'Disconnected';
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-green-600';
      case 'connecting':
        return 'text-yellow-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-400';
    }
  };

  if (showCodeInput) {
    return (
      <div className="flex items-center space-x-2">
        <form onSubmit={handleCodeSubmit} className="flex items-center space-x-2">
          <input
            type="text"
            value={judgeCode}
            onChange={(e) => setJudgeCodeInput(e.target.value)}
            placeholder="XXXX-XXXX"
            className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            maxLength={9}
          />
          <button
            type="submit"
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            Connect
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      {/* Status indicator with hover tooltip */}
      <div className="relative group">
        <span className={`text-lg cursor-help ${getStatusColor()}`} title={getStatusText()}>
          {getStatusIcon()}
        </span>
        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
          {getStatusText()}
        </div>
      </div>

      {/* Disconnect button - only show when connected */}
      {isConnected && (
        <button
          onClick={handleDisconnect}
          className="px-2 py-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded focus:outline-none focus:ring-1 focus:ring-red-500"
          title="Disconnect"
        >
          <FontAwesomeIcon icon={faPowerOff} />
        </button>
      )}

      {/* New code button - only show when connected */}
      {(isConnected || isConnecting) && (
        <button
          onClick={handleNewCode}
          className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded focus:outline-none focus:ring-1 focus:ring-gray-500"
          title="New Code"
        >
          <FontAwesomeIcon icon={faSyncAlt} />
        </button>
      )}
    </div>
  );
};

export default JudgeConnection; 