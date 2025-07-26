// ProblemSubmission.js
import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrash, faCheck, faTimes } from "@fortawesome/free-solid-svg-icons";

const ProblemSubmission = ({ code, language, input, setInput, onRun, runResult, judgeAvailable }) => {
  const [testCases, setTestCases] = useState([
    { input: "", expectedOutput: "" }
  ]);
  const [showTestCases, setShowTestCases] = useState(false);
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
    setTestCases([...testCases, { input: "", expectedOutput: "" }]);
  };

  const removeTestCase = (index) => {
    if (testCases.length > 1) {
      setTestCases(testCases.filter((_, i) => i !== index));
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

  return (
    <div className="bg-white p-4 border border-gray-300 rounded-md shadow-md relative">
      {/* Loader Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-10">
          <div className="flex flex-col items-center">
            <svg className="animate-spin h-8 w-8 text-blue-500 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
            <span className="text-blue-600 font-medium">Running test cases...</span>
          </div>
        </div>
      )}
      {/* Test Cases Toggle */}
      <div className="mb-4">
        <button
          onClick={() => setShowTestCases(!showTestCases)}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          {showTestCases ? "Hide" : "Show"} Test Cases
        </button>
      </div>

      {/* Test Cases Section */}
      {/* Always show test cases section, remove legacy input */}
      <div className="mb-4 border border-gray-200 rounded-md p-3">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-medium text-gray-700">Test Cases</h3>
          <button
            onClick={addTestCase}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            <FontAwesomeIcon icon={faPlus} className="mr-1" />
            Add Test Case
          </button>
        </div>
        {testCases.map((testCase, index) => (
          <div key={index} className="mb-3 p-3 border border-gray-200 rounded-md">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600">Test Case {index + 1}</span>
              {testCases.length > 1 && (
                <button
                  onClick={() => removeTestCase(index)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Input:</label>
                <textarea
                  className="w-full p-2 border border-gray-300 rounded-md text-sm"
                  rows={2}
                  value={testCase.input}
                  onChange={(e) => updateTestCase(index, "input", e.target.value)}
                  placeholder="Enter test input..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Expected Output:</label>
                <textarea
                  className="w-full p-2 border border-gray-300 rounded-md text-sm"
                  rows={2}
                  value={testCase.expectedOutput}
                  onChange={(e) => updateTestCase(index, "expectedOutput", e.target.value)}
                  placeholder="Enter expected output (optional)..."
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Run and Submit buttons */}
      <div className="flex space-x-4 mb-4">
        <button
          className={`bg-blue-500 text-white px-4 py-2 rounded-md focus:outline-none ${
            !code || !language || isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
          }`}
          onClick={handleRunWithTestCases}
          disabled={!code || !language || isLoading}
        >
          {isLoading ? 'Running...' : 'Run'}
        </button>
        <button
          className={`bg-green-500 text-white px-4 py-2 rounded-md focus:outline-none ${
            !code || !language || isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-600'
          }`}
          disabled={!code || !language || isLoading}
        >
          Submit
        </button>
      </div>

      {/* Results Summary */}
      {runResult.summary && (
        <div className="mb-4 p-3 bg-gray-50 rounded-md">
          <h4 className="font-medium text-gray-700 mb-2">Test Results Summary:</h4>
          <div className="flex space-x-4 text-sm">
            <span className="text-green-600">✓ {runResult.summary.passed} Passed</span>
            <span className="text-red-600">✗ {runResult.summary.failed} Failed</span>
            <span className="text-gray-600">- {runResult.summary.noExpectedOutput} No Expected Output</span>
          </div>
        </div>
      )}

      {/* Test Case Results */}
      {runResult.results && runResult.results.length > 0 && (
        <div className="mb-4">
          <h4 className="font-medium text-gray-700 mb-2">Test Case Results:</h4>
          {runResult.results.map((result, index) => (
            <div key={index} className="mb-3 p-3 border border-gray-200 rounded-md">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">Test Case {result.testCase}</span>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(result.passed)}
                  <span className={`text-sm ${
                    result.passed === true ? 'text-green-600' : 
                    result.passed === false ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {getStatusText(result.passed)}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="font-medium text-gray-600">Input:</span>
                  <pre className="bg-gray-100 p-2 rounded mt-1 whitespace-pre-wrap">{result.input || "(empty)"}</pre>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Output:</span>
                  <pre className="bg-gray-100 p-2 rounded mt-1 whitespace-pre-wrap">{result.actualOutput || "(no output)"}</pre>
                </div>
                {result.expectedOutput && (
                  <div>
                    <span className="font-medium text-gray-600">Expected:</span>
                    <pre className="bg-gray-100 p-2 rounded mt-1 whitespace-pre-wrap">{result.expectedOutput}</pre>
                  </div>
                )}
                {result.stderr && (
                  <div>
                    <span className="font-medium text-red-600">Error:</span>
                    <pre className="bg-red-100 p-2 rounded mt-1 whitespace-pre-wrap text-red-700">{result.stderr}</pre>
                  </div>
                )}
                {/* Show diff if present and failed */}
                {result.passed === false && result.diff && (
                  <div className="mt-2">
                    <span className="font-medium text-yellow-700">Difference:</span>
                    <pre className="bg-yellow-50 p-2 rounded mt-1 whitespace-pre-wrap text-xs overflow-x-auto border border-yellow-200">
                      {result.diff}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProblemSubmission;
