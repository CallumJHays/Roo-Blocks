const { app, BrowserWindow } = require("electron");

const path = require("path");
const url = require("url");
// const ipc = require('node-ipc');
// const { exec } = require("child_process");

// ipc.serve('/tmp/roo-blocks.sock', () => {
//   ipc.server.on('message', (data, socket) => {
//     console.log('got message from client!', data, socket);
//   })
//   ipc.server.on('socket.disconnected', (socket, id) => {
//     throw new Error(`socket ${socket} with id ${id} died`);
//   });
//   exec('python ./src/bluetooth.py')
// })

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
    },
  });
  // mainWindow.maximize();

  mainWindow.loadURL(
    process.env.ELECTRON_START_URL ||
      url.format({
        pathname: path.join(__dirname, "/../public/index.html"),
        protocol: "file:",
        slashes: true,
      })
  );

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// ipc.server.start();