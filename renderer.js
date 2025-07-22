// Electron API kullanarak dosya işlemleri
document.addEventListener('DOMContentLoaded', () => {
    // Platform Detection - Title bar'ı platform bazında ayarla
    const titleBar = document.querySelector('.title-bar');
    const titleBarControls = document.getElementById('title-bar-controls');
    const isMac = window.electronAPI?.platform === 'darwin' || navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    
    if (isMac) {
        titleBar?.classList.add('mac-platform');
        titleBarControls?.classList.add('mac-platform');
    } else {
        titleBar?.classList.add('win-platform');
        titleBarControls?.classList.add('win-platform');
    }

    // --- Element Referansları ---
    const fabricTypeSelect = document.getElementById('fabricType');
    const calculateBtn = document.getElementById('calculateBtn');
    const resultTable = document.getElementById('resultTable');
    const totalPriceEl = document.getElementById('totalPrice');
    const widthInput = document.getElementById('width');
    const heightInput = document.getElementById('height');
    const quantityInput = document.getElementById('quantity');

    // Navigation Elements
    const navLinks = document.querySelectorAll('.nav-link');
    const views = document.querySelectorAll('.view');

    // Database Management Elements
    const fabricManagementTable = document.getElementById('fabricManagementTable');
    const fabricNameInput = document.getElementById('fabricName');
    const fabricPriceInput = document.getElementById('fabricPrice');
    const fabricCostInput = document.getElementById('fabricCost');
    const saveFabricBtn = document.getElementById('saveFabricBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const editIndexInput = document.getElementById('editIndex');

    // Cost Analysis Elements
    const costAnalysisDiv = document.getElementById('costAnalysis');
    const calculateCostBtn = document.getElementById('calculateCostBtn');
    const clearCostBtn = document.getElementById('clearCostBtn');
    const costTable = document.getElementById('costTable');
    const totalCostEl = document.getElementById('totalCost');
    const totalProfitEl = document.getElementById('totalProfit');
    const totalRevenueEl = document.getElementById('totalRevenue');

    // Cost Settings Elements
    const fixedCostPerUnitInput = document.getElementById('fixedCostPerUnit');
    const aluminiumCostPerCmInput = document.getElementById('aluminiumCostPerCm');
    const saveCostSettingsBtn = document.getElementById('saveCostSettingsBtn');

    // Action Buttons
    const clearAllBtn = document.getElementById('clearAllBtn');
    const printBtn = document.getElementById('printBtn');

    // --- Global Değişkenler ---
    const dataPath = window.electronAPI ? window.electronAPI.resolvePath(__dirname, 'data.json') : './data.json';
    let fabricData = { 
        fabricSeries: [],
        costSettings: {
            fixedCostPerUnit: 25,
            aluminiumCostPerCm: 0.8
        },
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
    };
    let calculations = [];
    let costCalculations = [];
    let calculationCount = 0; // Desktop hesaplama sayacı

    // --- Navigation Functions ---
    function initNavigation() {
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetView = link.dataset.view;
                if (targetView) {
                    switchView(targetView);
                    // Update active state
                    navLinks.forEach(l => l.classList.remove('active'));
                    link.classList.add('active');
                }
            });
        });
    }

    function switchView(viewName) {
        views.forEach(view => view.classList.remove('active'));
        const targetView = document.getElementById(viewName);
        if (targetView) {
            targetView.classList.add('active');
        }
        
        // Switch view successfully
    }

    // --- Data Functions ---
    async function loadAndRenderData() {
        try {
            let rawData;
            if (window.electronAPI && window.electronAPI.fileExists(dataPath)) {
                rawData = window.electronAPI.readFile(dataPath);
            } else {
                // Fallback for browser environment or missing file
                try {
                    const response = await fetch('./data.json');
                    rawData = await response.text();
                } catch (e) {
                    rawData = null;
                }
            }
            
            if (rawData) {
                const loadedData = JSON.parse(rawData);
                
                // Migration for older data format
                if (!loadedData.createdAt) {
                    loadedData.createdAt = new Date().toISOString();
                }
                if (!loadedData.lastModified) {
                    loadedData.lastModified = new Date().toISOString();
                }
                
                // Migration for cost settings
                if (!loadedData.costSettings) {
                    loadedData.costSettings = {
                        fixedCostPerUnit: 25,
                        aluminiumCostPerCm: 0.8,
                        createdAt: new Date().toISOString(),
                        lastModified: new Date().toISOString()
                    };
                }
                
                // Migration for fabric cost data
                loadedData.fabricSeries.forEach(series => {
                    if (!series.cost) {
                        series.cost = Math.round(series.price * 0.5); // Default cost as 50% of price
                    }
                });
                
                fabricData = loadedData;
            } else {
                // Create initial data structure
                fabricData = {
                    fabricSeries: [
                        { name: 'Standart Plise', price: 350, cost: 180, createdAt: new Date().toISOString() },
                        { name: 'Blackout Plise', price: 450, cost: 220, createdAt: new Date().toISOString() },
                        { name: 'Premium Plise', price: 650, cost: 350, createdAt: new Date().toISOString() }
                    ],
                    costSettings: {
                        fixedCostPerUnit: 25,
                        aluminiumCostPerCm: 0.8,
                        createdAt: new Date().toISOString(),
                        lastModified: new Date().toISOString()
                    },
                    createdAt: new Date().toISOString(),
                    lastModified: new Date().toISOString()
                };
                await saveData();
            }
        } catch (error) {
            console.error('Veri yüklenirken veya oluşturulurken hata:', error);
            showNotification('Hata: data.json dosyası okunamadı veya oluşturulamadı.', 'error');
            return;
        }
        renderFabricDropdown();
        renderFabricManagementTable();
        loadCostSettings();
    }

    async function saveData() {
        try {
            fabricData.lastModified = new Date().toISOString();
            
            // Electron API kullanarak dosya yazma
            if (window.electronAPI) {
                const success = window.electronAPI.writeFile(dataPath, JSON.stringify(fabricData, null, 2));
                if (success) {
                    showNotification('Değişiklikler başarıyla kaydedildi!', 'success');
                } else {
                    throw new Error('Dosya yazma başarısız');
                }
            } else {
                // Browser environment - localStorage kullan
                localStorage.setItem('fabricData', JSON.stringify(fabricData));
                showNotification('Değişiklikler yerel olarak kaydedildi!', 'success');
            }
            
            renderFabricDropdown();
            renderFabricManagementTable();
        } catch (error) {
            console.error('Veri kaydedilirken hata:', error);
            showNotification('Hata: Veriler kaydedilemedi.', 'error');
        }
    }

    // --- UI Rendering Functions ---
    function renderFabricDropdown() {
        if (!fabricTypeSelect) return;
        
        fabricTypeSelect.innerHTML = '';
        fabricData.fabricSeries.forEach(series => {
            const option = document.createElement('option');
            option.value = series.price;
            option.textContent = `${series.name} (${series.price} TL/m²)`;
            fabricTypeSelect.appendChild(option);
        });
    }

    function renderFabricManagementTable() {
        if (!fabricManagementTable) return;
        
        fabricManagementTable.innerHTML = '';
        fabricData.fabricSeries.forEach((series, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${series.name}</td>
                <td>${series.price} TL</td>
                <td>${series.cost || 0} TL</td>
                <td>
                    <div class="table-actions">
                        <button class="modern-btn edit-btn" data-index="${index}">
                            <span class="icon-edit"></span> Düzenle
                        </button>
                        <button class="modern-btn danger delete-btn" data-index="${index}">
                            <span class="icon-trash"></span> Sil
                        </button>
                    </div>
                </td>
            `;
            fabricManagementTable.appendChild(row);
        });
    }

    function renderCalculationResult() {
        if (!resultTable) return;
        
        resultTable.innerHTML = '';
        calculations.forEach((calc, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${calc.quantity}</td>
                <td>${calc.width} cm</td>
                <td>${calc.height} cm</td>
                <td>${calc.area} m²</td>
                <td>${calc.fabricName}</td>
                <td>${calc.price} TL</td>
                <td>
                    <button class="modern-btn danger remove-calc-btn" data-index="${index}">
                        <span class="icon-trash"></span> Sil
                    </button>
                </td>
            `;
            resultTable.appendChild(row);
        });
        
        const total = calculations.reduce((sum, calc) => sum + parseFloat(calc.price), 0);
        if (totalPriceEl) {
            totalPriceEl.innerHTML = `💰 Toplam Satış Tutarı: ${total.toFixed(2)} TL`;
        }
        
        // Show/hide results container based on calculations
        const resultsContainer = document.getElementById('results');
        if (resultsContainer) {
            resultsContainer.style.display = calculations.length > 0 ? 'block' : 'none';
            if (calculations.length > 0) {
                resultsContainer.classList.add('has-content');
            } else {
                resultsContainer.classList.remove('has-content');
            }
        }
        
        // Don't auto-show cost analysis - only when button is clicked
        // Cost analysis will be shown only when calculateCostBtn is clicked
    }

    function resetFabricForm() {
        if (fabricNameInput) fabricNameInput.value = '';
        if (fabricPriceInput) fabricPriceInput.value = '';
        if (fabricCostInput) fabricCostInput.value = '';
        if (editIndexInput) editIndexInput.value = '';
        if (saveFabricBtn) saveFabricBtn.innerHTML = '<span class="icon-save"></span> Yeni Kumaş Ekle';
        if (cancelEditBtn) cancelEditBtn.style.display = 'none';
    }

    // --- Cost Analysis Functions ---
    function loadCostSettings() {
        if (!fabricData.costSettings) return;
        
        if (fixedCostPerUnitInput) fixedCostPerUnitInput.value = fabricData.costSettings.fixedCostPerUnit || 25;
        if (aluminiumCostPerCmInput) aluminiumCostPerCmInput.value = fabricData.costSettings.aluminiumCostPerCm || 0.8;
    }

    function calculateCostAnalysis() {
        if (calculations.length === 0) {
            showNotification('Önce hesaplama yapmanız gerekiyor!', 'error');
            return;
        }

        costCalculations = [];
        let totalCost = 0;
        let totalRevenue = 0;

        calculations.forEach(calc => {
            // Find fabric cost
            const fabricSeries = fabricData.fabricSeries.find(series => 
                calc.fabricName === series.name
            );
            
            if (!fabricSeries) return;

            const fabricCostPerM2 = fabricSeries.cost || 0;
            const area = parseFloat(calc.area);
            const quantity = parseInt(calc.quantity, 10) || 1;
            const width = parseFloat(calc.width);

            // Cost calculations
            const fabricCost = fabricCostPerM2 * area * quantity;
            const fixedCost = (fabricData.costSettings.fixedCostPerUnit || 25) * quantity;
            const aluminiumLength = width * 2; // 2x width for aluminum
            const aluminiumCost = aluminiumLength * (fabricData.costSettings.aluminiumCostPerCm || 0.8) * quantity;

            const totalItemCost = fabricCost + fixedCost + aluminiumCost;
            const revenue = parseFloat(calc.price);
            const profit = revenue - totalItemCost;
            const profitMargin = revenue > 0 ? ((profit / revenue) * 100) : 0;

            const costCalc = {
                quantity: quantity,
                fabricCost: fabricCost.toFixed(2),
                fixedCost: fixedCost.toFixed(2),
                aluminiumCost: aluminiumCost.toFixed(2),
                totalCost: totalItemCost.toFixed(2),
                profit: profit.toFixed(2),
                profitMargin: profitMargin.toFixed(1)
            };

            costCalculations.push(costCalc);
            totalCost += totalItemCost;
            totalRevenue += revenue;
        });

        renderCostAnalysis();
        
        // Show cost analysis section
        if (costAnalysisDiv) {
            costAnalysisDiv.style.display = 'block';
        }
        
        // Update totals
        const totalProfit = totalRevenue - totalCost;
        if (totalRevenueEl) {
            totalRevenueEl.innerHTML = `💸 Toplam Satış: ${totalRevenue.toFixed(2)} TL`;
        }
        if (totalCostEl) {
            totalCostEl.innerHTML = `💰 Toplam Maliyet: ${totalCost.toFixed(2)} TL`;
        }
        if (totalProfitEl) {
            totalProfitEl.innerHTML = `📈 Toplam Kar: ${totalProfit.toFixed(2)} TL (${totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0}%)`;
            totalProfitEl.style.color = totalProfit >= 0 ? '#388e3c' : '#ef4444';
        }

        showNotification('Maliyet analizi tamamlandı!', 'success');
    }

    function renderCostAnalysis() {
        if (!costTable) return;
        
        costTable.innerHTML = '';
        costCalculations.forEach((cost, index) => {
            const row = document.createElement('tr');
            const profitColor = parseFloat(cost.profit) >= 0 ? '#10b981' : '#ef4444';
            
            row.innerHTML = `
                <td>${cost.quantity}</td>
                <td>${cost.fabricCost} TL</td>
                <td>${cost.fixedCost} TL</td>
                <td>${cost.aluminiumCost} TL</td>
                <td><strong>${cost.totalCost} TL</strong></td>
                <td style="color: ${profitColor}; font-weight: 600;">${cost.profit} TL</td>
                <td style="color: ${profitColor}; font-weight: 600;">${cost.profitMargin}%</td>
            `;
            costTable.appendChild(row);
        });
    }

    function clearCostAnalysis() {
        costCalculations = [];
        if (costTable) costTable.innerHTML = '';
        if (totalRevenueEl) {
            totalRevenueEl.innerHTML = `💸 Toplam Satış: 0 TL`;
        }
        if (totalCostEl) {
            totalCostEl.innerHTML = `💰 Toplam Maliyet: 0 TL`;
        }
        if (totalProfitEl) {
            totalProfitEl.innerHTML = `📈 Toplam Kar: 0 TL`;
        }
        
        // Hide cost analysis section
        if (costAnalysisDiv) {
            costAnalysisDiv.style.display = 'none';
        }
        
        showNotification('Maliyet analizi temizlendi!', 'info');
    }

    // --- Notification System ---
    function showNotification(message, type = 'info') {
        // Create notification element if it doesn't exist
        let notification = document.querySelector('.notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.className = 'notification';
            document.body.appendChild(notification);
        }

        // Set notification content and style
        notification.textContent = message;
        notification.className = `notification ${type} show`;

        // Add notification styles if not already added
        if (!document.querySelector('#notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 12px 20px;
                    border-radius: 8px;
                    color: white;
                    font-weight: 500;
                    z-index: 10000;
                    transform: translateX(100%);
                    transition: transform 0.3s ease;
                }
                .notification.show { transform: translateX(0); }
                .notification.success { background: #10b981; }
                .notification.error { background: #ef4444; }
                .notification.info { background: #3b82f6; }
            `;
            document.head.appendChild(styles);
        }

        // Auto hide after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    // --- Event Listeners ---

    // Navigation
    initNavigation();

    // Calculate Button
    if (calculateBtn) {
        calculateBtn.addEventListener('click', () => {
            const width = parseFloat(widthInput?.value);
            const height = parseFloat(heightInput?.value);
            const quantity = parseInt(quantityInput?.value, 10) || 1;
            const selectedFabricPrice = parseFloat(fabricTypeSelect?.value);
            const selectedFabricName = fabricTypeSelect?.options[fabricTypeSelect.selectedIndex]?.text.split(' (')[0];

            if (isNaN(width) || isNaN(height) || isNaN(quantity) || width <= 0 || height <= 0 || quantity <= 0) {
                showNotification('Lütfen geçerli değerler girin!', 'error');
                return;
            }

            if (isNaN(selectedFabricPrice)) {
                showNotification('Lütfen kumaş türü seçin!', 'error');
                return;
            }

            const area = (width / 100) * (height / 100);
            const effectiveArea = Math.max(area, 1); // Minimum 1 m² kuralı
            const singlePrice = effectiveArea * selectedFabricPrice;
            const totalPriceForLine = singlePrice * quantity;

            const newCalc = {
                quantity: quantity,
                width: width,
                height: height,
                area: effectiveArea.toFixed(2),
                fabricName: selectedFabricName,
                price: totalPriceForLine.toFixed(2),
                createdAt: new Date().toISOString()
            };
            calculations.push(newCalc);

            // Desktop integration
            calculationCount++;
            const countElement = document.getElementById('calculation-count');
            if (countElement) {
                countElement.textContent = `${calculationCount} Hesaplama`;
            }

            renderCalculationResult();
            showNotification('Hesaplama başarıyla eklendi!', 'success');

            // Clear form
            if (widthInput) widthInput.value = '';
            if (heightInput) heightInput.value = '';
            if (quantityInput) quantityInput.value = '1';
            if (widthInput) widthInput.focus();
        });
    }

    // Clear All Calculations
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', () => {
            if (calculations.length === 0) {
                showNotification('Temizlenecek hesaplama yok.', 'info');
                return;
            }
            
            if (confirm('Tüm hesaplamaları silmek istediğinizden emin misiniz?')) {
                calculations = [];
                calculationCount = 0;
                const countElement = document.getElementById('calculation-count');
                if (countElement) {
                    countElement.textContent = '0 Hesaplama';
                }
                
                // Also clear and hide cost analysis
                clearCostAnalysis();
                
                renderCalculationResult();
                showNotification('Tüm hesaplamalar temizlendi.', 'success');
            }
        });
    }

    // Print Button
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            if (calculations.length === 0) {
                showNotification('Yazdırılacak hesaplama yok.', 'info');
                return;
            }
            window.print();
        });
    }

    // Save Fabric Button
    if (saveFabricBtn) {
        saveFabricBtn.addEventListener('click', async () => {
            const name = fabricNameInput?.value.trim();
            const price = parseFloat(fabricPriceInput?.value);
            const cost = parseFloat(fabricCostInput?.value) || 0;
            const editIndex = editIndexInput?.value;

            if (!name || isNaN(price) || price <= 0) {
                showNotification('Lütfen geçerli kumaş adı ve fiyatı girin!', 'error');
                return;
            }

            // Check for duplicate names
            const existingIndex = fabricData.fabricSeries.findIndex(series => 
                series.name.toLowerCase() === name.toLowerCase() && editIndex !== String(fabricData.fabricSeries.indexOf(series))
            );
            
            if (existingIndex !== -1) {
                showNotification('Bu isimde bir kumaş zaten mevcut!', 'error');
                return;
            }

            if (editIndex !== '' && editIndex >= 0) {
                // Update existing fabric
                fabricData.fabricSeries[editIndex].name = name;
                fabricData.fabricSeries[editIndex].price = price;
                fabricData.fabricSeries[editIndex].cost = cost;
                showNotification('Kumaş başarıyla güncellendi!', 'success');
            } else {
                // Add new fabric
                fabricData.fabricSeries.push({
                    name: name,
                    price: price,
                    cost: cost,
                    createdAt: new Date().toISOString()
                });
                showNotification('Yeni kumaş başarıyla eklendi!', 'success');
            }

            await saveData();
            resetFabricForm();
        });
    }

    // Cancel Edit Button
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', () => {
            resetFabricForm();
            showNotification('Düzenleme iptal edildi.', 'info');
        });
    }

    // Fabric Management Table Events
    if (fabricManagementTable) {
        fabricManagementTable.addEventListener('click', async (e) => {
            const button = e.target.closest('button');
            if (!button) return;
            
            const index = button.dataset.index;
            if (index === undefined) return;

            if (button.classList.contains('delete-btn')) {
                if (confirm('Bu kumaşı silmek istediğinizden emin misiniz?')) {
                    fabricData.fabricSeries.splice(index, 1);
                    await saveData();
                    showNotification('Kumaş başarıyla silindi!', 'success');
                }
            } else if (button.classList.contains('edit-btn')) {
                const fabric = fabricData.fabricSeries[index];
                if (fabricNameInput) fabricNameInput.value = fabric.name;
                if (fabricPriceInput) fabricPriceInput.value = fabric.price;
                if (fabricCostInput) fabricCostInput.value = fabric.cost || 0;
                if (editIndexInput) editIndexInput.value = index;
                if (saveFabricBtn) saveFabricBtn.innerHTML = '<span class="icon-save"></span> Kumaşı Güncelle';
                if (cancelEditBtn) cancelEditBtn.style.display = 'inline-block';
                showNotification('Kumaş düzenleme moduna alındı.', 'info');
            }
        });
    }

    // Result Table Events (Remove individual calculations)
    if (resultTable) {
        resultTable.addEventListener('click', (e) => {
            if (e.target.closest('.remove-calc-btn')) {
                const index = e.target.closest('.remove-calc-btn').dataset.index;
                calculations.splice(index, 1);
                calculationCount = calculations.length;
                const countElement = document.getElementById('calculation-count');
                if (countElement) {
                    countElement.textContent = `${calculationCount} Hesaplama`;
                }
                renderCalculationResult();
                showNotification('Hesaplama silindi.', 'success');
            }
        });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Enter key on width/height inputs
        if (e.key === 'Enter' && (e.target === widthInput || e.target === heightInput)) {
            if (calculateBtn) calculateBtn.click();
        }
        
        // Escape key to clear form
        if (e.key === 'Escape') {
            if (widthInput) widthInput.value = '';
            if (heightInput) heightInput.value = '';
            if (quantityInput) quantityInput.value = '1';
            resetFabricForm();
        }
    });

    // Auto-focus on width input when calculator view is active
    const calculatorView = document.getElementById('calculator');
    if (calculatorView) {
        const observer = new MutationObserver(() => {
            if (calculatorView.classList.contains('active') && widthInput) {
                setTimeout(() => widthInput.focus(), 100);
            }
        });
        observer.observe(calculatorView, { attributes: true, attributeFilter: ['class'] });
    }

    // Cost Settings Save Button
    if (saveCostSettingsBtn) {
        saveCostSettingsBtn.addEventListener('click', async () => {
            const fixedCost = parseFloat(fixedCostPerUnitInput?.value) || 25;
            const aluminiumCost = parseFloat(aluminiumCostPerCmInput?.value) || 0.8;

            fabricData.costSettings = {
                fixedCostPerUnit: fixedCost,
                aluminiumCostPerCm: aluminiumCost,
                lastModified: new Date().toISOString()
            };

            await saveData();
            showNotification('Maliyet ayarları başarıyla kaydedildi!', 'success');
        });
    }

    // Calculate Cost Button
    if (calculateCostBtn) {
        calculateCostBtn.addEventListener('click', () => {
            if (calculations.length === 0) {
                showNotification('Önce hesaplama yapmanız gerekiyor!', 'error');
                return;
            }
            calculateCostAnalysis();
        });
    }

    // Clear Cost Button
    if (clearCostBtn) {
        clearCostBtn.addEventListener('click', () => {
            clearCostAnalysis();
        });
    }

    // --- About Page Functions ---
    function showAboutPage() {
        const aboutHtmlPath = 'src/views/about.html';
        try {
            const aboutHtml = fs.readFileSync(aboutHtmlPath, 'utf8');
            appContainer.innerHTML = aboutHtml;
            switchView('about');

            // Move the logo out of the hero and into the container for better positioning
            const container = document.querySelector('.about-container');
            const logo = document.querySelector('.about-hero-logo');
            if (container && logo) {
                container.prepend(logo);
            }

        } catch (error) {
            console.error('Error loading about page:', error);
            showNotification('Hakkında sayfası yüklenemedi.', 'error');
        }
    }

    // Web sitesi açma fonksiyonu
    window.openWebsite = function(url) {
        if (window.electronAPI && window.electronAPI.openExternal) {
            // Electron ortamında güvenli shell.openExternal kullan
            window.electronAPI.openExternal(url);
        } else {
            // Web ortamında normal window.open kullan
            window.open(url, '_blank');
        }
        showNotification('Web sitesi açılıyor...', 'info');
    };

    // E-posta gönderme fonksiyonu
    window.sendEmail = function(email) {
        const subject = encodeURIComponent('Plise Perde Hesaplayıcı Hakkında');
        const body = encodeURIComponent('Merhaba Tengra Works ekibi,\n\nPlise Perde Hesaplayıcı uygulaması hakkında bilgi almak istiyorum.\n\nTeşekkürler.');
        const mailtoUrl = `mailto:${email}?subject=${subject}&body=${body}`;
        
        if (window.electronAPI && window.electronAPI.openExternal) {
            // Electron ortamında güvenli shell.openExternal kullan
            window.electronAPI.openExternal(mailtoUrl);
        } else {
            // Web ortamında normal window.location kullan
            window.location.href = mailtoUrl;
        }
        
        showNotification('E-posta uygulamanız açılıyor...', 'info');
    };

        // --- Initialize Application ---
    loadAndRenderData();
    switchView('calculator');

    // About Page Functions - Global olarak tanımlanıyor
    window.openWebsite = function(url) {
        if (window.electronAPI && window.electronAPI.openExternal) {
            window.electronAPI.openExternal(url);
        } else {
            window.open(url, '_blank');
        }
        showNotification('Web tarayıcınızda açılıyor...', 'info');
    };

    window.sendEmail = function(email) {
        const subject = 'Plise Perde Hesaplayıcı - Destek Talebi';
        const body = 'Merhaba,\\n\\nPlise Perde Hesaplayıcı programı hakkında yardıma ihtiyacım var.\\n\\nSorum/Talebim:\\n\\n\\nTeşekkürler.';
        const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        
        if (window.electronAPI && window.electronAPI.openExternal) {
            window.electronAPI.openExternal(mailtoUrl);
        } else {
            window.location.href = mailtoUrl;
        }
        
        showNotification('E-posta uygulamanız açılıyor...', 'info');
    };

    // Menu Event Listeners (Electron)
    if (window.electronAPI && window.electronAPI.onMenuAction) {
        window.electronAPI.onMenuAction((action) => {
            if (action === 'show-about') {
                showAboutPage();
            } else if (action === 'show-help') {
                // Switch to about page instead of showing help notification
                switchView('about');
                // Update navigation
                const aboutLink = document.querySelector('[data-view="about"]');
                const navLinks = document.querySelectorAll('.nav-link');
                if (aboutLink) {
                    navLinks.forEach(l => l.classList.remove('active'));
                    aboutLink.classList.add('active');
                }
            }
        });
    }
});
