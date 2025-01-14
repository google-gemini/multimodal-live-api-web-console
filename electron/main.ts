import { app, BrowserWindow, ipcMain, desktopCapturer, WebContents, clipboard, nativeImage } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { keyboard, Key } from '@nut-tree-fork/nut-js';

// Set environment variables for the packaged app
if (!app.isPackaged) {
  require('dotenv-flow').config();
} else {
  require('dotenv').config({ path: path.join(process.resourcesPath, '.env') });
}

keyboard.config.autoDelayMs = 0;

let mainWindow: BrowserWindow | null = null;
let overlayWindow: BrowserWindow | null = null;
let controlWindow: BrowserWindow | null = null;

function logToFile(message: string) {
  const logPath = app.getPath('userData') + '/app.log';
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logPath, `${timestamp}: ${message}\n`);
}

async function createMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    return mainWindow;  // Return existing window if it's still valid
  }

  const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';
  logToFile(`Starting app in ${isDev ? 'development' : 'production'} mode`);

  // Resolve icon path differently for dev mode
  let iconPath;
  if (isDev) {
    // In development, try multiple possible locations
    iconPath = path.resolve(__dirname, '..', 'icons', process.platform === 'darwin' ? 'icon.icns' : 'icon.ico');
    logToFile(`Using dev icon path: ${iconPath}`);
    if (!fs.existsSync(iconPath)) {
      logToFile('Warning: Could not find icon file in development mode');
    }
  } else {
    // Production path resolution
    iconPath = path.join(app.getAppPath(), 'public', 'icons', process.platform === 'darwin' ? 'icon.icns' : 'icon.ico');
    if (!fs.existsSync(iconPath)) {
      logToFile('Warning: Could not find icon file in expected location');
    }
  }
  
  logToFile(`Using icon path: ${iconPath}`);
  try {
    const iconDir = path.dirname(iconPath);
    if (!fs.existsSync(iconDir)) {
      logToFile(`Icon directory doesn't exist: ${iconDir}`);
    } else {
      logToFile(`Icon directory contents: ${fs.readdirSync(iconDir)}`);
    }
  } catch (error) {
    logToFile(`Error checking icon path: ${error}`);
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: true,
    show: false,
    ...(fs.existsSync(iconPath) ? { icon: iconPath } : {}),
    // For macOS, set the app icon explicitly
    ...(process.platform === 'darwin' ? {
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: 10, y: 10 }
    } : {}),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,  // Temporarily disable for debugging
      devTools: true
    },
  });

  // Remove DevTools opening
  // mainWindow.webContents.openDevTools({ mode: 'detach' });

  // Remove menu from the window
  mainWindow.setMenu(null);

  // Add IPC handler for closing main window
  ipcMain.on('close-main-window', () => {
    if (mainWindow) {
      mainWindow.close();
    }
  });

  // Set dock icon explicitly for macOS
  if (process.platform === 'darwin' && fs.existsSync(iconPath)) {
    try {
      const dockIcon = nativeImage.createFromPath(iconPath);
      if (!dockIcon.isEmpty()) {
        app.dock.setIcon(dockIcon);
      } else {
        logToFile('Warning: Dock icon image is empty');
      }
    } catch (error) {
      logToFile(`Error setting dock icon: ${error}`);
    }
  }

  // Set permissions for media access
  if (mainWindow) {
    mainWindow.webContents.session.setPermissionRequestHandler((
      webContents: WebContents,
      permission: string,
      callback: (granted: boolean) => void
    ) => {
      const allowedPermissions = ['media', 'display-capture', 'screen', 'mediaKeySystem'];
      if (allowedPermissions.includes(permission)) {
        callback(true);
      } else {
        callback(false);
      }
    });

    // Enable screen capture
    mainWindow.webContents.session.setDisplayMediaRequestHandler((request, callback) => {
      mainWindow?.webContents.send('show-screen-picker');
      callback({}); // Let the renderer handle source selection
    });

    let loadUrl: string;
    if (isDev) {
      loadUrl = 'http://localhost:3000';
    } else {
      // In production, use the app.getAppPath() to get the correct base path
      const appPath = app.getAppPath();
      // Remove .asar from the path to access unpacked resources
      const basePath = appPath.replace('.asar', '.asar.unpacked');
      const indexPath = path.join(basePath, 'build', 'index.html');
      
      // Log more details about the paths
      logToFile(`Base path: ${basePath}`);
      logToFile(`Index path: ${indexPath}`);
      logToFile(`Directory contents of build:`);
      try {
        const buildContents = fs.readdirSync(path.join(basePath, 'build'));
        logToFile(JSON.stringify(buildContents, null, 2));
      } catch (error) {
        logToFile(`Error reading build directory: ${error}`);
      }
      
      loadUrl = `file://${indexPath}`;
    }
    
    logToFile(`App path: ${app.getAppPath()}`);
    logToFile(`Attempting to load URL: ${loadUrl}`);
    logToFile(`Build path exists: ${fs.existsSync(loadUrl.replace('file://', ''))}`);

    try {
      await mainWindow.loadURL(loadUrl);
      logToFile('Successfully loaded the window URL');
    } catch (error) {
      logToFile(`Error loading URL: ${error}`);
    }

    // Log when the page finishes loading
    mainWindow.webContents.on('did-finish-load', () => {
      logToFile('Page finished loading');
    });

    // Log any errors that occur during page load
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      logToFile(`Failed to load: ${errorDescription} (${errorCode})`);
    });

    // Add console logging from the renderer process
    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
      logToFile(`Console [${level}]: ${message} (${sourceId}:${line})`);
    });
  }
  return mainWindow;
}

