import React, { createContext, useContext, useEffect } from 'react';
import { useJudgeStatus } from '../hooks/useJudgeStatus';
import { autoConnectIfStored } from '../repository/judgeRTCApi';

const JudgeContext = createContext();

export const useJudge = () => {
  const context = useContext(JudgeContext);
  if (!context) {
    throw new Error('useJudge must be used within a JudgeProvider');
  }
  return context;
};

export const JudgeProvider = ({ children }) => {
  const judgeStatus = useJudgeStatus();

  // Auto-connect on mount if there's a stored code
  useEffect(() => {
    autoConnectIfStored();
  }, []);

  return (
    <JudgeContext.Provider value={judgeStatus}>
      {children}
    </JudgeContext.Provider>
  );
}; 