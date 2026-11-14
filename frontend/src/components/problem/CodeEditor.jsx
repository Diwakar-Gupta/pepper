import React, { useRef } from "react";
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/ext-language_tools";
import "ace-builds/src-noconflict/ext-searchbox";
import "ace-builds/src-noconflict/mode-java";
import "ace-builds/src-noconflict/mode-c_cpp";
import "ace-builds/src-noconflict/mode-python";
import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/theme-github";
import "ace-builds/src-noconflict/theme-monokai";
import "ace-builds/src-noconflict/theme-one_dark";
import "ace-builds/src-noconflict/theme-dracula";
import "ace-builds/src-noconflict/theme-tomorrow_night";
import "ace-builds/src-noconflict/theme-xcode";
import "ace-builds/src-noconflict/keybinding-vim";
import { LANGUAGE_META } from "../../constants";

export const EDITOR_THEMES = {
  one_dark: "One Dark",
  monokai: "Monokai",
  dracula: "Dracula",
  tomorrow_night: "Tomorrow Night",
  github: "GitHub (light)",
  xcode: "Xcode (light)",
};

export default function CodeEditor({ language, value, onChange, settings, onRun, onSubmit }) {
  // Keep the latest callbacks without re-registering Ace commands.
  const handlers = useRef({});
  handlers.current = { onRun, onSubmit };

  return (
    <AceEditor
      mode={LANGUAGE_META[language]?.aceMode || "text"}
      theme={settings.theme}
      value={value}
      onChange={onChange}
      name="pepper-code-editor"
      width="100%"
      height="100%"
      fontSize={settings.fontSize}
      keyboardHandler={settings.vim ? "vim" : undefined}
      showPrintMargin={false}
      editorProps={{ $blockScrolling: Infinity }}
      setOptions={{
        enableBasicAutocompletion: true,
        enableLiveAutocompletion: settings.autocomplete,
        tabSize: 4,
        useSoftTabs: true,
        fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
        scrollPastEnd: 0.3,
      }}
      commands={[
        {
          name: "run",
          bindKey: { win: "Ctrl-Enter", mac: "Command-Enter" },
          exec: () => handlers.current.onRun?.(),
        },
        {
          name: "submit",
          bindKey: { win: "Ctrl-Shift-Enter", mac: "Command-Shift-Enter" },
          exec: () => handlers.current.onSubmit?.(),
        },
      ]}
    />
  );
}
