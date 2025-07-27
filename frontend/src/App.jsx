import React, { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider, Outlet, Navigate } from "react-router-dom";
import Progress from "./components/Progress";
import TopNavigator from "./components/TopNavigator";
import { JudgeProvider } from "./contexts/JudgeContext";

const CoursesPage = lazy(() => import("./pages/CoursesPage"));
const CourseDetailPage = lazy(() => import("./pages/CourseDetailPage"));
const ModuleDetail = lazy(() => import("./pages/ModuleDetailPage"));
const ProblemDetails = lazy(() => import("./pages/ProblemDetail"));
const Error = lazy(() => import("./pages/Error"));

const AppLayout = () => {
  console.log("AppLayout Rendered");
  return (
    <JudgeProvider>
      <div className="app">
        <TopNavigator />
        <Outlet />
      </div>
    </JudgeProvider>
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
        path: "/pepper/course",
        element: <Navigate to="/pepper/" replace />,
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
      ,
      {
        path: "/pepper/course/:courseSlug/:moduleSlug/:problemSlug",
        element: (
          <Suspense fallback={<Progress />}>
            <ProblemDetails />
          </Suspense>
        ),
      },
    ],
  },
]);
const AppRouter = () => <RouterProvider router={appRouter} />;

export default AppRouter;
