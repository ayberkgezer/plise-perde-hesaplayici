// Desktop Window Controls
function minimizeWindow() {
    if (window.electronAPI) {
        window.electronAPI.minimizeWindow();
    }
}

function maximizeWindow() {
    if (window.electronAPI) {
        window.electronAPI.maximizeWindow();
    }
}

function closeWindow() {
    if (window.electronAPI) {
        window.electronAPI.closeWindow();
    }
}

// Platform Detection
function platform() {
    if (typeof window !== 'undefined' && window.navigator) {
        const platform = window.navigator.platform.toLowerCase();
        if (platform.includes('mac')) return 'macos';
        if (platform.includes('win')) return 'windows';
        if (platform.includes('linux')) return 'linux';
    }
    return 'unknown';
}

function detectPlatform() {
    const currentPlatform = platform();
    document.body.classList.add(`platform-${currentPlatform}`);
    return currentPlatform;
}

// Desktop Context Menu
function createContextMenu() {
    const contextMenu = document.createElement('div');
    contextMenu.className = 'context-menu';
    contextMenu.innerHTML = `
        <div class="context-menu-item" onclick="refreshApp()">
            <span>🔄</span>
            <span>Yenile</span>
        </div>
        <div class="context-menu-divider"></div>
        <div class="context-menu-item" onclick="exportData()">
            <span>💾</span>
            <span>Dışa Aktar</span>
        </div>
        <div class="context-menu-item" onclick="printCalculation()">
            <span>🖨️</span>
            <span>Yazdır</span>
        </div>
        <div class="context-menu-divider"></div>
        <div class="context-menu-item" onclick="showAbout()">
            <span>ℹ️</span>
            <span>Hakkında</span>
        </div>
    `;
    return contextMenu;
}

// Desktop Notifications
function showDesktopNotification(title, message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = 'desktop-notification';
    
    const icons = {
        info: 'ℹ️',
        success: '✅',
        warning: '⚠️',
        error: '❌'
    };
    
    notification.innerHTML = `
        <div class="notification-header">
            <span class="notification-title">${icons[type]} ${title}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
        <div class="notification-body">${message}</div>
    `;
    
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Desktop Tooltip System
function initDesktopTooltips() {
    const tooltip = document.createElement('div');
    tooltip.className = 'desktop-tooltip';
    tooltip.style.display = 'none';
    document.body.appendChild(tooltip);
    
    document.querySelectorAll('[data-tooltip]').forEach(element => {
        element.addEventListener('mouseenter', (e) => {
            tooltip.textContent = e.target.dataset.tooltip;
            tooltip.style.display = 'block';
        });
        
        element.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none';
        });
        
        element.addEventListener('mousemove', (e) => {
            tooltip.style.left = e.pageX + 10 + 'px';
            tooltip.style.top = e.pageY - 30 + 'px';
        });
    });
}

// Calculation Counter
let calculationCount = 0;

function updateCalculationCount() {
    calculationCount++;
    const counter = document.getElementById('calculation-count');
    if (counter) {
        counter.textContent = `${calculationCount} hesaplama`;
    }
}

// Desktop App Utilities
function refreshApp() {
    location.reload();
}

