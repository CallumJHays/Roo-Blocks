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
import ButtonGroup from "react-bootstrap/ButtonGroup";
import Modal from "react-bootstrap/Modal";
import FormControl from "react-bootstrap/FormControl";
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

async function formatPythonCode(code) {
  window.ipcRenderer.send(
    "python",
    JSON.stringify({
      type: "format",
      data: code,
    })
  );
  let handleFormatted;
  const formatted = await new Promise((resolve) => {
    handleFormatted = (_, msg) => resolve(msg);
    window.ipcRenderer.on("formatted", handleFormatted);
  });
  window.ipcRenderer.removeListener("formatted", handleFormatted);
  return formatted;
}

function useIpcSubscription(channel, handler, deps = []) {
  useEffect(() => {
    const handle = (_, msg) => {
      handler(msg);
    };
    window.ipcRenderer.on(channel, handle);
    return () => window.ipcRenderer.removeListener(channel, handle);
    // eslint-disable-next-line
  }, deps);
}

function sendIpcMsg(type, data = null) {
  window.ipcRenderer.send("python", JSON.stringify({ type, data }));
}

function CodeExecutor({ workspace }) {
  const [uploading, setUploading] = useState(null);
  const [executing, setExecuting] = useState(false);
  const [workspaceCode, setWorkspaceCode] = useState(null);
  const [delay, setDelay] = useState(1.0);

  useIpcSubscription("upload-progress", (progress) => {
    if (progress === 100) {
      setUploading(false);
      setExecuting(true);
    }
  });

  return (
    <div>
      <ButtonGroup>
        <Button
          variant="outline-success"
          disabled={uploading || executing}
          style={{
            cursor: executing ? "not-allowed" : uploading ? "wait" : "pointer",
          }}
          onClick={() => {
            blocklyPython.STATEMENT_SUFFIX = "await pause(%1)\n";
            const newWorkspaceCode = blocklyPython.workspaceToCode(workspace);
            blocklyPython.STATEMENT_SUFFIX = null;

            if (newWorkspaceCode !== workspaceCode) {
              sendIpcMsg(
                "upload-and-play",
                "import roo_blocks\n\nasync def program(pause):\n  " +
                  newWorkspaceCode.replace(/\n/g, "\n  ")
              );
              setWorkspaceCode(newWorkspaceCode);
              setUploading(true);
            } else {
              window.ipcRenderer.send(
                "python",
                JSON.stringify({ type: "play" })
              );
              setExecuting(true);
            }
          }}
        >
          {uploading ? "Uploading" : "▶"}
        </Button>
        <Button
          variant="outline-warning"
          disabled={!executing}
          style={{ cursor: executing ? "pointer" : "not-allowed" }}
          onClick={() => {
            sendIpcMsg("pause");
          }}
        >
          ⏸
        </Button>
        <Button
          variant="outline-danger"
          disabled={!executing}
          style={{ cursor: executing ? "pointer" : "not-allowed" }}
          onClick={() => {
            sendIpcMsg("restart");
          }}
        >
          ↺
        </Button>
      </ButtonGroup>
      <div className="spaced" style={{ width: 70, display: "inline-block" }}>
        Delay (s) <br />
        <FormControl
          type="number"
          value={delay} // todo: limit the delay to being positive
          onChange={(e) => {
            const delay = e.target.valueAsNumber;
            setDelay(delay);
            sendIpcMsg("set-delay", delay);
          }}
        />
      </div>
    </div>
  );
}

function ConnectionMenu({ workspace }) {
  const [connected, setConnected] = useState(false);
  const [ellipsis, setEllipsis] = useState("");

  useIpcSubscription("connected", setConnected);

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
        Bluetooth:
        <br />
        {connected ? (
          <span style={{ color: "green" }}>Connected</span>
        ) : (
          <span style={{ color: "orange" }}>Searching{ellipsis}</span>
        )}
      </div>
      {connected ? <CodeExecutor workspace={workspace} /> : null}
    </>
  );
}

function App() {
  useIgnoreBenignReactBlocklyErrors();
  const [workspace, setWorkspace] = useState(null);
  const [showPythonCode, setShowPythonCode] = useState(false);

  const handleClosePythonCode = () => setShowPythonCode(false);
  const pythonCode = workspace ? workspace.pythonCode : "";

  // kinda effect-ful, but should be fine
  useIpcSubscription(
    "highlight",
    (block_id) => {
      if (workspace) {
        workspace.workspace.highlightBlock(block_id);
      }
    },
    [workspace]
  );

  return (
    <div className="App">
      <div className="menu">
        <img src={logo} className="logo spaced" alt="logo"></img>
        <ConnectionMenu pythonCode={pythonCode} />
        <Button
          onClick={() => setShowPythonCode(true)}
          className="spaced"
          variant="outline-secondary"
        >
          Show Python
        </Button>
        <Modal size="lg" show={showPythonCode} onHide={handleClosePythonCode}>
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
        workspaceDidChange={async (workspace) => {
          const xml = blockly.Xml.domToText(
            blockly.Xml.workspaceToDom(workspace)
          );
          const pythonCode =
            "import roo_blocks\n\n" + blocklyPython.workspaceToCode(workspace);
          setWorkspace({ workspace, xml, pythonCode });
          try {
            const formatted = await formatPythonCode(pythonCode);
            setWorkspace({ workspace, xml, pythonCode: formatted });
          } catch {}
        }}
      />
    </div>
  );
}

export default App;
