import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";

const Progress = () => {
  return (
    <div className="flex justify-center items-center">
      <FontAwesomeIcon icon={faSpinner} spin size="3x" color="blue" />
    </div>
  );
};

export default Progress;
