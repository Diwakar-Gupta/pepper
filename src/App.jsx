import React, { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom";
import Progress from "./components/Progress";

const CoursesPage = lazy(() => import("./pages/CoursesPage"));
const CourseDetailPage = lazy(() => import("./pages/CourseDetailPage"));
const ModuleDetail = lazy(() => import("./pages/ModuleDetailPage"));
const Error = lazy(() => import("./pages/Error"));

const AppLayout = () => {
  console.log("AppLayout Rendered");
  return (
    <div className="app">
      <Outlet />
    </div>
  );
};

const appRouter = createBrowserRouter([
  {
    path: "/pepper/",
    element: <AppLayout />,
    errorElement: <Error />,
    children: [
      {
        path: "/pepper/",
        element: (
          <Suspense fallback={<Progress />}>
            <CoursesPage />
          </Suspense>
        ),
      },
      {
        path: "/pepper/course/:courseSlug",
        element: (
          <Suspense fallback={<Progress />}>
            <CourseDetailPage />
          </Suspense>
        ),
      },
      {
        path: "/pepper/course/:courseSlug/:moduleSlug",
        element: (
          <Suspense fallback={<Progress />}>
            <ModuleDetail />
          </Suspense>
        ),
      },
    ],
  },
]);
const AppRouter = () => <RouterProvider router={appRouter} />;

export default AppRouter;
