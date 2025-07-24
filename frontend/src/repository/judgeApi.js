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

  return await response.json();
};
