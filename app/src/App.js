import React, { useState, useEffect } from "react";

import ReactBlockly from "react-blockly";

import { TOOLBOX_CATEGORIES, WORKSPACE_XML } from "./blockly";
import Button from "react-bootstrap/Button";
import ProgressBar from "react-bootstrap/ProgressBar";

import "./App.css";
import logo from "./logo.png";

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

function CodeExecutor() {
  const [uploaded, setUploaded] = useState(null);
  return (
    <div>
      <Button
        variant="success"
        disabled={uploaded !== null}
        onClick={() => {
          setUploaded(50);
        }}
      >
        Play
      </Button>
      {uploaded !== null ? (
        <ProgressBar
          className="spaced"
          style={{ width: 200, marginTop: 10 }}
          animated
          now={uploaded}
          label={`Uploading...`}
        />
      ) : null}
    </div>
  );
}

function ConnectionMenu() {
  const [connected, setConnected] = useState(false);
  const [ellipsis, setEllipsis] = useState("");

  useEffect(() => {
    window.ipcRenderer.on("connected", (_, msg) => {
      setConnected(msg);
    });
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
        Bluetooth <br />
        Connection:
        <br />
        {connected ? (
          <span style={{ color: "green" }}>Connected</span>
        ) : (
          <span style={{ color: "orange" }}>Searching{ellipsis}</span>
        )}
      </div>
      {connected ? <CodeExecutor /> : null}
    </>
  );
}

function App() {
  useIgnoreBenignReactBlocklyErrors();

  return (
    <div className="App">
      <div className="menu">
        <img src={logo} className="logo spaced" alt="logo"></img>
        <ConnectionMenu />
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
        initialXml={WORKSPACE_XML}
        wrapperDivClassName="fill-height"
      />
    </div>
  );
}

export default App;
