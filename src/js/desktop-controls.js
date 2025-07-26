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
        

    }).catch(() => {

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

}

function showAbout() {
    const modal = document.getElementById('aboutModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Input elemanlarının user-select özelliğini sıfırla - Windows uyumlu
        setTimeout(() => {
            const inputs = modal.querySelectorAll('input, textarea, select');
            inputs.forEach(input => {
                // Temel stil ayarları
                input.style.userSelect = 'text';
                input.style.webkitUserSelect = 'text';
                input.style.mozUserSelect = 'text';
                input.style.msUserSelect = 'text';
                input.style.pointerEvents = 'auto';
                input.style.cursor = 'text';
                
                // Windows için özel ayarlar
                input.style.webkitAppearance = 'none';
                input.style.appearance = 'none';
                input.style.msTouchAction = 'manipulation';
                input.style.touchAction = 'manipulation';
                
                // Disabled ve readonly durumlarını temizle
                input.removeAttribute('disabled');
                input.removeAttribute('readonly');
                input.tabIndex = 0;
                
                // Event listener'lar ekle
                input.addEventListener('click', function() {
                    this.focus();
                    if (this.type !== 'select-one') {
                        this.select();
                    }
                });
                
                input.addEventListener('focus', function() {
                    this.style.pointerEvents = 'auto';
                    this.style.userSelect = 'text';
                    this.style.webkitUserSelect = 'text';
                    this.style.mozUserSelect = 'text';
                    this.style.msUserSelect = 'text';
                });
                
                input.addEventListener('mousedown', function(e) {
                    e.stopPropagation();
                });
            });
        }, 100);
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

function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
        }).catch(() => {
            fallbackCopyTextToClipboard(text);
        });
    } else {
        fallbackCopyTextToClipboard(text);
    }
}

function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        const successful = document.execCommand('copy');
        if (successful) {
        } else {
        }
    } catch (err) {
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
    const platformClass = `platform-${detectPlatform()}`;
    document.body.classList.add(platformClass);
    
    initDesktopTooltips();
    
    // Platform Detection
    const isMac = window.electronAPI?.platform === 'darwin' || navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    
    // Add desktop control event listeners (only for Windows/Linux)
    if (!isMac) {
        const minimizeBtn = document.getElementById('minimize-btn');
        const maximizeBtn = document.getElementById('max-unmax-btn'); // Fixed ID to match HTML
        const closeBtn = document.getElementById('close-btn');
        
        if (minimizeBtn) {
            minimizeBtn.addEventListener('click', minimizeWindow);
            minimizeBtn.style.pointerEvents = 'auto';
            minimizeBtn.style.cursor = 'pointer';
        }
        
        if (maximizeBtn) {
            maximizeBtn.addEventListener('click', maximizeWindow);
            maximizeBtn.style.pointerEvents = 'auto';
            maximizeBtn.style.cursor = 'pointer';
        }
        
        if (closeBtn) {
            closeBtn.addEventListener('click', closeWindow);
            closeBtn.style.pointerEvents = 'auto';
            closeBtn.style.cursor = 'pointer';
        }
        
        // Ensure buttons are clickable and visible
        [minimizeBtn, maximizeBtn, closeBtn].forEach(btn => {
            if (btn) {
                btn.style.opacity = '1';
                btn.style.visibility = 'visible';
                btn.style.display = 'flex';
                btn.disabled = false;
            }
        });
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
