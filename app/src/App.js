import React, { useState, useEffect } from "react";

import ReactBlockly from "react-blockly";
import blockly from "blockly";
import blocklyPython from "blockly/python";

import {
  TOOLBOX_CATEGORIES,
  WORKSPACE_XML,
  setupCustomBlocks,
} from "./blockly";
import Button from "react-bootstrap/Button";
import ProgressBar from "react-bootstrap/ProgressBar";
import Modal from "react-bootstrap/Modal";
import ReactSyntaxHighlighter from "react-syntax-highlighter";

import "./App.css";
import logo from "./logo.png";

setupCustomBlocks(blockly);

const OG_CONSOLE_ERROR = console.error;

let usedIgnoreBenignReactBlocklyErrors = false;
function useIgnoreBenignReactBlocklyErrors() {
  if (!usedIgnoreBenignReactBlocklyErrors) {
    console.error = function (e) {
      if (!e.includes("The tag <%s> is unrecognized in this browser.")) {
        OG_CONSOLE_ERROR(arguments);
      }
    };
    usedIgnoreBenignReactBlocklyErrors = true;
  }

  useEffect(
    () => () => {
      console.error = OG_CONSOLE_ERROR;
      usedIgnoreBenignReactBlocklyErrors = false;
    },
    []
  );
}

function CodeExecutor({ pythonCode }) {
  const [uploaded, setUploaded] = useState(null);

  useEffect(() => {
    const handleUploadProgress = (_, msg) => {
      setUploaded(msg === 100 ? null : msg);
    };
    window.ipcRenderer.on("upload", handleUploadProgress);
    return () =>
      window.ipcRenderer.removeListener("upload", handleUploadProgress);
  }, []);

  return (
    <div>
      <Button
        variant="success"
        disabled={uploaded !== null}
        onClick={() => {
          window.ipcRenderer.send(
            "bluetooth",
            JSON.stringify({
              type: "upload",
              data: pythonCode,
            })
          );
          setUploaded(0);
        }}
      >
        {uploaded === null ? "Play" : `Uploading`}
      </Button>
      {uploaded !== null ? (
        <ProgressBar
          className="spaced"
          style={{ width: 200, marginTop: 10 }}
          animated
          now={uploaded}
          label={`${uploaded}%`}
        />
      ) : null}
    </div>
  );
}

function ConnectionMenu({ pythonCode }) {
  const [connected, setConnected] = useState(false);
  const [ellipsis, setEllipsis] = useState("");

  useEffect(() => {
    const handleConnected = (_, msg) => {
      setConnected(msg);
    };
    window.ipcRenderer.on("connected", handleConnected);
    return () =>
      window.ipcRenderer.removeListener("connected", handleConnected);
  }, []);

  useEffect(() => {
    if (!connected) {
      const handle = setInterval(() => {
        setEllipsis((ellipsis) =>
          ellipsis.length === 3 ? "" : ellipsis + "."
        );
      }, 2000);
      return () => clearInterval(handle);
    }
  }, [connected]);

  return (
    <>
      <div className="connection spaced">
        Bluetooth: &nbsp;&nbsp;
        <br />
        {connected ? (
          <span style={{ color: "green" }}>Connected</span>
        ) : (
          <span style={{ color: "orange" }}>Searching{ellipsis}</span>
        )}
      </div>
      {connected ? <CodeExecutor pythonCode={pythonCode} /> : null}
    </>
  );
}

function App() {
  useIgnoreBenignReactBlocklyErrors();
  const [workspace, setWorkspace] = useState(null);
  const [showPythonCode, setShowPythonCode] = useState(false);

  const handleClosePythonCode = () => setShowPythonCode(false);
  const pythonCode = workspace ? workspace.pythonCode : "";

  return (
    <div className="App">
      <div className="menu">
        <img src={logo} className="logo spaced" alt="logo"></img>
        <ConnectionMenu pythonCode={pythonCode} />
        <Button
          onClick={() => setShowPythonCode(true)}
          className="spaced"
          style={{ marginLeft: "auto" }}
          variant="outline-secondary"
        >
          Show Python
        </Button>
        <Modal show={showPythonCode} onHide={handleClosePythonCode}>
          <Modal.Header closeButton>
            <Modal.Title>Generated Python Code</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <ReactSyntaxHighlighter language="python">
              {pythonCode}
            </ReactSyntaxHighlighter>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleClosePythonCode}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      </div>

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
        initialXml={workspace ? workspace.xml : WORKSPACE_XML}
        wrapperDivClassName="fill-height"
        workspaceDidChange={(workspace) => {
          setWorkspace({
            xml: blockly.Xml.domToText(blockly.Xml.workspaceToDom(workspace)),
            pythonCode:
              "import roo_blocks\n\n" +
              blocklyPython.workspaceToCode(workspace),
          });
        }}
      />
    </div>
  );
}

export default App;
