import React, { useEffect, useState } from "react";
import ProblemDescription from "../components/ProblemDescription";
import { useParams } from "react-router-dom";
import Progress from "../components/Progress";
import getProblemDetails from "../repository/getProblemDetails";
import ProblemEditor from "../components/ProblemEditor";
import ProblemSubmission from "../components/ProblemSubmission";
import { useJudge } from "../contexts/JudgeContext";

const ProblemDetails = () => {
  const { problemSlug } = useParams();
  const [problem, setProblem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [codeByLanguage, setCodeByLanguage] = useState({});
  const [runResult, setRunResult] = useState({ stdout: "", stderr: "" });
  const [input, setInput] = useState("");

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white min-h-screen shadow-md rounded-md p-2 w-full flex flex-col md:flex-row">
        {isLoading ? (
          <Progress />
        ) : (
          <div className="w-full md:w-1/2 md:mr-2">
            <ProblemDescription problem={problem} />
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
              <ProblemEditor
                code={code}
                setCode={setCode}
                languages={languages}
                selectedLanguage={selectedLanguage}
                setSelectedLanguage={setSelectedLanguage}
              />
              <ProblemSubmission
                code={code}
                language={selectedLanguage}
                input={input}
                setInput={setInput}
                onRun={handleRun}
                runResult={runResult}
                judgeAvailable={isJudgeAvailable}
              />
            </>
          ) : (
            <div className="bg-yellow-100 text-yellow-700 p-4 rounded-md text-center">
              <p className="font-medium mb-2">Code Editor Unavailable</p>
              <p className="text-sm">Please connect to the judge server using the connection panel in the top-right corner.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProblemDetails;
