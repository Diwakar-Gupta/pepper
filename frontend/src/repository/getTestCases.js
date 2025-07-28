import {url} from "../constants";

export const getTestCases = async (problemSlug) => {
  try {
    // Fetch the problem details to get test case file names
    const problemResponse = await fetch(`${url}/database/problems/${problemSlug}.json`);
    if (!problemResponse.ok) {
      throw new Error(`Failed to fetch problem: ${problemResponse.status}`);
    }
    
    const problem = await problemResponse.json();
    
    if (!problem.testCases || problem.testCases.length === 0) {
      return [];
    }
    
    // Only fetch the first test case for preview
    const firstTestCase = problem.testCases[0];
    
    try {
      // Fetch input file
      const inputResponse = await fetch(`${url}/database/testcases/${problemSlug}/${firstTestCase.input}`);
      if (!inputResponse.ok) {
        console.warn(`Failed to fetch input file ${firstTestCase.input}: ${inputResponse.status}`);
        return [];
      }
      const input = await inputResponse.text();
      
      // Fetch output file
      const outputResponse = await fetch(`${url}/database/testcases/${problemSlug}/${firstTestCase.output}`);
      if (!outputResponse.ok) {
        console.warn(`Failed to fetch output file ${firstTestCase.output}: ${outputResponse.status}`);
        return [];
      }
      const expectedOutput = await outputResponse.text();
      
      return [{
        input: input.trim(),
        expectedOutput: expectedOutput.trim()
      }];
    } catch (error) {
      console.error('Error fetching first test case:', error);
      return [];
    }
  } catch (error) {
    console.error('Error fetching test cases:', error);
    return [];
  }
}; 