import { app, BrowserWindow, Menu, shell, utilityProcess } from 'electron';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
    app.quit();
}

let mainWindow: BrowserWindow | null = null;
let serverProcess: any = null;
const API_PORT = '3001'; // We can make this dynamic later if needed

function startServer() {
    const serverPath = path.join(__dirname, 'server.js');
    console.log('[Main] Starting server at:', serverPath);

    serverProcess = utilityProcess.fork(serverPath, [`--port=${API_PORT}`], {
        stdio: 'inherit'
    });

    serverProcess.on('exit', (code: number) => {
        console.log(`[Main] Server process exited with code ${code}`);
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

    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
        mainWindow.loadURL('http://localhost:5180');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
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
