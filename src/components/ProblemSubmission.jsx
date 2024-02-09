// ProblemSubmission.js
import React, { useState } from "react";

const ProblemSubmission = () => {
  return (
    <div className="bg-white p-4 border border-gray-300 rounded-md shadow-md relative">
      {/* Translucent overlay */}
      <div className="absolute inset-0 bg-black text-center text-white text-lg opacity-50 rounded-md">
        Code Executor in development state
      </div>

      {/* Run and Submit buttons */}
      <div className="flex space-x-4 mb-4">
        <button
          className={`bg-blue-500 text-white px-4 py-2 rounded-md focus:outline-none`}
          disabled
        >
          Run
        </button>
        <button
          className={`bg-green-500 text-white px-4 py-2 rounded-md focus:outline-none`}
          disabled
        >
          Submit
        </button>
      </div>
    </div>
  );
};

export default ProblemSubmission;
