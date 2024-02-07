// Accordion.js
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faChevronUp } from "@fortawesome/free-solid-svg-icons";

const Accordion = ({ title, items }) => {
  console.log(items);
  const [isOpen, setIsOpen] = useState(false);

  const toggleAccordion = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div
      className={`border border-solid border-gray-300 mb-0 overflow-hidden transition-max-height duration-300 ease-out max-h-16 ${
        isOpen ? "max-h-48" : ""
      }`}
    >
      <div
        className="bg-gray-100 py-2 px-4 cursor-pointer flex justify-between items-center"
        onClick={toggleAccordion}
      >
        <h3>{title}</h3>
        <div className="flex flex-row">
          <h3 className="mr-2">{items.length}</h3>

          <FontAwesomeIcon
            icon={isOpen ? faChevronUp : faChevronDown}
            className="mr-2"
          />
        </div>
      </div>
      {isOpen && (
        <ul className="list-none pl-4 mb-0">
          {items.length > 0 ? (
            items.map((item, index) => (
              <li key={index} className="mb-2">
                <Link
                  to={`${item.toLowerCase().replaceAll(" ", "-")}`}
                  className="flex items-center"
                >
                  {item}
                </Link>
              </li>
            ))
          ) : (
            <li>Nothing to show here</li>
          )}
        </ul>
      )}
    </div>
  );
};

export default React.memo(Accordion);
