import React, { useState } from "react";
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-java";
import "ace-builds/src-noconflict/mode-python";

import "ace-builds/src-noconflict/theme-monokai";
import "ace-builds/src-noconflict/theme-github";
import "ace-builds/src-noconflict/theme-chaos";
import "ace-builds/src-noconflict/theme-cobalt";
import "ace-builds/src-noconflict/theme-dracula";
import "ace-builds/src-noconflict/theme-github_dark";
import "ace-builds/src-noconflict/theme-merbivore_soft";
import "ace-builds/src-noconflict/theme-monokai";
import "ace-builds/src-noconflict/theme-nord_dark";
import "ace-builds/src-noconflict/theme-one_dark";
import "ace-builds/src-noconflict/theme-textmate";
import "ace-builds/src-noconflict/theme-tomorrow_night_blue";
import "ace-builds/src-noconflict/theme-tomorrow_night_eighties";
import "ace-builds/src-noconflict/theme-tomorrow_night";
import "ace-builds/src-noconflict/theme-xcode";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCog } from "@fortawesome/free-solid-svg-icons";

const ProblemEditor = ({ code, setCode, languages = [], selectedLanguage, setSelectedLanguage }) => {
  const [selectedTheme, setSelectedTheme] = useState("monokai");
  const [fontSize, setFontSize] = useState(14); // Initial font size
  const [showSettings, setShowSettings] = useState(false);

  const themeOptions = [
    "chaos",
    "cobalt",
    "dracula",
    "github_dark",
    "merbivore_soft",
    "monokai",
    "nord_dark",
    "one_dark",
    "textmate",
    "tomorrow_night_blue",
    "tomorrow_night_eighties",
    "tomorrow_night",
    "xcode",
  ];
  const fontSizeOptions = [14, 16, 18, 20];

  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };

  const handleThemeChange = (e) => {
    const themeName = e.target.value;
    setSelectedTheme(themeName);
  };

  const handleFontSizeChange = (e) => {
    setFontSize(Number(e.target.value));
  };

  return (
    <div className="mb-6 relative">
      <div className="mb-4 flex justify-between items-center">
        {/* Language selector */}
        <select
          id="languageSelector"
          name="languageSelector"
          className="p-2 border border-gray-300 rounded-md"
          value={selectedLanguage}
          onChange={(e) => setSelectedLanguage(e.target.value)}
        >
          {languages.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>

        {/* Settings icon */}
        <button
          onClick={toggleSettings}
          className="text-gray-700 focus:outline-none"
        >
          <FontAwesomeIcon icon={faCog} className="text-lg" />
        </button>

        {/* Settings dropdown */}
        {showSettings && (
          <div className="absolute top-0 right-0 mt-8 bg-white p-4 border border-gray-300 rounded-md shadow-md z-10">
            {/* Theme selector */}
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Theme:
            </label>
            <select
              id="themeSelector"
              name="themeSelector"
              className="w-full p-2 border border-gray-300 rounded-md mb-2"
              value={selectedTheme}
              onChange={handleThemeChange}
            >
              {themeOptions.map((theme) => (
                <option key={theme} value={theme}>
                  {theme}
                </option>
              ))}
            </select>

            {/* Font size selector */}
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Font Size:
            </label>
            <select
              id="fontSizeSelector"
              name="fontSizeSelector"
              className="w-full p-2 border border-gray-300 rounded-md"
              value={fontSize}
              onChange={handleFontSizeChange}
            >
              {fontSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Ace Editor */}
      <AceEditor
        mode={selectedLanguage}
        theme={selectedTheme}
        onChange={(value) => setCode(value)}
        value={code}
        name="code-editor"
        editorProps={{ $blockScrolling: true }}
        fontSize={fontSize} // Set the font size dynamically
        height="25rem"
        width="100%"
      />
    </div>
  );
};

export default ProblemEditor;
