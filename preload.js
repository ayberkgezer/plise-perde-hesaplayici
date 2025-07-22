const { contextBridge, ipcRenderer, shell } = require('electron');
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
  
  // Database operations - Fabric Series
  getFabricSeries: () => ipcRenderer.invoke('db-get-fabric-series'),
  addFabricSeries: (name, price, cost) => ipcRenderer.invoke('db-add-fabric-series', name, price, cost),
  updateFabricSeries: (id, name, price, cost) => ipcRenderer.invoke('db-update-fabric-series', id, name, price, cost),
  deleteFabricSeries: (id) => ipcRenderer.invoke('db-delete-fabric-series', id),
  
  // Database operations - Cost Settings
  getCostSettings: () => ipcRenderer.invoke('db-get-cost-settings'),
  updateCostSettings: (fixedCostPerUnit, aluminiumCostPerCm) => ipcRenderer.invoke('db-update-cost-settings', fixedCostPerUnit, aluminiumCostPerCm),
  
  // Database operations - Calculations
  addCalculation: (calculation) => ipcRenderer.invoke('db-add-calculation', calculation),
  getCalculations: (limit) => ipcRenderer.invoke('db-get-calculations', limit),
  deleteCalculation: (id) => ipcRenderer.invoke('db-delete-calculation', id),
  clearCalculations: () => ipcRenderer.invoke('db-clear-calculations'),
  getCalculationStats: () => ipcRenderer.invoke('db-get-calculation-stats'),
  
  // Path utilities
  resolvePath: (...pathSegments) => path.resolve(...pathSegments),
  joinPath: (...pathSegments) => path.join(...pathSegments),
  getDirname: () => __dirname,
  
  // Shell operations for about page
  openExternal: (url) => shell.openExternal(url),
  
  // Menu events
  onNewCalculation: (callback) => ipcRenderer.on('new-calculation', callback),
  onExportData: (callback) => ipcRenderer.on('export-data', callback),
  onShowHelp: (callback) => ipcRenderer.on('show-help', callback),
  onMenuAction: (callback) => {
    ipcRenderer.on('show-about', () => callback('show-about'));
    ipcRenderer.on('show-help', () => callback('show-help'));
    ipcRenderer.on('new-calculation', () => callback('new-calculation'));
    ipcRenderer.on('export-data', () => callback('export-data'));
  }
});
