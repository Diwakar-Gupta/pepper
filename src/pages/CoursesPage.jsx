// Courses.js
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClock, faBook, faUsers } from "@fortawesome/free-solid-svg-icons";
import getCourseList from "../repository/getCoursesList";

const CoursesPage = () => {
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      setCourses(await getCourseList());
    };
    fetchData();
  }, []);

  return (
    <div className="flex justify-center items-center h-screen">
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
