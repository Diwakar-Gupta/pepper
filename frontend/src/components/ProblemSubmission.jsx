// ProblemSubmission.js
import React, { useState } from "react";

const ProblemSubmission = ({ code, language, input, setInput, onRun, runResult, judgeAvailable }) => {
  return (
    <div className="bg-white p-4 border border-gray-300 rounded-md shadow-md relative">
      {/* Input box for stdin */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Custom Input (stdin):</label>
        <textarea
          className="w-full p-2 border border-gray-300 rounded-md"
          rows={3}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Enter input for your program here..."
        />
      </div>

      {/* Run and Submit buttons */}
      <div className="flex space-x-4 mb-4">
        <button
          className={`bg-blue-500 text-white px-4 py-2 rounded-md focus:outline-none`}
          onClick={onRun}
          disabled={!code || !language || !judgeAvailable}
        >
          Run
        </button>
        <button
          className={`bg-green-500 text-white px-4 py-2 rounded-md focus:outline-none`}
          disabled={!judgeAvailable}
        >
          Submit
        </button>
      </div>

      {/* Output display */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Output:</label>
        <pre className="bg-gray-100 p-2 rounded-md whitespace-pre-wrap min-h-[2rem]">
          {runResult.stdout || ""}
        </pre>
        {runResult.stderr && (
          <pre className="bg-red-100 p-2 rounded-md text-red-700 whitespace-pre-wrap mt-2">
            {runResult.stderr}
          </pre>
        )}
      </div>
    </div>
  );
};

export default ProblemSubmission;