async function createControlWindow() {
  if (controlWindow && !controlWindow.isDestroyed()) {
    return controlWindow;
  }

  const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';
  controlWindow = new BrowserWindow({
    width: 250,
    height: 100,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: true,
    },
  });

  // Remove DevTools opening
  // controlWindow.webContents.openDevTools({ mode: 'detach' });

  // Ensure it stays on top even when other windows request always on top
  controlWindow.setAlwaysOnTop(true, 'screen-saver');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          html, body {
            margin: 0;
            padding: 0;
            background: transparent;
            color: white;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            height: 100%;
            overflow: hidden;
            -webkit-app-region: drag;
            isolation: isolate;
          }
          body {
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(5px);
            background: transparent;
          }
          .window-content {
            position: relative;
            background: rgba(23, 23, 23, 0.6);
            width: 100%;
            height: 100%;
            transition: background-color 0.3s ease;
            /* Clear any potential background content */
            -webkit-backface-visibility: hidden;
            backface-visibility: hidden;
            transform: translateZ(0);
            isolation: isolate;
            z-index: 1;
          }
          .window-content:hover {
            background: rgba(23, 23, 23, 0.95);
          }
          .control-tray {
            position: relative;
            width: 100%;
            padding: 8px;
            box-sizing: border-box;
            z-index: 2;
            background: transparent;
          }
          .control-tray-container {
            position: relative;
            display: flex;
            flex-direction: column;
            gap: 8px;
            z-index: 3;
          }
          .actions-nav {
            position: relative;
            display: flex;
            gap: 4px;
            justify-content: center;
            align-items: center;
            z-index: 4;
            background: transparent;
          }
          .carousel-container {
            position: relative;
            display: flex;
            align-items: center;
            gap: 4px;
            width: 100%;
            padding: 0;
            z-index: 4;
            background: transparent;
          }
          .carousel-content {
            position: relative;
            flex: 1;
            text-align: center;
            justify-content: center;
            display: flex;
            align-items: center;
            z-index: 5;
            background: transparent;
            isolation: isolate;
            transform: translateZ(0);
          }
          .carousel-slide {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 6;
            background: transparent;
            transform: translateZ(0);
            -webkit-font-smoothing: antialiased;
          }
          .carousel-text {
            position: relative;
            color: white;
            font-size: 14px;
            font-weight: 500;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            padding: 0 4px;
            z-index: 6;
            opacity: 0.9;
            background: transparent;
            mix-blend-mode: normal;
            transform: translateZ(0);
            -webkit-font-smoothing: antialiased;
            will-change: contents;
            text-rendering: optimizeLegibility;
          }
          button, .action-button, .carousel-button {
            -webkit-app-region: no-drag;
          }
          .close-button {
            position: absolute;
            top: 8px;
            right: 8px;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: none;
            border: none;
            color: rgba(255, 255, 255, 0.8);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            font-size: 18px;
            -webkit-app-region: no-drag;
            transition: all 0.2s ease;
            opacity: 0.6;
            z-index: 1000;
            pointer-events: auto;
            transform: translateZ(0);
          }
          .window-content:hover .close-button {
            opacity: 1;
          }
          .close-button:hover {
            background-color: rgba(255, 255, 255, 0.1);
            color: white;
          }
          .close-button .material-symbols-outlined {
            font-size: 16px;
          }
          .material-symbols-outlined {
            font-family: 'Material Symbols Outlined';
            font-weight: normal;
            font-style: normal;
            font-size: 20px;
            line-height: 1;
            letter-spacing: normal;
            text-transform: none;
            display: inline-block;
            white-space: nowrap;
            word-wrap: normal;
            direction: ltr;
            -webkit-font-smoothing: antialiased;
          }
          .filled {
            font-variation-settings: 'FILL' 1;
          }
          .carousel-button {
            position: relative;
            width: 24px;
            height: 24px;
            background: transparent;
            border: none;
            color: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background-color 0.2s;
            border-radius: 4px;
            padding: 0;
          }
          .carousel-button:hover {
            background-color: rgba(255, 255, 255, 0.1);
          }
          .window-content:hover .carousel-text {
            opacity: 1;
          }
          .message-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.2s ease-in-out;
            z-index: 1000;
          }
          .message-content {
            background: rgba(255, 255, 255, 0.1);
            padding: 8px 12px;
            border-radius: 4px;
            color: white;
            font-size: 12px;
            text-align: center;
            max-width: 90%;
            backdrop-filter: blur(8px);
          }
          .message-overlay.visible {
            opacity: 1;
            pointer-events: auto;
          }
          .key-button {
            position: absolute;
            top: 8px;
            left: 8px;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: none;
            border: none;
            color: rgba(255, 255, 255, 0.8);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            font-size: 18px;
            -webkit-app-region: no-drag;
            transition: all 0.2s ease;
            opacity: 0.6;
            z-index: 1000;
            pointer-events: auto;
            transform: translateZ(0);
          }
          .window-content:hover .key-button {
            opacity: 1;
          }
          .key-button:hover {
            background-color: rgba(255, 255, 255, 0.1);
            color: white;
          }
          .key-button .material-symbols-outlined {
            font-size: 16px;
          }
          .toast {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(244, 67, 54, 0.95);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            opacity: 0;
            transition: all 0.3s ease;
            pointer-events: none;
            z-index: 2000;
            white-space: nowrap;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            text-align: center;
            min-width: 200px;
          }
          
          .toast.visible {
            opacity: 1;
          }

          body {
            margin: 0;
            padding: 0;
            overflow: hidden;
            background: transparent;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            position: relative;
          }

          .error-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.85);
            display: flex;
            justify-content: center;
            align-items: center;
            opacity: 0;
            transition: opacity 0.3s ease;
            pointer-events: none;
            z-index: 2000;
          }

          .error-overlay.visible {
            opacity: 1;
          }

          .error-message {
            background: #f44336;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            text-align: center;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          }

          .action-button {
            position: relative;
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            padding: 4px;
            border-radius: 50%;
            transition: all 0.2s ease-in-out;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            z-index: 5;
            mix-blend-mode: normal;
            -webkit-font-smoothing: antialiased;
          }
          .action-button:not(.disabled):hover {
            background-color: rgba(255, 255, 255, 0.1);
          }
          .actions-nav.disabled .action-button:not(.connect-button) {
            opacity: 0.5;
            cursor: not-allowed;
            pointer-events: none;
          }
          .carousel-slide {
            position: relative;
            z-index: 6;
            background: transparent;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            transform: translateZ(0);
            -webkit-font-smoothing: antialiased;
          }
          /* Force hardware acceleration and prevent ghosting */
          * {
            transform: translate3d(0, 0, 0);
            backface-visibility: hidden;
            perspective: 1000;
            transform-style: preserve-3d;
          }

          .error-toast {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(244, 67, 54, 0.95);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            opacity: 0;
            transition: opacity 0.3s ease;
            pointer-events: none;
            z-index: 2000;
            white-space: nowrap;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            text-align: center;
            min-width: 200px;
            backdrop-filter: blur(8px);
          }
          
          .error-toast.visible {
            opacity: 1;
          }
        </style>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
      </head>
      <body>
        <div class="window-content">
          <button class="key-button" title="Settings">
            <span class="material-symbols-outlined">settings</span>
          </button>

          <button class="close-button" title="Close window">
            <span class="material-symbols-outlined">close</span>
          </button>

          <div class="message-overlay">
            <div class="message-content">
              Please select a screen to share from the main window
            </div>
          </div>

          <section class="control-tray">
            <div class="control-tray-container">
              <nav class="actions-nav disabled">
                <button class="action-button mic-button">
                  <span class="material-symbols-outlined filled">mic</span>
                </button>

                <button class="action-button screen-button" style="display: none;">
                  <span class="material-symbols-outlined">present_to_all</span>
                </button>

                <button class="action-button webcam-button">
                  <span class="material-symbols-outlined">videocam</span>
                </button>

                <button class="action-button connect-button">
                  <span class="material-symbols-outlined">play_arrow</span>
                </button>
              </nav>

              <div class="carousel-container">
                <button class="carousel-button prev-button">
                  <span class="material-symbols-outlined">chevron_left</span>
                </button>

                <div class="carousel-content">
                  <div id="carousel-text-container" class="carousel-slide">
                    <span id="mode-text" class="carousel-text">Default Mode</span>
                  </div>
                </div>

                <button class="carousel-button next-button">
                  <span class="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </div>
          </section>
        </div>

        <div class="error-overlay">
          <div class="error-message">API key is required to connect</div>
        </div>

        <div class="error-toast"></div>

        <script>
          const { ipcRenderer } = require('electron');
          
          const micButton = document.querySelector('.mic-button');
          const screenButton = document.querySelector('.screen-button');
          const webcamButton = document.querySelector('.webcam-button');
          const connectButton = document.querySelector('.connect-button');
          const actionsNav = document.querySelector('.actions-nav');
          const messageOverlay = document.querySelector('.message-overlay');
          const closeButton = document.querySelector('.close-button');
          const prevButton = document.querySelector('.prev-button');
          const nextButton = document.querySelector('.next-button');
          const carouselText = document.querySelector('.carousel-text');
          const settingsButton = document.querySelector('.key-button');
          const errorOverlay = document.querySelector('.error-overlay');
          const errorMessage = errorOverlay.querySelector('.error-message');
          
          let isMuted = false;
          let isScreenSharing = false;
          let isWebcamOn = false;
          let isConnected = false;
          let isConnecting = false;

          // Carousel handlers
          prevButton.addEventListener('click', () => {
            if (isConnected) {
              // If connected, disconnect first
              isConnected = false;
              isConnecting = false;
              connectButton.querySelector('span').textContent = 'play_arrow';
              connectButton.querySelector('span').classList.remove('filled');
              actionsNav.classList.add('disabled');
              // Send disconnect action
              ipcRenderer.send('control-action', { type: 'connect', value: false });
              // Then change carousel
              ipcRenderer.send('carousel-action', 'prev');
            } else {
              ipcRenderer.send('carousel-action', 'prev');
            }
          });

          nextButton.addEventListener('click', () => {
            if (isConnected) {
              // If connected, disconnect first
              isConnected = false;
              isConnecting = false;
              connectButton.querySelector('span').textContent = 'play_arrow';
              connectButton.querySelector('span').classList.remove('filled');
              actionsNav.classList.add('disabled');
              // Send disconnect action
              ipcRenderer.send('control-action', { type: 'connect', value: false });
              // Then change carousel
              ipcRenderer.send('carousel-action', 'next');
            } else {
              ipcRenderer.send('carousel-action', 'next');
            }
          });

          // Handle carousel updates
          ipcRenderer.on('update-carousel', (event, { modeName, requiresDisplay }) => {
            const modeText = document.getElementById('mode-text');
            const container = document.getElementById('carousel-text-container');
            
            // Create a new text element
            const newText = document.createElement('span');
            newText.className = 'carousel-text';
            newText.textContent = modeName;
            
            // Fade out the old text
            modeText.style.opacity = '0';
            
            // After fade out, update the text
            setTimeout(() => {
              modeText.textContent = modeName;
              modeText.style.opacity = '0.9';
            }, 85);
            
            screenButton.style.display = requiresDisplay ? '' : 'none';
            webcamButton.style.display = requiresDisplay ? '' : 'none';
          });

          micButton.addEventListener('click', () => {
            if (!isConnected) return;
            isMuted = !isMuted;
            micButton.querySelector('span').textContent = isMuted ? 'mic_off' : 'mic';
            ipcRenderer.send('control-action', { type: 'mic', value: !isMuted });
          });

          screenButton.addEventListener('click', () => {
            if (!isConnected) return;
            if (isScreenSharing) {
              isScreenSharing = false;
              screenButton.querySelector('span').textContent = 'present_to_all';
              screenButton.querySelector('span').classList.remove('filled');
              ipcRenderer.send('control-action', { type: 'screen', value: false });
              messageOverlay.classList.remove('visible');
            } else {
              ipcRenderer.send('control-action', { type: 'screen', value: true });
              messageOverlay.classList.add('visible');
            }
          });

          webcamButton.addEventListener('click', () => {
            if (!isConnected) return;
            isWebcamOn = !isWebcamOn;
            webcamButton.querySelector('span').textContent = isWebcamOn ? 'videocam_off' : 'videocam';
            ipcRenderer.send('control-action', { type: 'webcam', value: isWebcamOn });
          });

          // Function to show error message
          function showError(message, duration = 2000) {
            errorMessage.textContent = message;
            errorOverlay.classList.add('visible');
            setTimeout(() => {
              errorOverlay.classList.remove('visible');
            }, duration);
          }

          connectButton.addEventListener('click', () => {
            if (!isConnecting) {
              isConnecting = true;
              // Request API key check before connecting
              ipcRenderer.send('check-api-key');
            }
          });

          // Handle API key check response
          ipcRenderer.on('api-key-check', (event, hasApiKey) => {
            if (hasApiKey) {
              ipcRenderer.send('control-action', { type: 'connect', value: !isConnected });
            } else {
              isConnecting = false;
              showError('API key is required to connect');
            }
          });

          // Handle screen share result
          ipcRenderer.on('screen-share-result', (event, success) => {
            messageOverlay.classList.remove('visible');
            if (success) {
              isScreenSharing = true;
              screenButton.querySelector('span').textContent = 'cancel_presentation';
              screenButton.querySelector('span').classList.add('filled');
            }
          });

          // Handle state updates from main process
          ipcRenderer.on('update-controls', (event, state) => {
            isMuted = state.isMuted;
            isScreenSharing = state.isScreenSharing;
            isWebcamOn = state.isWebcamOn;
            isConnected = state.isConnected;
            isConnecting = false;

            // If screen sharing was stopped from main window, hide the message
            if (!isScreenSharing) {
              messageOverlay.classList.remove('visible');
            }

            // Update button states
            micButton.querySelector('span').textContent = isMuted ? 'mic_off' : 'mic';
            screenButton.querySelector('span').textContent = isScreenSharing ? 'cancel_presentation' : 'present_to_all';
            webcamButton.querySelector('span').textContent = isWebcamOn ? 'videocam_off' : 'videocam';
            connectButton.querySelector('span').textContent = isConnected ? 'pause' : 'play_arrow';

            // Update filled states
            micButton.querySelector('span').classList.toggle('filled', !isMuted);
            screenButton.querySelector('span').classList.toggle('filled', isScreenSharing);
            webcamButton.querySelector('span').classList.toggle('filled', isWebcamOn);
            connectButton.querySelector('span').classList.toggle('filled', isConnected);

            // Update disabled state of the nav
            actionsNav.classList.toggle('disabled', !isConnected);
          });

          // Add close button handler
          closeButton.addEventListener('click', () => {
            ipcRenderer.send('close-control-window');
          });

          // Add settings button handler
          settingsButton.addEventListener('click', () => {
            ipcRenderer.send('show-settings');
          });

          // Add error toast handling
          const errorToast = document.querySelector('.error-toast');
          let errorToastTimeout;

          ipcRenderer.on('show-error-toast', (_, message) => {
            // Clear any existing timeout
            if (errorToastTimeout) {
              clearTimeout(errorToastTimeout);
            }

            // Show new error message
            errorToast.textContent = message;
            errorToast.classList.add('visible');

            // Hide after 3 seconds
            errorToastTimeout = setTimeout(() => {
              errorToast.classList.remove('visible');
            }, 3000);
          });
        </script>
      </body>
    </html>
  `;

  controlWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

  // Wait for window to be ready before showing
  controlWindow.once('ready-to-show', () => {
    // Send initial mode update
    if (mainWindow && !mainWindow.isDestroyed()) {
      // Force a mode update from the main window
      mainWindow.webContents.send('request-mode-update');
    }
  });

  // Handle window close
  controlWindow.on('closed', () => {
    controlWindow = null;
  });

  return controlWindow;
}

function createOverlayWindow() {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    return overlayWindow;  // Return existing window if it's still valid
  }

  overlayWindow = new BrowserWindow({
    width: 800,
    height: 100,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  overlayWindow.setIgnoreMouseEvents(true);
  overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body {
            margin: 0;
            padding: 0;
            overflow: hidden;
            background: transparent;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          }
          #subtitles {
            background-color: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 15px 30px;
            border-radius: 10px;
            font-size: 24px;
            font-weight: 500;
            text-align: center;
            max-width: 80%;
            opacity: 0;
            transition: opacity 0.2s ease-in-out;
            position: relative;
            text-rendering: optimizeLegibility;
            -webkit-font-smoothing: antialiased;
          }
          #subtitles.visible {
            opacity: 1;
          }
        </style>
      </head>
      <body>
        <div id="subtitles"></div>
        <script>
          const { ipcRenderer } = require('electron');
          const subtitles = document.getElementById('subtitles');
          
          ipcRenderer.on('update-subtitles', (event, text) => {
            if (text) {
              // First remove the visible class to trigger fade out
              subtitles.classList.remove('visible');
              
              // Wait for the fade out transition to complete
              setTimeout(() => {
                subtitles.textContent = text;
                subtitles.style.display = 'block';
                // Force a reflow to ensure the transition works
                subtitles.offsetHeight;
                subtitles.classList.add('visible');
              }, 200);
            } else {
              subtitles.classList.remove('visible');
              setTimeout(() => {
                subtitles.style.display = 'none';
                subtitles.textContent = '';
              }, 200);
            }
          });
        </script>
      </body>
    </html>
  `;

  overlayWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

  // Handle window close
  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });

  return overlayWindow;
}

