import {url} from "../constants";

const getProblemDetails = async (problemSlug) => {
  try {
    const response = await fetch(
      `${url}/database/problems/${problemSlug}.json`,
    );
    if (!response.ok) {
      throw new Error("Failed to fetch course details");
    }
    const courseDetails = await response.json();
    return courseDetails;
  } catch (error) {
    console.error(error);
    return null;
  }
};

export default getProblemDetails;
