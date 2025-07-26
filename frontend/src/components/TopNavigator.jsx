import React from "react";
import { Link, useLocation, useParams } from "react-router-dom";

function getCrumbs(pathname) {
  // Remove leading/trailing slashes and split
  const parts = pathname.replace(/^\/pepper\/?/, "").split("/").filter(Boolean);
  const crumbs = [];
  let path = "/pepper";
  for (let i = 0; i < parts.length; i++) {
    path += `/${parts[i]}`;
    crumbs.push({
      name: parts[i].replace(/-/g, " "),
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
      <Link to="/pepper/" className="text-blue-600 hover:underline">Home</Link>
      {crumbs.map((crumb, idx) => (
        <React.Fragment key={crumb.path}>
          <span className="mx-1 text-gray-400">/</span>
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