// Courses.js
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClock, faBook, faUsers } from "@fortawesome/free-solid-svg-icons";
import getCourseList from "../repository/getCoursesList";
import Progress from "../components/Progress";
import EditLinks from "../components/EditLinks";

const CoursesPage = () => {
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const courseData = await getCourseList();
        setCourses(courseData || []);
      } catch (error) {
        console.error("Error loading courses:", error);
        setCourses([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading) {
    return <Progress />;
  }

  if (!courses || courses.length === 0) {
    return <div className="flex justify-center items-center h-screen">No courses found</div>;
  }

  return (
    <div className="flex justify-center items-center h-screen">
      <EditLinks 
        uiPath="CoursesPage.jsx" 
        dataPath="courses/meta.json" 
      />
      <div className="flex flex-col md:flex-row gap-4">
        {courses.map((course, index) => (
          <Link
            key={index}
            to={`course/${course.slug}`}
            className="bg-gray-200 p-4 rounded shadow-md"
          >
            <h2 className="text-lg font-semibold mb-2">{course.name}</h2>{" "}
            <div className="flex items-center text-gray-700 mb-2">
              <FontAwesomeIcon icon={faClock} className="mr-2" />
              <span>{course.duration}</span>
            </div>
            <div className="flex items-center text-gray-700 mb-4">
              <FontAwesomeIcon icon={faBook} className="mr-2" />
              <span>{course.contents}</span>
            </div>
            <div className="flex items-center text-gray-700">
              <FontAwesomeIcon icon={faUsers} className="mr-2" />
              <span>Target Audience: {course.description}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default React.memo(CoursesPage);