// Initialize all windows on app ready
async function initializeApp() {
  await createMainWindow();
  createOverlayWindow();
  createControlWindow();
}

// Single app initialization point
app.whenReady().then(initializeApp);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    initializeApp();
  }
});

// Update main window close handler to clean up other windows
ipcMain.on('close-main-window', () => {
  if (mainWindow) {
    // Clean up all windows when main window is closed
    if (controlWindow && !controlWindow.isDestroyed()) {
      controlWindow.close();
    }
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.close();
    }
    mainWindow.close();
  }
});

// Update subtitle handlers to check for destroyed windows
ipcMain.on('update-subtitles', (event, text) => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send('update-subtitles', text);
    if (text) {
      overlayWindow.showInactive();
    } else {
      overlayWindow.hide();
    }
  }
});

ipcMain.on('remove-subtitles', () => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.hide();
  }
});

// Handle IPC for screen sharing
ipcMain.handle('get-sources', async () => {
  const sources = await desktopCapturer.getSources({
    types: ['window', 'screen'],
    thumbnailSize: { width: 1920, height: 1080 }
  });
  return sources;
});

// Add this with other IPC handlers
ipcMain.handle('read-selection', async () => {
  return await getSelectedText();
});

// Add this after the other ipcMain handlers
ipcMain.on('write-text', async (event, content) => {
  try {
    // Save the current clipboard content
    const previousClipboard = clipboard.readText();
    
    // Set new content to clipboard
    clipboard.writeText(content);
    
    // Simulate Cmd+V (for macOS) or Ctrl+V (for other platforms)
    const modifier = process.platform === 'darwin' ? Key.LeftCmd : Key.LeftControl;
    await keyboard.pressKey(modifier, Key.V);
    await keyboard.releaseKey(modifier, Key.V);
    
    // Restore previous clipboard content after a short delay
    setTimeout(() => {
      clipboard.writeText(previousClipboard);
    }, 100);
  } catch (error) {
    logToFile(`Error writing text: ${error}`);
  }
});

