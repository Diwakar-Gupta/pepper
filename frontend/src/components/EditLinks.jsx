import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faCode, faCog } from '@fortawesome/free-solid-svg-icons';

const EditLinks = ({ 
  uiPath, 
  dataPath, 
  className = "fixed bottom-4 right-4 z-50" 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const githubBaseUrl = "https://github.com/Diwakar-Gupta/pepper/blob/main/frontend/src/pages";
  const dataBaseUrl = "https://github.com/Diwakar-Gupta/pepper/blob/main/frontend/public/database";

  const handleEditUI = () => {
    window.open(`${githubBaseUrl}/${uiPath}`, '_blank');
    setIsOpen(false);
  };

  const handleEditData = () => {
    window.open(`${dataBaseUrl}/${dataPath}`, '_blank');
    setIsOpen(false);
  };

  return (
    <div className={className}>
      {/* Collapsible menu */}
      {isOpen && (
        <div className="mb-2 flex flex-col gap-1">
          <button
            onClick={handleEditUI}
            className="bg-gray-700 hover:bg-gray-800 text-white px-2 py-1 rounded text-xs transition-colors duration-200 flex items-center gap-1 opacity-90"
            title="Edit UI Component"
          >
            <FontAwesomeIcon icon={faCode} className="text-xs" />
            UI
          </button>
          <button
            onClick={handleEditData}
            className="bg-gray-700 hover:bg-gray-800 text-white px-2 py-1 rounded text-xs transition-colors duration-200 flex items-center gap-1 opacity-90"
            title="Edit Data File"
          >
            <FontAwesomeIcon icon={faEdit} className="text-xs" />
            Data
          </button>
        </div>
      )}
      
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gray-600 hover:bg-gray-700 text-white p-2 rounded-full shadow-lg transition-all duration-200 opacity-70 hover:opacity-100"
        title="Edit Options"
      >
        <FontAwesomeIcon icon={faCog} className="text-sm" />
      </button>
    </div>
  );
};

export default EditLinks;
