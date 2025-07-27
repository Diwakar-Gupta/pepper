import { useState, useEffect, useCallback } from 'react';
import { 
  getLanguages, 
  executeCode, 
  executeCodeWithTestCases,
  setConnectionStatusCallback,
  setLanguagesReceivedCallback,
  CONNECTION_STATUS 
} from '../repository/judgeRTCApi';

export const useJudgeStatus = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [languages, setLanguages] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [error, setError] = useState("");
  const [connectionStatus, setConnectionStatus] = useState(CONNECTION_STATUS.DISCONNECTED);

  // Set up connection status callback
  useEffect(() => {
    setConnectionStatusCallback((status, message) => {
      console.log('Connection status callback:', status, message);
      setConnectionStatus(status);
      setError(message);
      
      if (status === CONNECTION_STATUS.CONNECTED) {
        console.log('Judge connected, waiting for languages...');
        setIsConnected(true);
        setIsConnecting(false);
        // Don't auto-check languages - they come from initial response
      } else if (status === CONNECTION_STATUS.CONNECTING) {
        setIsConnecting(true);
        setIsConnected(false);
      } else {
        setIsConnected(false);
        setIsConnecting(false);
      }
    });

    // Set up languages received callback
    setLanguagesReceivedCallback((languagesData) => {
      console.log('Languages received callback:', languagesData);
      const availableLanguages = Object.keys(languagesData).filter((k) => languagesData[k]);
      console.log('Available languages from callback:', availableLanguages);
      setLanguages(availableLanguages);
      
      // Set first available language as default if none selected
      if (!selectedLanguage && availableLanguages.length > 0) {
        setSelectedLanguage(availableLanguages[0]);
      }
    });
  }, [selectedLanguage]); // Add selectedLanguage as dependency

  // Check available languages
  const checkLanguages = useCallback(async () => {
    try {
      console.log('Checking languages...');
      const data = await getLanguages();
      console.log('Languages data:', data);
      const availableLanguages = Object.keys(data).filter((k) => data[k]);
      console.log('Available languages:', availableLanguages);
      setLanguages(availableLanguages);
      
      // Set first available language as default if none selected
      if (!selectedLanguage && availableLanguages.length > 0) {
        setSelectedLanguage(availableLanguages[0]);
      }
      
      return true;
    } catch (e) {
      console.error('Failed to get languages:', e);
      setLanguages([]);
      return false;
    }
  }, [selectedLanguage]);

  // Execute code
  const executeCodeWithLanguage = useCallback(async ({ code, language, input, testCases }) => {
    if (!isConnected) {
      throw new Error("Judge not connected");
    }

    try {
      if (testCases && Array.isArray(testCases) && testCases.length > 0) {
        return await executeCodeWithTestCases({ code, language, testCases });
      } else {
        return await executeCode({ code, language, input });
      }
    } catch (e) {
      throw new Error(`Code execution failed: ${e.message}`);
    }
  }, [isConnected]);

  // Check if judge is available (connected and has languages)
  const isJudgeAvailable = isConnected && languages.length > 0;

  return {
    // State
    isConnected,
    isConnecting,
    isJudgeAvailable,
    languages,
    selectedLanguage,
    error,
    connectionStatus,
    
    // Actions
    setSelectedLanguage,
    checkLanguages,
    executeCodeWithLanguage,
  };
}; 