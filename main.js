const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');

// Uygulama adını ayarla (dock için)
app.setName('Perde Hesaplama');

// Process title'ını da ayarla
process.title = 'Perde Hesaplama';

// Global değişkenler
let mainWindow;
let splashWindow;

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
            shell.openExternal('https://tengraworks.com');
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
app.whenReady().then(() => {
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
    app.quit();
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

// Uygulama bilgileri
app.setAboutPanelOptions({
  applicationName: 'Perde Hesaplama',
  applicationVersion: '2.0.0',
  version: '2.0.0',
  copyright: '© 2025 Tengra Works - tengraworks.com',
  credits: 'Profesyonel perde hesaplama sistemi'
});
