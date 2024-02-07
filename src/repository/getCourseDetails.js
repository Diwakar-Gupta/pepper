const getCourseDetails = async (courseSlug) => {
  try {
    const response = await fetch(`/Database/courses/${courseSlug}.json`);
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