// Add this after the other ipcMain handlers
ipcMain.on('control-action', async (event, action) => {
  try {
    // Create main window if it doesn't exist for any control action
    if (!mainWindow || mainWindow.isDestroyed()) {
      await createMainWindow();
    }
    // Check if mainWindow exists and is not destroyed before sending message
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('control-action', action);
    }
  } catch (error) {
    logToFile(`Error handling control action: ${error}`);
    // If there was an error creating or accessing the window, let the renderer know
    event.reply('control-action-error', { error: 'Failed to process control action' });
  }
});

// Add this to handle state updates from the main window
ipcMain.on('update-control-state', (event, state) => {
  try {
    if (controlWindow && !controlWindow.isDestroyed()) {
      controlWindow.webContents.send('update-controls', state);
    }
  } catch (error) {
    logToFile(`Error updating control state: ${error}`);
  }
});

// Add this to handle screen selection result
ipcMain.on('screen-share-result', (event, success) => {
  try {
    if (controlWindow && !controlWindow.isDestroyed()) {
      controlWindow.webContents.send('screen-share-result', success);
    }
  } catch (error) {
    logToFile(`Error handling screen share result: ${error}`);
  }
});

// Add this to handle carousel actions
ipcMain.on('carousel-action', async (event, direction) => {
  try {
    if (!mainWindow || mainWindow.isDestroyed()) {
      await createMainWindow();
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('carousel-action', direction);
    }
  } catch (error) {
    logToFile(`Error handling carousel action: ${error}`);
  }
});

