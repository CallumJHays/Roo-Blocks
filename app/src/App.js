import React, { useEffect } from "react";

import ReactBlockly from "react-blockly";

import { TOOLBOX_CATEGORIES, WORKSPACE_XML } from "./blockly";

import "./App.css";

const OG_CONSOLE_ERROR = console.error;

let usedIgnoreBenignReactBlocklyErrors = false;
function useIgnoreBenignReactBlocklyErrors() {
  if (!usedIgnoreBenignReactBlocklyErrors) {
    console.error = function(e) {
      if (!e.includes("The tag <%s> is unrecognized in this browser.")) {
        OG_CONSOLE_ERROR(arguments)
      }
    }
  }

  useEffect(() => () => {
    console.error = OG_CONSOLE_ERROR;
  }, [])
}

function App() {
  useIgnoreBenignReactBlocklyErrors()

  return (
    <div className="App">
      <ReactBlockly.BlocklyEditor
        toolboxCategories={TOOLBOX_CATEGORIES}
        workspaceConfiguration={{
          grid: {
            spacing: 20,
            length: 3,
            colour: "#ccc",
            snap: true,
          },
        }}
        initialXml={WORKSPACE_XML}
        wrapperDivClassName="fill-height"
      />
    </div>
  );
}

export default App;
