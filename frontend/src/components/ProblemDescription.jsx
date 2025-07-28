import React from "react";
import MarkdownPreview from "@uiw/react-markdown-preview";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons";
import YouTube from "react-youtube";

const videoOptions = {
  height: "390",
  width: "640",
  playerVars: {
    autoplay: 0, // Change to 1 if you want the video to autoplay
  },
};

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
      {/* <MarkdownPreview
        source={problem.description}
        wrapperElement={{
          "data-color-mode": "light",
        }}
      />  */}
      <div className="mt-4">
        {problem.problemVideoLink && (
          <div className="mb-2">
            <strong>Problem Video:</strong>{" "}
            <YouTube
              videoId={getYouTubeVideoId(problem.problemVideoLink)}
              opts={videoOptions}
            />
          </div>
        )}

        {problem.solutionVideolink && (
          <div className="mb-2">
            <strong>Solution Video:</strong>{" "}
            <YouTube
              videoId={getYouTubeVideoId(problem.solutionVideolink)}
              opts={videoOptions}
            />
          </div>
        )}
      </div>{" "}
    </div>
  );
});
const getYouTubeVideoId = (url) => {
  const regExp =
    /^(?:(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11}))/;
  const match = url.match(regExp);
  return match && match[1];
};

ProblemDescription.displayName = "ProblemDescription";
export default ProblemDescription;
