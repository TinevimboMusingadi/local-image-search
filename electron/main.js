/**
 * Electron main process for Local Image Search.
 * Launches Python backend and displays the frontend.
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow = null;
let pythonProcess = null;

const PORT = 8000;
const API_URL = `http://127.0.0.1:${PORT}`;

function getBackendPath() {
  if (app.isPackaged) {
    const exePath = path.join(process.resourcesPath, 'python_backend', 'local-image-search-api.exe');
    const fs = require('fs');
    if (fs.existsSync(exePath)) return exePath;
    return null;
  }
  const pyPath = path.join(__dirname, '..', 'env', 'Scripts', 'python.exe');
  const fs = require('fs');
  return fs.existsSync(pyPath) ? pyPath : null;
}

function getFrontendPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'frontend', 'index.html');
  }
  return path.join(__dirname, '..', 'frontend-vite', 'dist', 'index.html');
}

function isBackendExe() {
  const backendPath = getBackendPath();
  return backendPath && backendPath.endsWith('.exe');
}

function spawnBackend() {
  return new Promise((resolve, reject) => {
    const backendPath = getBackendPath();
    if (!backendPath) {
      console.error('Backend not found. Run with venv or build Python executable.');
      setTimeout(resolve, 1000);
      return;
    }

    let proc;

    if (isBackendExe()) {
      proc = spawn(backendPath, ['--port', String(PORT)], {
        cwd: path.dirname(backendPath),
        env: { ...process.env },
      });
    } else {
      proc = spawn(backendPath, ['-m', 'uvicorn', 'api:app', '--host', '127.0.0.1', '--port', String(PORT)], {
        cwd: path.join(__dirname, '..'),
        env: { ...process.env },
      });
    }

    pythonProcess = proc;

    proc.stdout.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg.includes('Uvicorn running') || msg.includes('Application startup complete')) {
        resolve();
      }
    });

    proc.stderr.on('data', (data) => {
      console.error('Backend stderr:', data.toString());
    });

    proc.on('error', (err) => {
      console.error('Backend spawn error:', err);
      reject(err);
    });

    proc.on('exit', (code) => {
      pythonProcess = null;
      if (code !== 0 && code !== null) {
        console.error('Backend exited with code:', code);
      }
    });

    setTimeout(() => resolve(), 3000);
  });
}

function waitForBackend(retries = 30) {
  const http = require('http');
  return new Promise((resolve) => {
    const check = (attempt) => {
      const req = http.get(`${API_URL}/health`, (res) => {
        if (res.statusCode === 200) resolve();
        else if (attempt >= retries) resolve();
        else setTimeout(() => check(attempt + 1), 500);
      });
      req.on('error', () => {
        if (attempt >= retries) resolve();
        else setTimeout(() => check(attempt + 1), 500);
      });
      req.setTimeout(2000, () => {
        req.destroy();
        if (attempt >= retries) resolve();
        else setTimeout(() => check(attempt + 1), 500);
      });
    };
    check(0);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const frontendPath = getFrontendPath();
  const url = `file://${frontendPath.replace(/\\/g, '/')}`;

  mainWindow.loadURL(url).catch((err) => {
    console.error('Load error:', err);
    mainWindow.loadURL(API_URL);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    await spawnBackend();
    await waitForBackend();
    createWindow();
  } catch (err) {
    console.error('Failed to start backend:', err);
    createWindow();
  }
});

app.on('window-all-closed', () => {
  if (pythonProcess) {
    pythonProcess.kill();
    pythonProcess = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (pythonProcess) {
    pythonProcess.kill();
    pythonProcess = null;
  }
});
