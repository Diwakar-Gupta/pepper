import React, { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom";
import Progress from "./components/Progress";

const CoursesPage = lazy(() => import("./pages/CoursesPage"));
const CourseDetailPage = lazy(() => import("./pages/CourseDetailPage"));
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
    path: "/",
    element: <AppLayout />,
    errorElement: <Error />,
    children: [
      {
        path: "/",
        element: (
          <Suspense fallback={<Progress />}>
            <CoursesPage />
          </Suspense>
        ),
      },
      {
        path: "/course/:courseSlug",
        element: (
          <Suspense fallback={<Progress />}>
            <CourseDetailPage />
          </Suspense>
        ),
      },
    ],
  },
]);
const AppRouter = () => <RouterProvider router={appRouter} />;

export default AppRouter;
