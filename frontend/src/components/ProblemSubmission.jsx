// ProblemSubmission.js
import React, { useState } from "react";

const ProblemSubmission = ({ code, language, input, setInput, onRun, runResult, judgeAvailable }) => {
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
          className={`bg-blue-500 text-white px-4 py-2 rounded-md focus:outline-none ${
            !code || !language ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
          }`}
          onClick={onRun}
          disabled={!code || !language}
        >
          Run
        </button>
        <button
          className={`bg-green-500 text-white px-4 py-2 rounded-md focus:outline-none ${
            !code || !language ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-600'
          }`}
          disabled={!code || !language}
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
