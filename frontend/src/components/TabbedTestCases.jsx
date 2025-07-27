import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrash, faCheck, faTimes, faPlay } from "@fortawesome/free-solid-svg-icons";

const TabbedTestCases = ({ code, language, onRun, runResult, judgeAvailable }) => {
  const [testCases, setTestCases] = useState([
    { input: "", expectedOutput: "" }
  ]);
  const [mainTab, setMainTab] = useState('testcases'); // 'testcases' or 'results'
  const [activeTestCaseTab, setActiveTestCaseTab] = useState(0);
  const [activeResultTab, setActiveResultTab] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Handle case when judge is not available
  if (!judgeAvailable) {
    return (
      <div className="bg-gray-100 p-4 border border-gray-300 rounded-md shadow-md">
        <div className="text-center text-gray-600">
          <p className="font-medium mb-2">Code Execution Unavailable</p>
          <p className="text-sm">Please start the judge server to enable code execution. <a href='https://github.com/Diwakar-Gupta/pepper/blob/main/judge/README.md' target='_blank' rel='noopener noreferrer' className='text-blue-600 underline hover:text-blue-800'>View setup instructions</a></p>
        </div>
      </div>
    );
  }

  // Handle case when language is not selected
  if (!language) {
    return (
      <div className="bg-gray-100 p-4 border border-gray-300 rounded-md shadow-md">
        <div className="text-center text-gray-600">
          <p className="font-medium mb-2">No Language Selected</p>
          <p className="text-sm">Please select a programming language to run code.</p>
        </div>
      </div>
    );
  }

  const addTestCase = () => {
    const newIndex = testCases.length;
    setTestCases([...testCases, { input: "", expectedOutput: "" }]);
    setActiveTestCaseTab(newIndex);
  };

  const removeTestCase = (index) => {
    if (testCases.length > 1) {
      const newTestCases = testCases.filter((_, i) => i !== index);
      setTestCases(newTestCases);
      // Adjust active tabs if necessary
      if (activeTestCaseTab >= newTestCases.length) {
        setActiveTestCaseTab(newTestCases.length - 1);
      } else if (activeTestCaseTab > index) {
        setActiveTestCaseTab(activeTestCaseTab - 1);
      }
      if (activeResultTab >= newTestCases.length) {
        setActiveResultTab(Math.max(0, newTestCases.length - 1));
      } else if (activeResultTab > index) {
        setActiveResultTab(activeResultTab - 1);
      }
    }
  };

  const updateTestCase = (index, field, value) => {
    const updated = [...testCases];
    updated[index][field] = value;
    setTestCases(updated);
  };

  const handleRunWithTestCases = async () => {
    const validTestCases = testCases.filter(tc => tc.input.trim() !== "");
    setIsLoading(true);
    try {
      await onRun(validTestCases);
      // Switch to results main tab after running
      setMainTab('results');
      setActiveResultTab(0);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (passed) => {
    if (passed === true) {
      return <FontAwesomeIcon icon={faCheck} className="text-green-500" />;
    } else if (passed === false) {
      return <FontAwesomeIcon icon={faTimes} className="text-red-500" />;
    }
    return <span className="text-gray-400">-</span>;
  };

  const getStatusText = (passed) => {
    if (passed === true) return "Passed";
    if (passed === false) return "Failed";
    return "No expected output";
  };

  const hasResults = runResult.results && runResult.results.length > 0;

  return (
    <div className="bg-white border border-gray-300 rounded-md shadow-md relative">
      {/* Loader Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-10 rounded-md">
          <div className="flex flex-col items-center">
            <svg className="animate-spin h-8 w-8 text-blue-500 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
            <span className="text-blue-600 font-medium">Running test cases...</span>
          </div>
        </div>
      )}

      {/* Main Tab Headers */}
      <div className="border-b border-gray-200 bg-gray-50 rounded-t-md">
        <div className="flex">
          <button
            onClick={() => setMainTab('testcases')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              mainTab === 'testcases'
                ? 'border-blue-500 text-blue-600 bg-white'
                : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            Test Cases
          </button>
          <button
            onClick={() => setMainTab('results')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              mainTab === 'results'
                ? 'border-blue-500 text-blue-600 bg-white'
                : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            } ${!hasResults ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={!hasResults}
          >
            Test Results
          </button>
        </div>
        
        {/* Sub Tab Headers */}
        {mainTab === 'testcases' && (
          <div className="flex items-center bg-gray-100 border-t border-gray-200">
            <div className="flex items-center overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300">
              {testCases.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveTestCaseTab(index)}
                  className={`px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTestCaseTab === index
                      ? 'border-blue-400 text-blue-600 bg-white'
                      : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  Case {index + 1}
                </button>
              ))}
              <button
                onClick={addTestCase}
                className="px-3 py-2 text-xs font-medium text-gray-600 hover:text-blue-600 hover:bg-gray-50 transition-colors"
                title="Add Test Case"
              >
                <FontAwesomeIcon icon={faPlus} />
              </button>
            </div>
          </div>
        )}
        
        {mainTab === 'results' && hasResults && (
          <div className="flex items-center bg-gray-100 border-t border-gray-200">
            <div className="flex items-center overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300">
              {runResult.results.map((result, index) => (
                <button
                  key={index}
                  onClick={() => setActiveResultTab(index)}
                  className={`px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors flex items-center gap-1 ${
                    activeResultTab === index
                      ? 'border-blue-400 text-blue-600 bg-white'
                      : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  {getStatusIcon(result.passed)}
                  Case {result.testCase}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {/* Test Cases Content */}
        {mainTab === 'testcases' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-700">Test Case {activeTestCaseTab + 1}</h3>
              {testCases.length > 1 && (
                <button
                  onClick={() => removeTestCase(activeTestCaseTab)}
                  className="text-red-500 hover:text-red-700 text-sm"
                  title="Remove Test Case"
                >
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              )}
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Input:
                </label>
                <textarea
                  value={testCases[activeTestCaseTab]?.input || ""}
                  onChange={(e) => updateTestCase(activeTestCaseTab, 'input', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm font-mono resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="4"
                  placeholder="Enter test input..."
                  style={{ maxHeight: '150px', overflowY: 'auto' }}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Expected Output:
                </label>
                <textarea
                  value={testCases[activeTestCaseTab]?.expectedOutput || ""}
                  onChange={(e) => updateTestCase(activeTestCaseTab, 'expectedOutput', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm font-mono resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="4"
                  placeholder="Enter expected output (optional)..."
                  style={{ maxHeight: '150px', overflowY: 'auto' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Test Results Content */}
        {mainTab === 'results' && hasResults && (
          <div className="space-y-4">
            {/* Results Summary */}
            {runResult.summary && (
              <div className="p-3 bg-gray-50 rounded-md">
                <h4 className="font-medium text-gray-700 mb-2">Summary:</h4>
                <div className="flex space-x-4 text-sm">
                  <span className="text-green-600">✓ {runResult.summary.passed} Passed</span>
                  <span className="text-red-600">✗ {runResult.summary.failed} Failed</span>
                  <span className="text-gray-600">- {runResult.summary.noExpectedOutput} No Expected Output</span>
                </div>
              </div>
            )}

            {/* Individual Result for Active Tab */}
            {runResult.results[activeResultTab] && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-700">Test Case {runResult.results[activeResultTab].testCase}</h3>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(runResult.results[activeResultTab].passed)}
                    <span className={`text-sm ${
                      runResult.results[activeResultTab].passed === true ? 'text-green-600' : 
                      runResult.results[activeResultTab].passed === false ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {getStatusText(runResult.results[activeResultTab].passed)}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Input:
                    </label>
                    <pre className="bg-gray-100 p-2 rounded text-sm font-mono whitespace-pre-wrap max-h-32 overflow-y-auto border">
                      {runResult.results[activeResultTab].input || "(empty)"}
                    </pre>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Output:
                    </label>
                    <pre className="bg-gray-100 p-2 rounded text-sm font-mono whitespace-pre-wrap max-h-32 overflow-y-auto border">
                      {runResult.results[activeResultTab].actualOutput || "(no output)"}
                    </pre>
                  </div>
                  
                  {runResult.results[activeResultTab].expectedOutput && (
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Expected Output:
                      </label>
                      <pre className="bg-gray-100 p-2 rounded text-sm font-mono whitespace-pre-wrap max-h-32 overflow-y-auto border">
                        {runResult.results[activeResultTab].expectedOutput}
                      </pre>
                    </div>
                  )}
                  
                  {runResult.results[activeResultTab].stderr && (
                    <div>
                      <label className="block text-sm font-medium text-red-600 mb-1">
                        Error:
                      </label>
                      <pre className="bg-red-100 p-2 rounded text-sm font-mono whitespace-pre-wrap max-h-32 overflow-y-auto border border-red-200 text-red-700">
                        {runResult.results[activeResultTab].stderr}
                      </pre>
                    </div>
                  )}
                  
                  {runResult.results[activeResultTab].passed === false && runResult.results[activeResultTab].diff && (
                    <div>
                      <label className="block text-sm font-medium text-yellow-700 mb-1">
                        Difference:
                      </label>
                      <pre className="bg-yellow-50 p-2 rounded text-sm font-mono whitespace-pre-wrap max-h-32 overflow-y-auto border border-yellow-200">
                        {runResult.results[activeResultTab].diff}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-2 p-4 border-t border-gray-200 bg-gray-50 rounded-b-md">
        <button
          className={`bg-blue-500 text-white px-4 py-2 rounded-md focus:outline-none transition-colors flex items-center gap-2 ${
            !code || !language || isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
          }`}
          onClick={handleRunWithTestCases}
          disabled={!code || !language || isLoading}
        >
          <FontAwesomeIcon icon={faPlay} />
          {isLoading ? 'Running...' : 'Run Tests'}
        </button>
        <button
          className={`bg-green-500 text-white px-4 py-2 rounded-md focus:outline-none transition-colors ${
            !code || !language || isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-600'
          }`}
          disabled={!code || !language || isLoading}
        >
          Submit
        </button>
      </div>
    </div>
  );
};

export default TabbedTestCases;
