// Courses.js
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import Accordion from "../components/utils/Accordion";
import getCourseDetails from "../repository/getCourseDetails";

const CourseDetailPage = () => {
  const { courseSlug } = useParams();
  const [course, setCourse] = useState(null);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const courseWithModules = await getCourseDetails(courseSlug);
        setCourse(courseWithModules);
      } catch (error) {
        console.error("Error loading course:", error);
        setCourse(null);
      }
    };

    fetchCourse();
  }, [courseSlug]);

  if (!course) {
    return <div>Course not found</div>;
  }

  console.log(course.categorys);

  return (
    <div className="flex flex-col justify-center m-10">
      <h1 className="font-medium text-3xl">Modules and Lectures</h1>
      {course.categorys.map((category) => {
        const title = category.name;
        const items = category.topics.map((topic) => topic.name);

        return <Accordion key={title} title={title} items={items} />;
      })}
    </div>
  );
};

export default CourseDetailPage;
