import React, { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import getModuleDetails from "../repository/getModuleDetails";
import TwoColListAndRankView from "../layouts/TwoColListAndRankView";
import Progress from "../components/Progress";
import EditLinks from "../components/EditLinks";
import { checkProblemsStatus } from "../repository/judgeRTCApi";

const ModuleDetail = () => {
  const { courseSlug, moduleSlug } = useParams();
  const [moduleProblems, setModuleProblems] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [problemStatuses, setProblemStatuses] = useState({});
  const [statusLoading, setStatusLoading] = useState(false);

  // Function to fetch problem statuses from judge
  const fetchProblemStatuses = async (problems) => {
    if (!problems || problems.length === 0) return;
    
    try {
      setStatusLoading(true);
      const problemSlugs = problems.map(problem => problem.slug);
      const statuses = await checkProblemsStatus(problemSlugs);
      setProblemStatuses(statuses);
      console.log("Problem statuses fetched:", statuses);
    } catch (error) {
      console.error("Error fetching problem statuses:", error);
      // If judge is not connected, silently fail and show no status indicators
      setProblemStatuses({});
    } finally {
      setStatusLoading(false);
    }
  };

  // Component to render status indicator
  const StatusIndicator = ({ status, isLoading }) => {
    if (isLoading) {
      return (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    switch (status) {
      case 'success':
        return (
          <div className="flex justify-center">
            <span className="text-green-500 text-lg font-bold" title="Solved">✓</span>
          </div>
        );
      case 'failed':
        return (
          <div className="flex justify-center">
            <span className="text-red-500 text-lg font-bold" title="Failed">✗</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex justify-center">
            <span className="text-orange-500 text-lg font-bold" title="Error">⚠</span>
          </div>
        );
      case 'not_attempted':
      default:
        return (
          <div className="flex justify-center">
            <span className="text-gray-400" title="Not attempted">-</span>
          </div>
        );
    }
  };

  useEffect(() => {
    const fetchModule = async () => {
      try {
        setIsLoading(true);
        const moduleProblemsList = await getModuleDetails(
          courseSlug,
          moduleSlug,
        );
        setModuleProblems(moduleProblemsList);
        
        // Fetch problem statuses after loading module problems
        if (moduleProblemsList && moduleProblemsList.length > 0) {
          fetchProblemStatuses(moduleProblemsList);
        }
      } catch (error) {
        console.error("Error loading module:", error);
        setModuleProblems(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchModule();
  }, [moduleSlug]);

  if (isLoading) {
    return <Progress />;
  }

  if (!moduleProblems) {
    return <div>Module not found</div>;
  }

  return (
    <>
      <EditLinks 
        uiPath="ModuleDetailPage.jsx" 
        dataPath={`courses/${courseSlug}/${moduleSlug}.json`} 
      />
      <TwoColListAndRankView
        Component1={
        <div className="bg-white shadow-md rounded-md">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">DSA Questions</h1>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                {Object.keys(problemStatuses).length > 0 && (
                  <span>
                    ✓ {Object.values(problemStatuses).filter(s => s === 'success').length} solved, 
                    ✗ {Object.values(problemStatuses).filter(s => s === 'failed').length} failed
                  </span>
                )}
              </div>
              <button
                onClick={() => fetchProblemStatuses(moduleProblems)}
                disabled={statusLoading}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 text-sm"
                title="Refresh problem statuses from judge"
              >
                {statusLoading ? '↻' : '🔄'} Refresh Status
              </button>
            </div>
          </div>

          <table className="w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gray-200">
                <th className="py-2 px-4">Status</th>
                <th className="py-2 px-4">Title</th>
                <th className="py-2 px-4">Difficulty</th>
              </tr>
            </thead>
            <tbody>
              {moduleProblems.map((problem, index) => (
                <tr
                  key={problem.slug}
                  className={`${
                    index % 2 === 0 ? "bg-gray-50" : "bg-white"
                  } text-center`}
                >
                  <td className="py-2 px-4">
                    <StatusIndicator 
                      status={problemStatuses[problem.slug]} 
                      isLoading={statusLoading}
                    />
                  </td>
                  <td className="py-2 px-4">
                    <Link
                      to={`${problem.slug}`}
                      className="text-blue-500 hover:underline"
                    >
                      {problem.name}
                    </Link>
                  </td>
                  <td className="py-2 px-4">
                    <span
                      className={`${
                        problem.difficulty === "Easy"
                          ? "bg-green-500"
                          : problem.difficulty === "Medium"
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      } text-white px-2 py-1 rounded-full`}
                    >
                      {problem.difficulty}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }
    />
    </>
  );
};

export default ModuleDetail;
