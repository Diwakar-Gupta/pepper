import React, { useEffect, useState } from "react";
import ProblemDescription from "../components/ProblemDescription";
import { useParams } from "react-router-dom";
import Progress from "../components/Progress";
import getProblemDetails from "../repository/getProblemDetails";
import ProblemEditor from "../components/ProblemEditor";
import ProblemSubmission from "../components/ProblemSubmission";
import { getLanguages, executeCode } from "../repository/judgeApi";

const ProblemDetails = () => {
  const { problemSlug } = useParams();
  const [problem, setProblem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [code, setCode] = useState("");
  const [languages, setLanguages] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [runResult, setRunResult] = useState({ stdout: "", stderr: "" });
  const [input, setInput] = useState("");
  const [judgeAvailable, setJudgeAvailable] = useState(true);
  const [judgeError, setJudgeError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const data = await getProblemDetails(problemSlug);
      setIsLoading(false);
      setProblem(data);
    };
    fetchData();
  }, [problemSlug]);

  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const data = await getLanguages();
        const langs = Object.keys(data).filter((k) => data[k]);
        setLanguages(langs);
        setSelectedLanguage(langs[0] || "");
        setJudgeAvailable(true);
        setJudgeError("");
      } catch (e) {
        setLanguages([]);
        setJudgeAvailable(false);
        setJudgeError("Code execution server is not running. Please start the judge server on your machine.");
      }
    };
    fetchLanguages();
  }, []);

  const handleRun = async () => {
    try {
      const data = await executeCode({ code, language: selectedLanguage, input });
      setRunResult(data);
      setJudgeAvailable(true);
      setJudgeError("");
    } catch (e) {
      setRunResult({ stdout: "", stderr: e.message });
      setJudgeAvailable(false);
      setJudgeError("Code execution server is not running. Please start the judge server on your machine.");
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
              {judgeError}
            </div>
          )}
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
            judgeAvailable={judgeAvailable}
          />
        </div>
      </div>
    </div>
  );
};

export default ProblemDetails;