function exportData() {
    // SQLite verilerini al ve dışa aktar
    Promise.all([
        window.electronAPI.getCalculations(),
        window.electronAPI.getFabricSeries(),
        window.electronAPI.getCostSettings(),
        window.electronAPI.getCalculationStats()
    ]).then(([calculations, fabricSeries, costSettings, stats]) => {
        const data = {
            calculations: calculations,
            fabricSeries: fabricSeries,
            costSettings: costSettings,
            stats: stats,
            timestamp: new Date().toISOString(),
            version: '2.0.0',
            exportType: 'SQLite Database Export'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `plise-perde-database-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        showDesktopNotification('Dışa Aktarma', 'Veritabanı başarıyla dışa aktarıldı!', 'success');
    }).catch(error => {
        console.error('Dışa aktarma hatası:', error);
        showDesktopNotification('Hata', 'Dışa aktarma sırasında hata oluştu!', 'error');
    });
}

function getAllCalculations() {
    // SQLite'dan verileri almaya çalış, yoksa basit fallback
    if (window.electronAPI && window.electronAPI.getCalculations) {
        return window.electronAPI.getCalculations().then(calculations => {
            return {
                calculations: calculations,
                totalCalculations: calculations.length,
                lastCalculation: calculations.length > 0 ? calculations[0] : null
            };
        }).catch(() => {
            return {
                calculations: [],
                totalCalculations: 0,
                lastCalculation: null
            };
        });
    }
    
    // Fallback for non-Electron environments
    return Promise.resolve({
        calculations: [],
        totalCalculations: 0,
        lastCalculation: {
            width: document.getElementById('width')?.value || 0,
            height: document.getElementById('height')?.value || 0,
            total: document.getElementById('totalPrice')?.textContent || '0'
        }
    });
}

function printCalculation() {
    window.print();
    showDesktopNotification('Yazdırma', 'Yazdırma penceresi açıldı.', 'info');
}

function showAbout() {
    const modal = document.getElementById('aboutModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

// About Modal Functions
function closeAboutModal() {
    const modal = document.getElementById('aboutModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function openExternal(url) {
    if (window.electronAPI && window.electronAPI.openExternal) {
        window.electronAPI.openExternal(url);
    } else {
        window.open(url, '_blank');
    }
}

function copyToClipboard(text, message = 'Kopyalandı!') {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
            if (window.showNotification) {
                window.showNotification(message, 'success');
            } else {
                showDesktopNotification('Kopyalandı', message, 'success');
            }
        }).catch(err => {
            fallbackCopyTextToClipboard(text, message);
        });
    } else {
        fallbackCopyTextToClipboard(text, message);
    }
}

function fallbackCopyTextToClipboard(text, message) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        if (window.showNotification) {
            window.showNotification(message, 'success');
        } else {
            showDesktopNotification('Kopyalandı', message, 'success');
        }
    } catch (err) {
        console.error('Kopyalama başarısız:', err);
        showDesktopNotification('Hata', 'Kopyalama başarısız', 'error');
    }
    
    document.body.removeChild(textArea);
}

// Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
            case 'r':
                e.preventDefault();
                refreshApp();
                break;
            case 's':
                e.preventDefault();
                exportData();
                break;
            case 'p':
                e.preventDefault();
                printCalculation();
                break;
            case 'q':
                e.preventDefault();
                closeWindow();
                break;
        }
    } else if (e.key === 'F1') {
        e.preventDefault();
        showAbout();
    }
});

// Context Menu Event
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    
    // Remove existing context menu
    document.querySelectorAll('.context-menu').forEach(menu => menu.remove());
    
    const contextMenu = createContextMenu();
    contextMenu.style.position = 'fixed';
    contextMenu.style.left = e.pageX + 'px';
    contextMenu.style.top = e.pageY + 'px';
    
    document.body.appendChild(contextMenu);
    
    // Remove on click outside
    const removeMenu = (event) => {
        if (!contextMenu.contains(event.target)) {
            contextMenu.remove();
            document.removeEventListener('click', removeMenu);
        }
    };
    
    setTimeout(() => document.addEventListener('click', removeMenu), 0);
});

// Initialize Desktop Features
document.addEventListener('DOMContentLoaded', () => {
    // Detect platform
    detectPlatform();
    
    initDesktopTooltips();
    
    // Platform Detection
    const isMac = window.electronAPI?.platform === 'darwin' || navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    
    // Add desktop control event listeners (only for Windows/Linux)
    if (!isMac) {
        const minimizeBtn = document.getElementById('minimize-btn');
        const maximizeBtn = document.getElementById('maximize-btn');
        const closeBtn = document.getElementById('close-btn');
        
        if (minimizeBtn) {
            minimizeBtn.addEventListener('click', minimizeWindow);
        }
        
        if (maximizeBtn) {
            maximizeBtn.addEventListener('click', maximizeWindow);
        }
        
        if (closeBtn) {
            closeBtn.addEventListener('click', closeWindow);
        }
    }
    
    // Add tooltips to buttons
    document.querySelectorAll('button').forEach(button => {
        if (!button.dataset.tooltip) {
            const text = button.textContent.trim();
            if (text === 'Hesapla') button.dataset.tooltip = 'Plise perde hesaplamasını yap (Enter)';
            if (text === 'Temizle') button.dataset.tooltip = 'Tüm alanları temizle (Ctrl+R)';
        }
    });
    
    // Application ready - no notification needed
});

// About Modal Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Close modal on ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = document.getElementById('aboutModal');
            if (modal && modal.classList.contains('active')) {
                closeAboutModal();
            }
        }
    });

    // Close modal when clicking outside
    document.addEventListener('click', (e) => {
        const modal = document.getElementById('aboutModal');
        if (modal && modal.classList.contains('active')) {
            if (e.target === modal) {
                closeAboutModal();
            }
        }
    });
});

// Desktop controls module for Electron app
// This module is automatically loaded and doesn't need CommonJS exports

// Window control functions
function minimizeWindow() {
    if (window.electronAPI && window.electronAPI.minimizeWindow) {
        window.electronAPI.minimizeWindow();
    }
}

function maximizeWindow() {
    if (window.electronAPI && window.electronAPI.maximizeWindow) {
        window.electronAPI.maximizeWindow();
    }
}

function closeWindow() {
    if (window.electronAPI && window.electronAPI.closeWindow) {
        window.electronAPI.closeWindow();
    }
}
