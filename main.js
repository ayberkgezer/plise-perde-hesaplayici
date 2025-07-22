const { app, BrowserWindow, Menu, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const DatabaseManager = require('./src/js/database');

// Global değişkenler
let mainWindow;
let splashWindow;
let database;

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 600,
    height: 400,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    resizable: false,
    center: true,
    title: 'Perde Hesaplama',
    icon: path.join(__dirname, 'src/assets/images/icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  splashWindow.loadFile('src/views/splash.html');
  
  // Ana pencere hazır olduğunda splash'ı kapat
  setTimeout(() => {
    createMainWindow();
  }, 2500);
}

function createMainWindow() {
  // Platform-specific window options
  const windowOptions = {
    width: 1400,
    height: 950,
    minWidth: 1200,
    minHeight: 800,
    show: false,
    title: 'Perde Hesaplama',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      sandbox: false,
      preload: path.join(__dirname, 'preload.js')
    }
  };

  // Platform-specific title bar settings
  if (process.platform === 'darwin') {
    // macOS: Native traffic lights
    windowOptions.titleBarStyle = 'hiddenInset';
    windowOptions.trafficLightPosition = { x: 20, y: 13 };
    windowOptions.icon = path.join(__dirname, 'src/assets/images/icon.png');
  } else {
    // Windows/Linux: Custom controls
    windowOptions.frame = false;
    windowOptions.icon = path.join(__dirname, 'src/assets/images/icon.ico');
  }

  mainWindow = new BrowserWindow(windowOptions);

  // Menü oluştur
  createMenu();

  // Ana sayfa yükle
  mainWindow.loadFile('index.html');

  // Pencere hazır olduğunda göster
  mainWindow.once('ready-to-show', () => {
    if (splashWindow) {
      splashWindow.close();
      splashWindow = null;
    }
    mainWindow.show();
    mainWindow.focus();
    
    // Açılış animasyonu
    mainWindow.setOpacity(0);
    let opacity = 0;
    const fadeIn = setInterval(() => {
      opacity += 0.1;
      mainWindow.setOpacity(opacity);
      if (opacity >= 1) {
        clearInterval(fadeIn);
      }
    }, 30);
  });

  // Pencere kapatıldığında
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createMenu() {
  const template = [
    {
      label: 'Dosya',
      submenu: [
        {
          label: 'Yeni Hesaplama',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('new-calculation');
            }
          }
        },
        {
          label: 'Verileri Dışa Aktar',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('export-data');
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Çıkış',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Düzenle',
      submenu: [
        { role: 'undo', label: 'Geri Al' },
        { role: 'redo', label: 'Yinele' },
        { type: 'separator' },
        { role: 'cut', label: 'Kes' },
        { role: 'copy', label: 'Kopyala' },
        { role: 'paste', label: 'Yapıştır' }
      ]
    },
    {
      label: 'Görünüm',
      submenu: [
        { role: 'reload', label: 'Yenile' },
        { role: 'forceReload', label: 'Zorla Yenile' },
        { role: 'toggleDevTools', label: 'Geliştirici Araçları' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Zoom Sıfırla' },
        { role: 'zoomIn', label: 'Yakınlaştır' },
        { role: 'zoomOut', label: 'Uzaklaştır' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Tam Ekran' }
      ]
    },
    {
      label: 'Pencere',
      submenu: [
        { role: 'minimize', label: 'Küçült' },
        { role: 'close', label: 'Kapat' }
      ]
    },
    {
      label: 'Yardım',
      submenu: [
        {
          label: 'Hakkında',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('show-about');
            }
          }
        },
        {
          label: 'Kullanım Kılavuzu',
          accelerator: 'F1',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('show-help');
            }
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// App event handlers
app.whenReady().then(async () => {
  // Uygulama adını ayarla (dock için)
  app.setName('Perde Hesaplama');
  
  // Process title'ını da ayarla
  process.title = 'Perde Hesaplama';

  // Veritabanını başlat
  database = new DatabaseManager();
  try {
    await database.connect();
    console.log('Veritabanı başarıyla başlatıldı.');
  } catch (error) {
    console.error('Veritabanı başlatma hatası:', error);
    // Kritik hata: Uygulama devam edebilir mi?
    const response = dialog.showMessageBoxSync(null, {
      type: 'error',
      title: 'Veritabanı Hatası',
      message: 'Veritabanı başlatılamadı!',
      detail: error.message,
      buttons: ['Devam Et', 'Çıkış'],
      defaultId: 1
    });
    
    if (response === 1) {
      app.quit();
      return;
    }
  }

  // macOS dock icon ve badge ayarları
  if (process.platform === 'darwin') {
    app.dock.setIcon(path.join(__dirname, 'src/assets/images/icon.png'));
    // Dock'ta uygulama adını zorla
    app.setName('Perde Hesaplama');
  }
  
  createSplashWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createSplashWindow();
    }
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    // Veritabanını kapat
    if (database) {
      database.close().then(() => {
        app.quit();
      }).catch(() => {
        app.quit();
      });
    } else {
      app.quit();
    }
  }
});

app.on('before-quit', async () => {
  if (database) {
    await database.close();
  }
});

// IPC Handlers - Window Controls
ipcMain.handle('window-minimize', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('window-close', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

// IPC Handlers - Database Operations
ipcMain.handle('db-get-fabric-series', async () => {
  try {
    return await database.getFabricSeries();
  } catch (error) {
    return [];
  }
});

ipcMain.handle('db-add-fabric-series', async (event, name, price, cost) => {
  try {
    return await database.addFabricSeries(name, price, cost);
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('db-update-fabric-series', async (event, id, name, price, cost) => {
  try {
    return await database.updateFabricSeries(id, name, price, cost);
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('db-delete-fabric-series', async (event, id) => {
  try {
    return await database.deleteFabricSeries(id);
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('db-get-cost-settings', async () => {
  try {
    return await database.getCostSettings();
  } catch (error) {
    return { fixed_cost_per_unit: 25, aluminium_cost_per_cm: 0.8 };
  }
});

ipcMain.handle('db-update-cost-settings', async (event, fixedCostPerUnit, aluminiumCostPerCm) => {
  try {
    return await database.updateCostSettings(fixedCostPerUnit, aluminiumCostPerCm);
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('db-add-calculation', async (event, calculation) => {
  try {
    return await database.addCalculation(calculation);
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('db-get-calculations', async (event, limit = null) => {
  try {
    return await database.getCalculations(limit);
  } catch (error) {
    return [];
  }
});

ipcMain.handle('db-delete-calculation', async (event, id) => {
  try {
    return await database.deleteCalculation(id);
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('db-clear-calculations', async () => {
  try {
    return await database.clearAllCalculations();
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('db-get-calculation-stats', async () => {
  try {
    return await database.getCalculationStats();
  } catch (error) {
    return {
      total_calculations: 0,
      total_revenue: 0,
      total_cost: 0,
      total_profit: 0,
      average_profit: 0
    };
  }
});

// Uygulama bilgileri
app.setAboutPanelOptions({
  applicationName: 'Perde Hesaplama',
  applicationVersion: '2.0.0',
  version: '2.0.0',
  copyright: '© 2025 Tengra Works - tengraworks.com',
  credits: 'Profesyonel perde hesaplama sistemi'
});
