const { app, BrowserWindow } = require("electron");

const path = require("path");
const url = require("url");
const ipcMain = require("electron").ipcMain;
const fs = require("fs");
const net = require("net");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      preload: path.join(__dirname, "./preload.js"),
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

  const ipcServer = net.createServer((client) => {
    let buffer = [];

    client.on("data", (chunk) => {
      const chunkStr = chunk.toString();
      buffer.push(chunkStr);
      const NEWLINE_PATTERN = /\r?\n$/;
      if (chunkStr.match(NEWLINE_PATTERN)) {
        [rawMessage, ...buffer] = buffer.join("").split(NEWLINE_PATTERN);

        const message = JSON.parse(rawMessage);
        console.log("relaying ipc from python to react", message);
        mainWindow.webContents.send(message.type, message.data);
      }
    });

    ipcMain.on("bluetooth", (_, chunk) => {
      console.log("relaying ipc from react to python", chunk);
      client.write(chunk + "\n");
    });

    client.on("end", (socket, id) => {
      throw new Error(`socket ${socket} with id ${id} died`);
    });
  });

  ipcServer.listen(process.env.IPC_SOCKET);
  ipcServer.on("error", (e) => {
    if (e.code === "EADDRINUSE") {
      fs.unlinkSync(process.env.IPC_SOCKET);
      ipcServer.listen(process.env.IPC_SOCKET);
    }
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
