import React, { useEffect, useState, lazy, Suspense } from "react";
import { useParams } from "react-router-dom";
import Progress from "../components/Progress";
import getProblemDetails from "../repository/getProblemDetails";
import ProblemEditor from "../components/ProblemEditor";
import { useJudge } from "../contexts/JudgeContext";
import EditLinks from "../components/EditLinks";
import { getSubmissionHistory } from "../repository/judgeRTCApi";

const ProblemDescription = lazy(() => import("../components/ProblemDescription"));
const TabbedTestCases = lazy(() => import("../components/TabbedTestCases"));


const ProblemDetails = () => {
  const { problemSlug } = useParams();
  const [problem, setProblem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [codeByLanguage, setCodeByLanguage] = useState({});
  const [runResult, setRunResult] = useState({ stdout: "", stderr: "" });
  const [input, setInput] = useState("");
  const [submissionHistory, setSubmissionHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [expandedSubmission, setExpandedSubmission] = useState(null);
  const [activeTab, setActiveTab] = useState('description');

  // Use the shared judge context
  const {
    isJudgeAvailable,
    languages,
    selectedLanguage,
    setSelectedLanguage,
    executeCodeWithLanguage,
    error: judgeError
  } = useJudge();

  useEffect(() => {
    const fetchData = async () => {
      const data = await getProblemDetails(problemSlug);
      setIsLoading(false);
      setProblem(data);
    };
    fetchData();
  }, [problemSlug]);

  // Set default code when language changes or on initial load
  useEffect(() => {
    if (selectedLanguage) {
      // If code for this language doesn't exist, set default code
      if (!codeByLanguage[selectedLanguage]) {
        let defaultCode = "";
        if (selectedLanguage.toLowerCase().includes("python")) {
          defaultCode = 'print("Hello Pepper")';
        } else if (selectedLanguage.toLowerCase().includes("java")) {
          defaultCode = 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello Pepper");\n    }\n}';
        } else if (
          selectedLanguage.toLowerCase().includes("cpp") ||
          selectedLanguage.toLowerCase().includes("c++")
        ) {
          defaultCode = '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello Pepper" << endl;\n    return 0;\n}';
        }
        setCodeByLanguage((prev) => ({ ...prev, [selectedLanguage]: defaultCode }));
      }
    }
  }, [selectedLanguage]);

  // Helper to get current code
  const code = codeByLanguage[selectedLanguage] || "";
  // Helper to update code for current language
  const setCode = (newCode) => {
    setCodeByLanguage((prev) => ({ ...prev, [selectedLanguage]: newCode }));
  };

  const handleRun = async (testCases = null) => {
    if (!isJudgeAvailable) {
      return;
    }

    try {
      const data = await executeCodeWithLanguage({
        code,
        language: selectedLanguage,
        input,
        testCases
      });
      setRunResult(data);
    } catch (e) {
      setRunResult({ stdout: "", stderr: e.message });
    }
  };

  const fetchSubmissionHistory = async () => {
    if (!isJudgeAvailable || !problemSlug) {
      return;
    }

    setIsLoadingHistory(true);
    try {
      const response = await getSubmissionHistory(problemSlug);
      setSubmissionHistory(response.history || []);
    } catch (error) {
      console.error("Failed to fetch submission history:", error);
      setSubmissionHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const expandSubmission = async (submissionId) => {
    if (expandedSubmission === submissionId) {
      setExpandedSubmission(null);
      return;
    }

    try {
      const response = await getSubmissionHistory(problemSlug, true);
      const submission = response.history.find(s => s.id === submissionId);
      if (submission) {
        setExpandedSubmission(submissionId);
        // Update the submission in the history with code
        setSubmissionHistory(prev => 
          prev.map(s => s.id === submissionId ? { ...s, code: submission.code } : s)
        );
      }
    } catch (error) {
      console.error("Failed to fetch submission code:", error);
    }
  };

  const formatDateTime = (datetime) => {
    return new Date(datetime).toLocaleString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'error': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return '✅';
      case 'failed': return '❌';
      case 'error': return '⚠️';
      default: return '❓';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <EditLinks
        uiPath="ProblemDetail.jsx"
        dataPath={`problems/${problemSlug}.json`}
      />
      <div className="bg-white min-h-screen shadow-md rounded-md p-2 w-full flex flex-col md:flex-row">
        {isLoading ? (
          <Progress />
        ) : (
          <div className="w-full md:w-1/2 md:mr-2">
            {/* Tab Navigation */}
            <div className="border-b border-gray-200 mb-4">
              <nav className="flex space-x-8">
                <button
                  onClick={() => setActiveTab('description')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'description'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Problem Description
                </button>
                <button
                  onClick={() => {
                    if (isJudgeAvailable) {
                      setActiveTab('history');
                      if (submissionHistory.length === 0) {
                        fetchSubmissionHistory();
                      }
                    }
                  }}
                  disabled={!isJudgeAvailable}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'history' && isJudgeAvailable
                      ? 'border-blue-500 text-blue-600'
                      : !isJudgeAvailable
                      ? 'border-transparent text-gray-400 cursor-not-allowed'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Submission History
                  {!isJudgeAvailable && (
                    <span className="ml-1 text-xs">(Judge Required)</span>
                  )}
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'description' && (
              <ProblemDescription problem={problem} />
            )}
            
            {activeTab === 'history' && isJudgeAvailable && (
              <div className="submission-history-tab">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Submission History</h3>
                  <button
                    onClick={fetchSubmissionHistory}
                    disabled={isLoadingHistory}
                    className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 transition-colors"
                  >
                    {isLoadingHistory ? 'Loading...' : 'Refresh'}
                  </button>
                </div>
                
                <div className="max-h-96 overflow-y-auto">
                  {isLoadingHistory ? (
                    <div className="flex justify-center py-4">
                      <Progress />
                    </div>
                  ) : submissionHistory.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>No submissions found for this problem.</p>
                      <p className="text-sm mt-1">Submit your code to see history here.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {submissionHistory.map((submission) => (
                        <div key={submission.id} className="border rounded-lg p-3 bg-white shadow-sm">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(submission.status)}`}>
                                {getStatusIcon(submission.status)} {submission.status.toUpperCase()}
                              </span>
                              <span className="text-sm font-medium text-gray-700">
                                {submission.language}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatDateTime(submission.datetime)}
                              </span>
                            </div>
                            <button
                              onClick={() => expandSubmission(submission.id)}
                              className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                            >
                              {expandedSubmission === submission.id ? 'Hide Code' : 'Show Code'}
                            </button>
                          </div>
                          
                          {/* Test Results Summary */}
                          {submission.test_results && (
                            <div className="mt-2 text-xs text-gray-600">
                              {submission.status === 'failed' && submission.test_results.failedTestCase && (
                                <p className="text-red-600">
                                  Failed on test case {submission.test_results.failedTestCase + 1}
                                </p>
                              )}
                              {submission.test_results.summary && (
                                <p>{submission.test_results.summary}</p>
                              )}
                            </div>
                          )}
                          
                          {/* Error Message */}
                          {submission.error_message && (
                            <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                              <strong>Error:</strong> {submission.error_message}
                            </div>
                          )}
                          
                          {/* Expanded Code View */}
                          {expandedSubmission === submission.id && submission.code && (
                            <div className="mt-3 border-t pt-3">
                              <h4 className="text-sm font-medium text-gray-700 mb-2">Submitted Code:</h4>
                              <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto border">
                                <code>{submission.code}</code>
                              </pre>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        <div className="w-full md:w-1/2">
          {judgeError && (
            <div className="bg-red-100 text-red-700 p-2 mb-2 rounded-md text-center">
              <div dangerouslySetInnerHTML={{ __html: judgeError }} />
            </div>
          )}
          {isJudgeAvailable ? (
            <>
              <Suspense fallback={<Progress />}>
                <ProblemEditor
                  code={code}
                  setCode={setCode}
                  languages={languages}
                  selectedLanguage={selectedLanguage}
                  setSelectedLanguage={setSelectedLanguage}
                />
              </Suspense>
              <Suspense fallback={<Progress />}>
                <TabbedTestCases
                  code={code}
                  language={selectedLanguage}
                  onRun={handleRun}
                  runResult={runResult}
                  judgeAvailable={isJudgeAvailable}
                  problemSlug={problemSlug}
                />
              </Suspense>
            </>
          ) : (
            <div className="bg-yellow-100 text-yellow-700 p-4 rounded-md text-center">
              <p className="font-medium mb-2">Code Editor Unavailable</p>
              <p className="text-sm mb-3">Please connect to the judge server using the connection panel in the top-right corner.</p>
              <div className="text-sm">
                <p className="mb-2">Need help setting up the judge?</p>
                <a
                  href="https://github.com/Diwakar-Gupta/pepper/tree/main/judge#-first-time-user-seeing-code-editor-unavailable"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors duration-200 text-xs font-medium"
                >
                  📚 Judge Setup Guide
                  <svg className="ml-1 w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProblemDetails;
