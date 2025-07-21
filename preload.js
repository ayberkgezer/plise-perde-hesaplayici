const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Platform information
  platform: process.platform,
  
  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),
  
  // File system operations
  readFile: (filePath) => {
    try {
      const resolvedPath = path.resolve(filePath);
      return fs.readFileSync(resolvedPath, 'utf8');
    } catch (error) {
      console.error('Error reading file:', error);
      return null;
    }
  },
  
  writeFile: (filePath, data) => {
    try {
      const resolvedPath = path.resolve(filePath);
      fs.writeFileSync(resolvedPath, data, 'utf8');
      return true;
    } catch (error) {
      console.error('Error writing file:', error);
      return false;
    }
  },
  
  fileExists: (filePath) => {
    try {
      const resolvedPath = path.resolve(filePath);
      return fs.existsSync(resolvedPath);
    } catch (error) {
      return false;
    }
  },
  
  // Path utilities
  resolvePath: (...pathSegments) => path.resolve(...pathSegments),
  joinPath: (...pathSegments) => path.join(...pathSegments),
  getDirname: () => __dirname,
  
  // Menu events
  onNewCalculation: (callback) => ipcRenderer.on('new-calculation', callback),
  onExportData: (callback) => ipcRenderer.on('export-data', callback),
  onShowHelp: (callback) => ipcRenderer.on('show-help', callback)
});
