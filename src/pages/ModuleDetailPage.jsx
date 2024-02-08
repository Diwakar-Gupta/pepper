import React, { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import getModuleDetails from "../repository/getModuleDetails";

const ModuleDetail = () => {
  const { moduleSlug } = useParams();
  const [moduleProblems, setModuleProblems] = useState(null);

  useEffect(() => {
    const fetchModule = async () => {
      try {
        const moduleProblemsList = await getModuleDetails(moduleSlug);
        setModuleProblems(moduleProblemsList);
      } catch (error) {
        console.error("Error loading course:", error);
        setCourse(null);
      }
    };

    fetchModule();
  }, [moduleSlug]);

  if (!moduleProblems) {
    return <div>Course not found</div>;
  }

  return (
    <div className="min-h-screen flex  justify-center bg-gray-100">
      <div className="bg-white shadow-md rounded-md p-8 w-full md:w-2/3 lg:w-1/2">
        <h1 className="text-3xl font-bold mb-6">DSA Questions</h1>

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
    </div>
  );
};

export default ModuleDetail;
