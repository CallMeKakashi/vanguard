import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
    apiPort: process.argv.find(arg => arg.startsWith('--api-port='))?.split('=')[1] || '3001',
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    downloadUpdate: () => ipcRenderer.send('download-update'),
    installUpdate: () => ipcRenderer.send('install-update'),
    onUpdateAvailable: (callback: (info: any) => void) => {
        const handler = (_: any, info: any) => callback(info);
        ipcRenderer.on('update-available', handler);
        return () => ipcRenderer.removeListener('update-available', handler);
    },
    onUpdateDownloaded: (callback: (info: any) => void) => {
        const handler = (_: any, info: any) => callback(info);
        ipcRenderer.on('update-downloaded', handler);
        return () => ipcRenderer.removeListener('update-downloaded', handler);
    },
    onUpdateError: (callback: (err: string) => void) => {
        const handler = (_: any, err: any) => callback(err);
        ipcRenderer.on('update-error', handler);
        return () => ipcRenderer.removeListener('update-error', handler);
    }
});
