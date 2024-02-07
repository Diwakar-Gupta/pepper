const getCourseList = async () => {
  try {
    const response = await fetch(`/Database/courses/all.json`);
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

export default getCourseList;
