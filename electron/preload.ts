import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
    apiPort: process.argv.find(arg => arg.startsWith('--api-port='))?.split('=')[1] || '3001',
});
