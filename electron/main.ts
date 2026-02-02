import { app, BrowserWindow, ipcMain, Menu, shell, utilityProcess } from 'electron';
import setupSquirrelEvents from 'electron-squirrel-startup';
import { autoUpdater } from 'electron-updater';
import path from 'path';

// Standard CJS __dirname is available because we changed the tsconfig module to CommonJS
// and will force CommonJS via a package.json in dist-electron.

// Configure Updater
autoUpdater.autoDownload = false;
autoUpdater.logger = console;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (setupSquirrelEvents) {
    app.quit();
}

let mainWindow: BrowserWindow | null = null;
let serverProcess: any = null;
const API_PORT = '3001'; // We can make this dynamic later if needed

// --- Update Events ---
autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send('update-available', info);
});

autoUpdater.on('update-downloaded', (info) => {
    mainWindow?.webContents.send('update-downloaded', info);
});

autoUpdater.on('error', (err) => {
    mainWindow?.webContents.send('update-error', err.message);
});

ipcMain.handle('check-for-updates', async () => {
    return await autoUpdater.checkForUpdates();
});

ipcMain.on('download-update', () => {
    autoUpdater.downloadUpdate();
});

ipcMain.on('install-update', () => {
    autoUpdater.quitAndInstall();
});

function startServer() {
    const serverPath = path.join(__dirname, 'server.js');
    console.log('[Main] Initializing tactical server at:', serverPath);

    serverProcess = utilityProcess.fork(serverPath, [`--port=${API_PORT}`], {
        stdio: 'inherit'
    });

    serverProcess.on('spawn', () => {
        console.log(`[Main] Server process spawned successfully on port ${API_PORT}`);
    });

    serverProcess.on('error', (err: any) => {
        console.error('[Main] Server process encountered a critical error:', err);
    });

    serverProcess.on('exit', (code: number) => {
        if (code !== 0) {
            console.error(`[Main] Server process crashed with exit code ${code}`);
        } else {
            console.log(`[Main] Server process terminated gracefully.`);
        }
    });
}

function createMenu() {
    const template: Electron.MenuItemConstructorOptions[] = [
        {
            label: 'Vanguard',
            submenu: [
                { role: 'about' },
                { type: 'separator' },
                { role: 'quit' }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Window',
            submenu: [
                { role: 'minimize' },
                { role: 'zoom' },
                ...(process.platform === 'darwin'
                    ? [
                        { type: 'separator' } as const,
                        { role: 'front' } as const,
                        { type: 'separator' } as const,
                        { role: 'window' } as const
                    ]
                    : [
                        { role: 'close' } as const
                    ])
            ]
        },
        {
            role: 'help',
            submenu: [
                {
                    label: 'Vanguard OS Intel',
                    click: async () => {
                        await shell.openExternal('https://github.com/CallMeKakashi/vanguard');
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        frame: true, // We might want a custom frame later, but start with standard
        backgroundColor: '#020205',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
        title: 'Vanguard',
        icon: path.join(__dirname, '../public/logo.png') // Assuming logo exists here
    });

    // Pass the port to the renderer via additional arguments
    process.argv.push(`--api-port=${API_PORT}`);

    const isDev = !app.isPackaged || process.env.NODE_ENV === 'development';
    console.log(`[Main] Vanguard starting in ${isDev ? 'DEVELOPMENT' : 'PRODUCTION'} mode`);
    if (isDev) {
        console.log('[Main] Loading interface from:', 'http://localhost:5180');
        mainWindow.loadURL('http://localhost:5180');
    } else {
        const prodPath = path.join(__dirname, '../dist/index.html');
        console.log('[Main] Loading interface from:', prodPath);
        mainWindow.loadFile(prodPath);
    }

    // Open external links in default browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http:') || url.startsWith('https:')) {
            shell.openExternal(url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.on('ready', () => {
    createMenu();
    startServer();
    createWindow();
});

app.on('window-all-closed', () => {
    if (serverProcess) {
        serverProcess.kill();
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

// Protocol handler for steam:// (should work by default if OS handles it,
// but we might need explicit handling if we want to intercept)
// For now, shell.openExternal or window.location.href in renderer handles it.
