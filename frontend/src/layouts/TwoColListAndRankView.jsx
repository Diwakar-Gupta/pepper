// TwoColListAndRankView.js

import React from "react";

const NOTHING_HERE = (
  <div className="flex justify-center items-center h-full min-h-20">
    <span>Nothing Here</span>
  </div>
);

const TwoColListAndRankView = ({ Component1, Component2 }) => {
  return (
    <div className="flex flex-col sm:flex-row gap-6 justify-center md:p-20 sm:p-2 bg-[#fcfcfd] h-full w-full">
      <div className="grow shadow-md rounded-md bg-white">
        {Component1 ? Component1 : NOTHING_HERE}
      </div>
      <div className="sm:w-1/3 md:w-2/5 shadow-md rounded-md bg-white">
        {Component2 ? Component2 : NOTHING_HERE}
      </div>
    </div>
  );
};

export default TwoColListAndRankView;