// Add this to handle carousel updates
ipcMain.on('update-carousel', (event, modeName) => {
  try {
    if (controlWindow && !controlWindow.isDestroyed()) {
      controlWindow.webContents.send('update-carousel', modeName);
    }
  } catch (error) {
    logToFile(`Error updating carousel: ${error}`);
  }
});

// Add this to handle control window close
ipcMain.on('close-control-window', (event) => {
  if (controlWindow && !controlWindow.isDestroyed()) {
    controlWindow.close();
  }
});

ipcMain.on('update-subtitles', (event, text) => {
  if (overlayWindow) {
    overlayWindow.webContents.send('update-subtitles', text);
    if (text) {
      overlayWindow.showInactive();
    } else {
      overlayWindow.hide();
    }
  }
});

ipcMain.on('remove-subtitles', () => {
  if (overlayWindow) {
    overlayWindow.hide();
  }
});

// Add this after the other ipcMain handlers
ipcMain.on('paste-content', async (event, content) => {
  try {
    // Save the current clipboard content
    const previousClipboard = clipboard.readText();
    
    // Set new content to clipboard
    clipboard.writeText(content);
    
    // Simulate Cmd+V (for macOS) or Ctrl+V (for other platforms)
    const modifier = process.platform === 'darwin' ? Key.LeftCmd : Key.LeftControl;
    await keyboard.pressKey(modifier, Key.V);
    await keyboard.releaseKey(modifier, Key.V);
    
    // Restore previous clipboard content after a short delay
    setTimeout(() => {
      clipboard.writeText(previousClipboard);
    }, 100);
  } catch (error) {
    logToFile(`Error pasting content: ${error}`);
  }
});

