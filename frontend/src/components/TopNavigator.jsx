import React from "react";
import { Link, useLocation } from "react-router-dom";

const crumbNameMap = {
  course: "Course",
  "dsa-fundamentals": "DSA Fundamentals",
  "getting-started": "Getting Started",
};

function getCrumbs(pathname) {
  // Remove leading /pepper and split
  const parts = pathname.replace(/^\/pepper\/?/, "").split("/").filter(Boolean);
  const crumbs = [];
  let path = "/pepper";
  for (let i = 0; i < parts.length; i++) {
    path += `/${parts[i]}`;
    crumbs.push({
      name: crumbNameMap[parts[i]] || parts[i].replace(/-/g, " "),
      path,
    });
  }
  return crumbs;
}

const TopNavigator = () => {
  const location = useLocation();
  const crumbs = getCrumbs(location.pathname);

  return (
    <nav className="bg-gray-100 px-4 py-2 text-sm font-medium flex items-center gap-2 border-b border-gray-200">
      <a href="/" className="text-blue-600 hover:underline">Home</a>
      {crumbs.length > 0 && <span className="mx-1 text-gray-400">/</span>}
      {crumbs.map((crumb, idx) => (
        <React.Fragment key={crumb.path}>
          {idx > 0 && <span className="mx-1 text-gray-400">/</span>}
          {idx === crumbs.length - 1 ? (
            <span className="text-gray-700">{crumb.name}</span>
          ) : (
            <Link to={crumb.path} className="text-blue-600 hover:underline">{crumb.name}</Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

export default TopNavigator; 