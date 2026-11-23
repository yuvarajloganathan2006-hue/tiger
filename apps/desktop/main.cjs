const { app, BrowserWindow, dialog } = require("electron");
const { spawn } = require("node:child_process");
const path = require("node:path");
const http = require("node:http");
const os = require("node:os");
const fs = require("node:fs");
const crypto = require("node:crypto");

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

function getLanIPv4() {
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries || []) {
      if (entry.family === "IPv4" && !entry.internal && !entry.address.startsWith("169.254.")) {
        return entry.address;
      }
    }
  }
  return "YOUR-PC-LAN-IP";
}

async function chooseMobilePairing() {
  const choice = await dialog.showMessageBox({
    type: "question",
    title: "Connect TIGER Android companion?",
    message: "Do you want to allow your Android phone to connect to this PC over your private Wi-Fi?",
    detail: "Choose Desktop only for the safest default. Android pairing requires a trusted private network and uses a random session token over local HTTP.",
    buttons: ["Desktop only", "Enable Android pairing"],
    defaultId: 0,
    cancelId: 0,
    noLink: true,
  });
  if (choice.response !== 1) return { host: "127.0.0.1", token: "" };

  const token = crypto.randomBytes(32).toString("hex");
  const tokenPath = path.join(app.getPath("userData"), "mobile-access-token.txt");
  fs.mkdirSync(path.dirname(tokenPath), { recursive: true });
  fs.writeFileSync(tokenPath, token, { mode: 0o600 });
  const ip = getLanIPv4();
  await dialog.showMessageBox({
    type: "info",
    title: "TIGER Android pairing",
    message: "Enter these details in the Android app under Device connection.",
    detail: "Core URL: http://" + ip + ":8765\nPairing token: " + token + "\n\nKeep this token private. Use trusted private Wi-Fi only. Windows Firewall may ask you to allow TIGER on Private networks.",
    buttons: ["I have copied the details"],
  });
  return { host: "0.0.0.0", token };
}

function startCore(pairing) {
  const executable = path.join(process.resourcesPath, "bin", "tiger-core.exe");
  coreProcess = spawn(executable, [], {
    windowsHide: true,
    stdio: "ignore",
    env: {
      ...process.env,
      TIGER_HOST: pairing.host,
      TIGER_PORT: "8765",
      TIGER_API_TOKEN: pairing.token,
    },
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
  const pairing = await chooseMobilePairing();
  startCore(pairing);
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
