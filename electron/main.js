"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var electron_1 = require("electron");
var path = require("path");
var mainWindow = null;
var overlayWindow = null;
function createWindow() {
    return __awaiter(this, void 0, void 0, function () {
        var isDev;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    isDev = !electron_1.app.isPackaged;
                    mainWindow = new electron_1.BrowserWindow({
                        width: 1200,
                        height: 800,
                        webPreferences: {
                            nodeIntegration: true,
                            contextIsolation: false,
                            webSecurity: true,
                        },
                    });
                    if (!mainWindow) return [3 /*break*/, 2];
                    mainWindow.webContents.session.setPermissionRequestHandler(function (webContents, permission, callback) {
                        var allowedPermissions = ['media', 'display-capture', 'screen', 'mediaKeySystem'];
                        if (allowedPermissions.includes(permission)) {
                            callback(true);
                        }
                        else {
                            callback(false);
                        }
                    });
                    // Enable screen capture
                    mainWindow.webContents.session.setDisplayMediaRequestHandler(function (request, callback) {
                        mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.webContents.send('show-screen-picker');
                        callback({}); // Let the renderer handle source selection
                    });
                    return [4 /*yield*/, mainWindow.loadURL(isDev
                            ? 'http://localhost:3000'
                            : "file://".concat(path.join(__dirname, '../build/index.html')))];
                case 1:
                    _a.sent();
                    if (isDev) {
                        mainWindow.webContents.openDevTools();
                    }
                    _a.label = 2;
                case 2:
                    createOverlayWindow();
                    return [2 /*return*/];
            }
        });
    });
}
function createOverlayWindow() {
    overlayWindow = new electron_1.BrowserWindow({
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
    var htmlContent = "\n    <!DOCTYPE html>\n    <html>\n      <head>\n        <style>\n          body {\n            margin: 0;\n            padding: 0;\n            overflow: hidden;\n            background: transparent;\n            display: flex;\n            justify-content: center;\n            align-items: center;\n            height: 100vh;\n            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;\n          }\n          #subtitles {\n            background-color: rgba(0, 0, 0, 0.7);\n            color: white;\n            padding: 15px 30px;\n            border-radius: 10px;\n            font-size: 24px;\n            font-weight: 500;\n            text-align: center;\n            max-width: 80%;\n            display: none;\n          }\n        </style>\n      </head>\n      <body>\n        <div id=\"subtitles\"></div>\n        <script>\n          const { ipcRenderer } = require('electron');\n          const subtitles = document.getElementById('subtitles');\n          \n          ipcRenderer.on('update-subtitles', (event, text) => {\n            if (text) {\n              subtitles.textContent = text;\n              subtitles.style.display = 'block';\n            } else {\n              subtitles.style.display = 'none';\n            }\n          });\n        </script>\n      </body>\n    </html>\n  ";
    overlayWindow.loadURL("data:text/html;charset=utf-8,".concat(encodeURIComponent(htmlContent)));
}
// Handle IPC for screen sharing
electron_1.ipcMain.handle('get-sources', function () { return __awaiter(void 0, void 0, void 0, function () {
    var sources;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, electron_1.desktopCapturer.getSources({
                    types: ['window', 'screen'],
                    thumbnailSize: { width: 150, height: 150 }
                })];
            case 1:
                sources = _a.sent();
                return [2 /*return*/, sources];
        }
    });
}); });
electron_1.app.whenReady().then(createWindow);
electron_1.app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('activate', function () {
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
electron_1.ipcMain.on('update-subtitles', function (event, text) {
    if (overlayWindow) {
        overlayWindow.webContents.send('update-subtitles', text);
        if (text) {
            overlayWindow.showInactive();
        }
        else {
            overlayWindow.hide();
        }
    }
});
electron_1.ipcMain.on('remove-subtitles', function () {
    if (overlayWindow) {
        overlayWindow.hide();
    }
});
