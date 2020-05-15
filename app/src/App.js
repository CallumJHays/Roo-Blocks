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

function CodeExecutor({ augmentedPythonCode }) {
  const [uploading, setUploading] = useState(null); // null == started uploading
  const [executing, setExecuting] = useState(false);
  const [delay, setDelay] = useState(1.0);

  useEffect(() => {
    setUploading(null);
    setExecuting(false);
    sendIpcMsg("stop");
  }, [augmentedPythonCode]);

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
            // if not uploaded yet since code change
            if (uploading === null) {
              sendIpcMsg("upload-and-play", augmentedPythonCode);
              setUploading(true);
            } else {
              sendIpcMsg("play");
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
            setExecuting(false);
          }}
        >
          ⏸
        </Button>
        <Button
          variant="outline-danger"
          disabled={uploading !== false}
          style={{ cursor: uploading === false ? "pointer" : "not-allowed" }}
          onClick={() => {
            sendIpcMsg("restart");
            setExecuting(true);
          }}
        >
          ↺
        </Button>
      </ButtonGroup>
      <div className="spaced" style={{ width: 70, display: "inline-block" }}>
        Delay (s) <br />
        <FormControl
          type="number"
          step={0.1}
          min={0.1}
          onKeyDown={() => false}
          value={delay} // todo: limit the delay to being positive
          onChange={(e) => {
            const delay = e.target.valueAsNumber;
            if (delay > 0) {
              setDelay(delay);
              sendIpcMsg("set-delay", delay);
            }
          }}
        />
      </div>
    </div>
  );
}

function ConnectionMenu({ augmentedPythonCode }) {
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
      {connected ? (
        <CodeExecutor augmentedPythonCode={augmentedPythonCode} />
      ) : null}
    </>
  );
}

function App() {
  useIgnoreBenignReactBlocklyErrors();
  const [codeState, setCodeState] = useState(null);
  const [showPythonCode, setShowPythonCode] = useState(false);

  const handleClosePythonCode = () => setShowPythonCode(false);
  const pythonCode = codeState ? codeState.pythonCode : "";

  // kinda effect-ful, but should be fine
  useIpcSubscription(
    "highlight",
    (block_id) => {
      if (codeState) {
        codeState.workspace.highlightBlock(block_id);
      }
    },
    [codeState]
  );

  return (
    <div className="App">
      <div className="menu">
        <img src={logo} className="logo spaced" alt="logo"></img>
        <ConnectionMenu
          augmentedPythonCode={codeState ? codeState.augmentedPythonCode : null}
        />
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
        initialXml={codeState ? codeState.xml : WORKSPACE_XML}
        wrapperDivClassName="fill-height"
        workspaceDidChange={async (workspace) => {
          const xml = blockly.Xml.domToText(
            blockly.Xml.workspaceToDom(workspace)
          );
          const pythonCode =
            "import roo_blocks\n\n" +
            // eslint-disable-next-line
            blocklyPython.workspaceToCode(workspace).replace(/\ \ /g, "    ");
          if (pythonCode !== (codeState && codeState.pythonCode)) {
            blocklyPython.STATEMENT_SUFFIX = "pause(%1)\n";
            const augmentedPythonCode =
              "import roo_blocks\n\ndef program(pause):\n  " +
              blocklyPython.workspaceToCode(workspace).replace(/\n/g, "\n  ");
            blocklyPython.STATEMENT_SUFFIX = null;

            workspace.highlightBlock(null);

            setCodeState({
              workspace,
              xml,
              pythonCode,
              augmentedPythonCode,
            });
            try {
              const formatted = await formatPythonCode(pythonCode);
              setCodeState((codeState) => ({
                ...codeState,
                workspace,
                xml,
                pythonCode: formatted,
              }));
            } catch {}
          } else {
            setCodeState((codeState) => ({ ...codeState, workspace, xml }));
          }
        }}
      />
    </div>
  );
}

export default App;
