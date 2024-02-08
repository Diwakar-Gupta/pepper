import url from "../constants";

const getModuleDetails = async (moduleSlug) => {
  try {
    const response = await fetch(
      `${url}/database/submodules/${moduleSlug}.json`,
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

export default getModuleDetails;
