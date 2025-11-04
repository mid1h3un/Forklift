const { app, BrowserWindow } = require("electron");
const path = require("path");
const url = require("url");

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,   // safer
      contextIsolation: true,
    },
  });

  // Load Vite build (dist/index.html)
  win.loadURL(
    url.format({
      pathname: path.join(__dirname, "dist", "index.html"),
      protocol: "file:",
      slashes: true,
    })
  );

  // Debug: open DevTools if you want
  // win.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