async function getSelectedText() {
  try {
    // Save current clipboard content
    const previousClipboard = clipboard.readText();
    
    // Simulate Cmd+C (for macOS) or Ctrl+C (for other platforms)
    const modifier = process.platform === 'darwin' ? Key.LeftCmd : Key.LeftControl;
    await keyboard.pressKey(modifier, Key.C);
    await keyboard.releaseKey(modifier, Key.C);
    
    // Wait a bit for the clipboard to update
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Get the selected text from clipboard
    const selectedText = clipboard.readText();
    logToFile(`Selected text: ${selectedText}`);
    
    // Restore previous clipboard content
    clipboard.writeText(previousClipboard);
    
    return selectedText;
  } catch (error) {
    logToFile(`Error getting selected text: ${error}`);
    return '';
  }
}

// Add this with other IPC handlers
ipcMain.handle('get-selected-text', async () => {
  return await getSelectedText();
});

// Add this with other IPC handlers
ipcMain.on('show-settings', () => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send('show-settings');
  }
});

// Add this with other IPC handlers
ipcMain.on('show-main-window', () => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
});

ipcMain.on('hide-main-window', () => {
  if (mainWindow) {
    mainWindow.hide();
  }
});

// Update the control-action handler to show window for screen/webcam
ipcMain.on('control-action', (event, action) => {
  if (mainWindow) {
    // Show window if screen sharing or webcam is being activated
    if ((action.type === 'screen' || action.type === 'webcam') && action.value === true) {
      mainWindow.show();
      mainWindow.focus();
    }
    mainWindow.webContents.send('control-action', action);
  }
});

// Add this with other IPC handlers
ipcMain.on('check-api-key', (event) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('check-api-key');
  }
});

// Add this with other IPC handlers
ipcMain.on('api-key-check-result', (event, hasApiKey) => {
  if (controlWindow && !controlWindow.isDestroyed()) {
    controlWindow.webContents.send('api-key-check', hasApiKey);
  }
});

// Add IPC handlers for session errors (add this before app.on('ready'))
ipcMain.on('session-error', (event, errorMessage) => {
  if (controlWindow && !controlWindow.isDestroyed()) {
    controlWindow.webContents.send('show-error-toast', errorMessage);
  }
});

// Add handler for logging to file
ipcMain.on('log-to-file', (event, message) => {
  logToFile(message);
}); 