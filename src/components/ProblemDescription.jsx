// ProblemDescription.jsx

import React from "react";
import MarkdownPreview from "@uiw/react-markdown-preview";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExternalLinkAlt, faVideo } from "@fortawesome/free-solid-svg-icons";

const ProblemDescription = React.memo(({ problem }) => {
  return (
    <div>
      {problem.externalPlatforms && problem.externalPlatforms.length > 0 && (
        <div className="mb-4">
          <strong>Available on:</strong>
          <ul>
            {problem.externalPlatforms.map((platform, index) => (
              <li key={index}>
                <a
                  href={platform.link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {platform.name} <FontAwesomeIcon icon={faExternalLinkAlt} />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <h2 className="text-2xl font-semibold mb-4">{problem.name}</h2>
      <MarkdownPreview
        source={problem.description}
        wrapperElement={{
          "data-color-mode": "light",
        }}
      />
      <div className="mt-4">
        {problem.problemVideoLink && (
          <div>
            <strong>Problem Video:</strong>{" "}
            <a
              href={problem.problemLinkVideo}
              target="_blank"
              rel="noopener noreferrer"
            >
              Watch Problem Video <FontAwesomeIcon icon={faVideo} />
            </a>
          </div>
        )}

        {problem.solutionVideolink && (
          <div className="mb-2">
            <strong>Solution Video:</strong>{" "}
            <a
              href={problem.solutionLinkVideo}
              target="_blank"
              rel="noopener noreferrer"
            >
              Watch Solution Video <FontAwesomeIcon icon={faVideo} />
            </a>
          </div>
        )}
      </div>
    </div>
  );
});

ProblemDescription.displayName = "ProblemDescription";
export default ProblemDescription;
