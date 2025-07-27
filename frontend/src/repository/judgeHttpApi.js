import { JUDGE_API_BASE_URL } from "../constants";

export const getLanguages = async () => {
  const response = await fetch(`${JUDGE_API_BASE_URL}/languages`);
  if (!response.ok) {
    throw new Error(`Error fetching languages: ${response.statusText}`);
  }
  return await response.json();
};

export const executeCode = async ({ code, language, input }) => {
  const response = await fetch(`${JUDGE_API_BASE_URL}/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      code,
      language,
      input,
    }),
  });

  if (!response.ok) {
    throw new Error(`Error executing code: ${response.statusText}`);
  }

  const data = await response.json();
  
  // For backward compatibility, return the first result as stdout/stderr
  if (data.results && data.results.length > 0) {
    const firstResult = data.results[0];
    return {
      stdout: firstResult.actualOutput,
      stderr: firstResult.stderr,
      results: data.results,
      summary: data.summary
    };
  }
  
  return data;
};

export const executeCodeWithTestCases = async ({ code, language, testCases }) => {
  const response = await fetch(`${JUDGE_API_BASE_URL}/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      code,
      language,
      testCases,
    }),
  });

  if (!response.ok) {
    throw new Error(`Error executing code: ${response.statusText}`);
  }

  return await response.json();
};
