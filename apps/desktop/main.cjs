const { app, BrowserWindow, dialog } = require("electron");
const { spawn } = require("node:child_process");
const path = require("node:path");
const http = require("node:http");

let coreProcess;

function healthCheck() {
  return new Promise((resolve) => {
    const request = http.get("http://127.0.0.1:8765/health", (response) => {
      response.resume();
      resolve(response.statusCode === 200);
    });
    request.setTimeout(1200, () => { request.destroy(); resolve(false); });
    request.on("error", () => resolve(false));
  });
}

async function waitForCore(timeoutMs = 45000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await healthCheck()) return true;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

function startCore() {
  const executable = path.join(process.resourcesPath, "bin", "tiger-core.exe");
  coreProcess = spawn(executable, [], {
    windowsHide: true,
    stdio: "ignore",
    env: { ...process.env, TIGER_HOST: "127.0.0.1", TIGER_PORT: "8765" },
  });
  coreProcess.on("error", (error) => {
    dialog.showErrorBox("TIGER Core could not start", error.message);
  });
}

async function createWindow() {
  const ready = await waitForCore();
  if (!ready) {
    await dialog.showMessageBox({
      type: "error",
      title: "TIGER Core unavailable",
      message: "TIGER could not start its local Python service.",
      detail: "Install and start Ollama, then restart TIGER. The app never switches to a cloud AI provider.",
    });
    app.quit();
    return;
  }
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 900,
    minHeight: 650,
    title: "TIGER Companion",
    backgroundColor: "#0b1020",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  await window.loadFile(path.join(process.resourcesPath, "web-dist", "index.html"));
}

app.whenReady().then(async () => {
  startCore();
  await createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow();
  });
});

app.on("before-quit", () => {
  if (coreProcess && !coreProcess.killed) coreProcess.kill();
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
