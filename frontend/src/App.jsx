import React, { lazy, Suspense } from "react";
import { createBrowserRouter, Outlet, RouterProvider, ScrollRestoration } from "react-router-dom";
import Navbar from "./components/Navbar";
import { ErrorState, Spinner } from "./components/ui";
import { BASE } from "./constants";
import { JudgeProvider } from "./contexts/JudgeContext";

const HomePage = lazy(() => import("./pages/HomePage"));
const CoursePage = lazy(() => import("./pages/CoursePage"));
const ModulePage = lazy(() => import("./pages/ModulePage"));
const LessonPage = lazy(() => import("./pages/LessonPage"));
const ProblemPage = lazy(() => import("./pages/ProblemPage"));

function Layout() {
  return (
    <JudgeProvider>
      <div className="flex min-h-screen flex-col bg-slate-50">
        <Navbar />
        <main className="flex-1">
          <Suspense fallback={<Spinner />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <ScrollRestoration />
    </JudgeProvider>
  );
}

const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <Layout />,
      errorElement: <ErrorState title="Something went wrong">Try reloading the page.</ErrorState>,
      children: [
        { index: true, element: <HomePage /> },
        { path: "course/:courseSlug", element: <CoursePage /> },
        { path: "course/:courseSlug/:moduleSlug", element: <ModulePage /> },
        { path: "course/:courseSlug/:moduleSlug/learn/:itemSlug", element: <LessonPage /> },
        { path: "course/:courseSlug/:moduleSlug/:problemSlug", element: <ProblemPage /> },
        { path: "*", element: <ErrorState title="Page not found">That page does not exist.</ErrorState> },
      ],
    },
  ],
  { basename: BASE }
);

export default function App() {
  return <RouterProvider router={router} />;
}
