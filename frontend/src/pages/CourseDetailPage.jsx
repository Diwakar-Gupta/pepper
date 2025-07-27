// Courses.js
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import Accordion from "../components/utils/Accordion";
import getCourseDetails from "../repository/getCourseDetails";
import TwoColListAndRankView from "../layouts/TwoColListAndRankView";
import Progress from "../components/Progress";
import EditLinks from "../components/EditLinks";

const CourseDetailPage = () => {
  const { courseSlug } = useParams();
  const [course, setCourse] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setIsLoading(true);
        const courseWithModules = await getCourseDetails(courseSlug);
        setCourse(courseWithModules);
      } catch (error) {
        console.error("Error loading course:", error);
        setCourse(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourse();
  }, [courseSlug]);

  if (isLoading) {
    return <Progress />;
  }

  if (!course) {
    return <div>Course not found</div>;
  }

  console.log(course.categorys);

  return (
    <>
      <EditLinks 
        uiPath="CourseDetailPage.jsx" 
        dataPath={`courses/${courseSlug}/meta.json`} 
      />
      <TwoColListAndRankView
        Component1={
          <div className="flex flex-col justify-center md:grow">
            <h1 className="font-medium text-3xl text-center">
              Modules and Lectures
            </h1>
            {course.categorys.map((category) => {
              const title = category.name;
              const items = category.topics.map((topic) => topic.name);

              return <Accordion key={title} title={title} items={items} />;
            })}
          </div>
        }
      />
    </>
  );
};

export default CourseDetailPage;
