import React, { useState, useEffect } from 'react';
import { 
  setJudgeCode, 
  getJudgeCode, 
  disconnect
} from '../repository/judgeRTCApi';
import { useJudgeStatus } from '../hooks/useJudgeStatus';

const JudgeConnection = () => {
  const [judgeCode, setJudgeCodeInput] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);

  // Use the custom judge status hook
  const {
    isConnected,
    isConnecting,
    connectionStatus,
    error: statusMessage
  } = useJudgeStatus();

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

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-green-600';
      case 'connecting':
        return 'text-yellow-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
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

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Judge Connection</h3>
        <div className={`flex items-center space-x-2 ${getStatusColor()}`}>
          <span>{getStatusIcon()}</span>
          <span className="text-sm font-medium">
            {isConnected ? 'Connected' :
             isConnecting ? 'Connecting...' :
             connectionStatus === 'error' ? 'Error' : 'Disconnected'}
          </span>
        </div>
      </div>

      {statusMessage && (
        <div className="mb-4 p-2 bg-gray-100 rounded text-sm">
          {statusMessage}
        </div>
      )}

      {showCodeInput ? (
        <form onSubmit={handleCodeSubmit} className="space-y-3">
          <div>
            <label htmlFor="judgeCode" className="block text-sm font-medium text-gray-700 mb-1">
              Enter Judge Code
            </label>
            <input
              type="text"
              id="judgeCode"
              value={judgeCode}
              onChange={(e) => setJudgeCodeInput(e.target.value)}
              placeholder="XXXX-XXXX"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={9}
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the 8-character code shown in your local judge (format: XXXX-XXXX)
            </p>
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Connect
          </button>
        </form>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <span className="text-sm font-medium">Judge Code:</span>
            <span className="font-mono text-sm">{judgeCode}</span>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleDisconnect}
              className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Disconnect
            </button>
            <button
              onClick={handleNewCode}
              className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              New Code
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default JudgeConnection; 