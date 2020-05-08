import React from "react";

import ReactBlockly from "react-blockly";

import ToolboxXML from "./blockly/toolbox.xml";
import WorkspaceXML from "./blockly/workspace.xml";

import "./App.css";

console.log(ToolboxXML, WorkspaceXML);
`i'''''''''''''''''''''''''''''''''''''''''''''''''''




































































































''



`;

function App() {
  return (
    <div className="App">
      <ReactBlockly.BlocklyEditor
        toolboxCategories={ToolboxXML}
        workspaceConfiguration={{
          grid: {
            spacing: 20,
            length: 3,
            colour: "#ccc",
            snap: true,
          },
        }}
        initialXml={WorkspaceXML}
        wrapperDivClassName="fill-height"
      />
    </div>
  );
}

export default App;
