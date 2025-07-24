import {url} from "../constants";

const getCourseDetails = async (courseSlug) => {
  try {
    const response = await fetch(
      `${url}/database/courses/${courseSlug}/meta.json`,
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

export default getCourseDetails;
