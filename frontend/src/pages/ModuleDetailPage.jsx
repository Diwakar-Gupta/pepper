import React, { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import getModuleDetails from "../repository/getModuleDetails";
import TwoColListAndRankView from "../layouts/TwoColListAndRankView";
import Progress from "../components/Progress";
import EditLinks from "../components/EditLinks";

const ModuleDetail = () => {
  const { courseSlug, moduleSlug } = useParams();
  const [moduleProblems, setModuleProblems] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchModule = async () => {
      try {
        setIsLoading(true);
        const moduleProblemsList = await getModuleDetails(
          courseSlug,
          moduleSlug,
        );
        setModuleProblems(moduleProblemsList);
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
          <h1 className="text-3xl font-bold mb-6 text-center">DSA Questions</h1>

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
                  <td className="py-2 px-4">{"-"}</td>
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
