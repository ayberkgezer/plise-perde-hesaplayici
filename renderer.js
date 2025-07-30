// SQLite Database ile Electron API kullanarak uygulamayı yönet

function waitForDOMReady() {
    return new Promise((resolve) => {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', resolve);
        } else {
            resolve();
        }
    });
}

async function initializeApp() {
    // DOM'un tam yüklendiğini bekle
    await waitForDOMReady();
    
    // Platform Detection - Title bar'ı platform bazında ayarla
    const titleBar = document.querySelector('.title-bar');
    const titleBarControls = document.querySelector('.title-bar-controls');
    const isMac = window.electronAPI?.platform === 'darwin' || navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    
    // Wait for electronAPI to be available if not yet ready
    if (!window.electronAPI) {
        await new Promise(resolve => {
            const checkAPI = () => {
                if (window.electronAPI) {
                    resolve();
                } else {
                    setTimeout(checkAPI, 100);
                }
            };
            checkAPI();
        });
    }

    // Platform-specific title bar configuration
    // Note: desktop-controls.js already adds platform-* classes to body
    if (isMac) {
        titleBar?.classList.add('mac-platform');
        titleBarControls?.classList.add('mac-platform');
    } else {
        // Windows/Linux - ensure title bar controls are visible
        titleBar?.classList.add('win-platform');
        titleBarControls?.classList.add('win-platform');
        
        // Explicitly ensure controls are visible on Windows
        if (titleBarControls) {
            titleBarControls.style.display = 'flex';
            titleBarControls.style.visibility = 'visible';
        }
    }    // --- Element Referansları ---
    
    // DOM'un tam hazır olmasını bekle
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const fabricTypeSelect = document.getElementById('fabricType');
    const calculateBtn = document.getElementById('calculateBtn');
    const resultTable = document.getElementById('resultTable');
    const totalPriceEl = document.getElementById('totalPrice');
    const widthInput = document.getElementById('width');
    const heightInput = document.getElementById('height');
    const quantityInput = document.getElementById('quantity');

    if (!fabricTypeSelect) {
    }

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
    const pliseCuttingMultiplierInput = document.getElementById('pliseCuttingMultiplier');
    const saveCostSettingsBtn = document.getElementById('saveCostSettingsBtn');

    // Action Buttons
    const clearAllBtn = document.getElementById('clearAllBtn');
    const printBtn = document.getElementById('printBtn');

    // --- Global Değişkenler ---
    let fabricSeries = [];
    let costSettings = {
        fixed_cost_per_unit: 25,
        aluminium_cost_per_cm: 0.8,
        plise_cutting_multiplier: 2.1
    };
    let calculations = [];
    // Make calculations globally accessible
    window.calculations = calculations;
    let calculationCount = 0;
    let editingFabricId = null;

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
    }

    // --- Database Functions ---
    async function loadFabricSeries() {
        try {
            if (!window.electronAPI) {
                throw new Error('electronAPI not available');
            }
            fabricSeries = await window.electronAPI.getFabricSeries();
            renderFabricDropdown();
            renderFabricManagementTable();
        } catch (error) {

        }
    }

    async function loadCostSettings() {
        try {
            if (!window.electronAPI) {
                throw new Error('electronAPI not available');
            }
            const oldSettings = { ...costSettings };
            costSettings = await window.electronAPI.getCostSettings();
            
            if (fixedCostPerUnitInput) {
                fixedCostPerUnitInput.value = costSettings.fixed_cost_per_unit || 25;
            }
            if (aluminiumCostPerCmInput) {
                aluminiumCostPerCmInput.value = costSettings.aluminium_cost_per_cm || 0.8;
            }
            if (pliseCuttingMultiplierInput) {
                pliseCuttingMultiplierInput.value = costSettings.plise_cutting_multiplier || 2.1;
            }
            
            renderCostSettingsTable();
        } catch (error) {

        }
    }

    async function loadCalculations() {
        // Hafızadan yükleme yapıyoruz, veritabanından değil
        // calculations zaten hafızada tutuluyor
        renderCalculationResult();
    }

    // --- UI Rendering Functions ---
    function renderFabricDropdown() {
        if (!fabricTypeSelect) {
            return;
        }
        
        fabricTypeSelect.innerHTML = '<option value="">Kumaş Tipi Seçin</option>';
        fabricSeries.forEach(fabric => {
            const option = document.createElement('option');
            option.value = fabric.id;
            option.textContent = `${fabric.name} - ${fabric.price}₺/m²`;
            option.dataset.price = fabric.price;
            option.dataset.cost = fabric.cost;
            fabricTypeSelect.appendChild(option);
        });
    }

    function renderFabricManagementTable() {
        if (!fabricManagementTable) return;
        
        fabricManagementTable.innerHTML = '';
        
        fabricSeries.forEach(fabric => {
            const row = document.createElement('tr');
            // Tarihleri formatla
            const createdDate = fabric.created_at ? new Date(fabric.created_at).toLocaleDateString('tr-TR') : '-';
            
            row.innerHTML = `
                <td>${fabric.id}</td>
                <td>${fabric.name}</td>
                <td>${fabric.price}₺</td>
                <td>${fabric.cost}₺</td>
                <td>${createdDate}</td>
                <td>
                    <button class="btn btn-edit" onclick="editFabric(${fabric.id})">
                        <span class="icon icon-edit"></span> Düzenle
                    </button>
                    <button class="btn btn-delete" onclick="deleteFabric(${fabric.id})">
                        <span class="icon icon-trash"></span> Sil
                    </button>
                </td>
            `;
            fabricManagementTable.appendChild(row);
        });
    }

    function renderCostSettingsTable() {
        const costSettingsTable = document.getElementById('costSettingsTable');
        
        if (!costSettingsTable || !costSettings) {
            return;
        }
        
        costSettingsTable.innerHTML = '';
        
        // Maliyet ayarları tek bir kayıt olduğu için array olarak sarmalayalım
        const settingsArray = Array.isArray(costSettings) ? costSettings : [costSettings];
        
        settingsArray.forEach((settings, index) => {
            const row = document.createElement('tr');
            const createdDate = settings.created_at ? new Date(settings.created_at).toLocaleDateString('tr-TR') : '-';
            const updatedDate = settings.updated_at ? new Date(settings.updated_at).toLocaleDateString('tr-TR') : '-';
            
            row.innerHTML = `
                <td>${settings.id || index + 1}</td>
                <td>${settings.fixed_cost_per_unit || 25}₺</td>
                <td>${settings.aluminium_cost_per_cm || 0.8}₺</td>
                <td>${settings.plise_cutting_multiplier || 2.1}</td>
                <td>${createdDate}</td>
                <td>${updatedDate}</td>
                <td>
                    <button class="btn btn-edit" onclick="editCostSettings()">
                        <span class="icon icon-edit"></span> Düzenle
                    </button>
                </td>
            `;
            costSettingsTable.appendChild(row);
        });
    }

    function renderCalculationResult() {
        if (!resultTable) {
            return;
        }
        
        // Results div'ini bul ve görünür yap
        const resultsDiv = document.getElementById('results');
        if (resultsDiv) {
            resultsDiv.style.display = 'block';
            if (calculations.length > 0) {
                resultsDiv.classList.add('has-content');
            } else {
                resultsDiv.classList.remove('has-content');
            }
        }
        
        // resultTable zaten tbody elementi
        resultTable.innerHTML = '';
        
        let totalRevenue = 0;
        
        calculations.forEach((calc, index) => {
            const row = document.createElement('tr');
            const fabricName = calc.fabric_name || 'Bilinmiyor';
            const area = calc.area || (calc.width * calc.height) / 10000; // m² cinsinden alan
            const displayArea = area.toFixed(4); // Alan hesaplamaları 4 basamak (0.0000)
            
            row.innerHTML = `
                <td>${calc.quantity}</td>
                <td>${calc.width}</td>
                <td>${calc.height}</td>
                <td>${displayArea} m²</td>
                <td>${fabricName}</td>
                <td>${calc.total_price.toFixed(2)}₺</td>
                <td>
                    <button class="btn btn-delete btn-small" onclick="removeCalculationFromMemory(${index})">
                        <span class="icon icon-trash"></span> Sil
                    </button>
                </td>
            `;
            resultTable.appendChild(row);
            totalRevenue += calc.total_price;
        });
        
        if (totalPriceEl) {
            totalPriceEl.textContent = `💰 Toplam Satış Tutarı: ${totalRevenue.toFixed(2)} TL`;
        }
        
        calculationCount = calculations.length;
    }

    function resetFabricForm() {
        if (fabricNameInput) {
            fabricNameInput.value = '';
            fabricNameInput.removeAttribute('disabled');
        }
        if (fabricPriceInput) {
            fabricPriceInput.value = '';
            fabricPriceInput.removeAttribute('disabled');
        }
        if (fabricCostInput) {
            fabricCostInput.value = '';
            fabricCostInput.removeAttribute('disabled');
        }
        if (editIndexInput) editIndexInput.value = '';
        editingFabricId = null;
        
        if (saveFabricBtn) saveFabricBtn.textContent = 'Kumaş Ekle';
        if (cancelEditBtn) cancelEditBtn.style.display = 'none';
        
        // Input alanlarının focus edilebilirliğini garantile - Windows uyumlu
        setTimeout(() => {
            [fabricNameInput, fabricPriceInput, fabricCostInput].forEach(input => {
                if (input) {
                    // Temel özellikleri resetle
                    input.style.pointerEvents = 'auto';
                    input.style.userSelect = 'text';
                    input.style.webkitUserSelect = 'text';
                    input.style.mozUserSelect = 'text';
                    input.style.msUserSelect = 'text';
                    input.style.cursor = 'text';
                    input.tabIndex = 0;
                    input.removeAttribute('disabled');
                    input.removeAttribute('readonly');
                    
                    // Windows için özel ayarlar
                    input.style.webkitAppearance = 'none';
                    input.style.appearance = 'none';
                    input.style.msTouchAction = 'manipulation';
                    input.style.touchAction = 'manipulation';
                    
                    // Event listener'ları yeniden ekle
                    input.addEventListener('focus', function() {
                        this.style.pointerEvents = 'auto';
                        this.style.userSelect = 'text';
                        this.style.webkitUserSelect = 'text';
                        this.style.mozUserSelect = 'text';
                        this.style.msUserSelect = 'text';
                    });
                    input.addEventListener('click', function() {
                        this.focus();
                        this.select(); // Windows'ta metin seçimi için
                    });
                    input.addEventListener('mousedown', function(e) {
                        e.stopPropagation();
                    });
                }
            });
            fixInputFocus(); // Tüm input'ları bir kez daha kontrol et
        }, 100);
    }

    // --- Calculation Functions ---
    async function performCalculation() {
        if (!fabricTypeSelect || !widthInput || !heightInput || !quantityInput) {

            return;
        }

        const fabricId = parseInt(fabricTypeSelect.value);
        const width = parseFloat(widthInput.value);
        const height = parseFloat(heightInput.value);
        const quantity = parseInt(quantityInput.value);

        if (!fabricId || isNaN(width) || isNaN(height) || isNaN(quantity)) {
            // Eksik bilgi uyarısı
            if (!fabricId) {
                showCalculatorNotification('Lütfen kumaş türünü seçin!', 'error');
            } else if (isNaN(width) || width <= 0) {
                showCalculatorNotification('Lütfen geçerli bir genişlik girin!', 'error');
            } else if (isNaN(height) || height <= 0) {
                showCalculatorNotification('Lütfen geçerli bir yükseklik girin!', 'error');
            } else if (isNaN(quantity) || quantity <= 0) {
                showCalculatorNotification('Lütfen geçerli bir adet girin!', 'error');
            }
            return;
        }

        const selectedFabric = fabricSeries.find(f => f.id === fabricId);
        if (!selectedFabric) {

            return;
        }

        try {
            // Hesaplama işlemi
            const area = (width * height) / 10000; // m² cinsinden gerçek alan
            const billingArea = Math.max(area, 1); // Minimum 1 m² fiyatlandırma
            
            const unitPrice = selectedFabric.price * billingArea;
            const totalPrice = unitPrice * quantity;
            
            // Alüminyum maliyeti: genişlik * 2 * alüminyum_cost_per_cm
            const aluminiumCostPerUnit = costSettings.aluminium_cost_per_cm * width * 2;
            
            const unitCost = (selectedFabric.cost * billingArea) + 
                           costSettings.fixed_cost_per_unit + 
                           aluminiumCostPerUnit;
            const totalCost = unitCost * quantity;
            const profit = totalPrice - totalCost;

            // Hafızaya kaydet (veritabanına değil)
            const calculation = {
                id: Date.now(), // Benzersiz ID için timestamp kullan
                fabric_series_id: fabricId,
                fabric_name: selectedFabric.name,
                width: width,
                height: height,
                quantity: quantity,
                area: area, // Gerçek alan
                billing_area: billingArea, // Fiyatlandırma alanı
                unit_price: unitPrice,
                total_price: totalPrice,
                unit_cost: unitCost,
                total_cost: totalCost,
                profit: profit
            };

            // Calculations dizisine ekle
            calculations.push(calculation);
            // Update global reference
            window.calculations = calculations;
            
            // Tabloyu güncelle
            renderCalculationResult();
            
            // Yeni eklenen satıra scroll yap
            setTimeout(() => {
                const tableContainer = document.querySelector('.table-container');
                const resultTable = document.getElementById('resultTable');
                if (tableContainer && resultTable && resultTable.lastElementChild) {
                    // Table container içinde scroll yap
                    const lastRow = resultTable.lastElementChild;
                    const containerHeight = tableContainer.clientHeight;
                    const rowOffsetTop = lastRow.offsetTop;
                    const scrollPosition = Math.max(0, rowOffsetTop - containerHeight + lastRow.clientHeight + 20);
                    
                    tableContainer.scrollTo({ 
                        top: scrollPosition, 
                        behavior: 'smooth' 
                    });
                }
            }, 100);
            

            
            // Form alanlarını temizle ve width input'a odaklan - Windows uyumlu
            widthInput.value = '';
            heightInput.value = '';
            quantityInput.value = '1';
            fabricTypeSelect.selectedIndex = 0;
            
            // Input alanlarının durumunu resetle - Windows için
            [widthInput, heightInput, quantityInput].forEach(input => {
                if (input) {
                    input.style.pointerEvents = 'auto';
                    input.style.userSelect = 'text';
                    input.style.webkitUserSelect = 'text';
                    input.style.mozUserSelect = 'text';
                    input.style.msUserSelect = 'text';
                    input.style.cursor = 'text';
                    input.removeAttribute('disabled');
                    input.removeAttribute('readonly');
                    input.tabIndex = 0;
                }
            });
            
            // Width input'a tekrar odaklan
            setTimeout(() => {
                if (widthInput) {
                    widthInput.focus();
                    widthInput.select(); // Windows'ta metin seçimi için
                }
            }, 200);
            
            // Başarı bildirimi göster
            showCalculatorNotification('Hesaplama başarılı!', 'success');

        } catch (error) {

        }
    }

    // --- Cost Analysis Functions ---
    async function calculateCostAnalysis() {
        if (calculations.length === 0) {
            showCalculatorNotification('Önce hesaplama yapın!', 'error');
            return;
        }

        try {
            // Hafızadaki verilerden maliyet analizi hesapla
            let totalRevenue = 0;
            let totalCost = 0;
            let totalProfit = 0;

            calculations.forEach(calc => {
                totalRevenue += calc.total_price;
                totalCost += calc.total_cost;
                totalProfit += calc.profit;
            });

            if (totalRevenueEl) {
                totalRevenueEl.textContent = `💸 Toplam Satış: ${totalRevenue.toFixed(2)} TL`;
            }
            if (totalCostEl) {
                totalCostEl.textContent = `💰 Toplam Maliyet: ${totalCost.toFixed(2)} TL`;
            }
            if (totalProfitEl) {
                totalProfitEl.textContent = `📈 Toplam Kar: ${totalProfit.toFixed(2)} TL`;
            }

            renderCostAnalysis();
            costAnalysisDiv.style.display = 'block';
            
            // Maliyet analizi bölümüne scroll yap
            setTimeout(() => {
                costAnalysisDiv.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
            }, 100);
            
            // Maliyet analizi bildirimi göster
            showCalculatorNotification('Maliyet analizi tamamlandı!', 'info');
            

        } catch (error) {

        }
    }

    function renderCostAnalysis() {
        if (!costTable) {
            return;
        }
        
        // costTable zaten tbody elementi
        costTable.innerHTML = '';
        
        calculations.forEach((calc, index) => {
            const row = document.createElement('tr');
            const profitMargin = calc.total_price > 0 ? ((calc.profit / calc.total_price) * 100) : 0;
            const fabricName = calc.fabric_name || 'Bilinmiyor';
            
            // Alüminyum maliyeti: genişlik * 2 * alüminyum_cost_per_cm
            const aluminiumCostPerUnit = costSettings.aluminium_cost_per_cm * calc.width * 2;
            
            // Kumaş maliyeti hesapla (sadece kumaş kısmı)
            const fabricCostOnly = (calc.unit_cost - costSettings.fixed_cost_per_unit - aluminiumCostPerUnit) * calc.quantity;
            
            row.innerHTML = `
                <td>${fabricName}</td>
                <td>${calc.width}x${calc.height}</td>
                <td>${calc.quantity}</td>
                <td>${fabricCostOnly.toFixed(2)}₺</td>
                <td>${(costSettings.fixed_cost_per_unit * calc.quantity).toFixed(2)}₺</td>
                <td>${(aluminiumCostPerUnit * calc.quantity).toFixed(2)}₺</td>
                <td>${calc.total_cost.toFixed(2)}₺</td>
                <td class="${calc.profit >= 0 ? 'profit-positive' : 'profit-negative'}">
                    ${calc.profit.toFixed(2)}₺
                </td>
                <td class="${profitMargin >= 0 ? 'profit-positive' : 'profit-negative'}">
                    %${profitMargin.toFixed(1)}
                </td>
            `;
            costTable.appendChild(row);
        });
    }

    async function clearCostAnalysis() {
        // Sadece maliyet analizi tablosunu temizle, hesaplanan ürünleri tut
        if (!costTable) return;
        
        costTable.innerHTML = '';
        
        // Maliyet analizi toplamlarını sıfırla
        if (totalRevenueEl) totalRevenueEl.textContent = '💸 Toplam Satış: 0 TL';
        if (totalCostEl) totalCostEl.textContent = '💰 Toplam Maliyet: 0 TL';
        if (totalProfitEl) totalProfitEl.textContent = '📈 Toplam Kar: 0 TL';
        
        // Maliyet analizi bölümünü gizle
        if (costAnalysisDiv) costAnalysisDiv.style.display = 'none';
        

    }

    async function clearAllCalculations() {
        // Tüm hesaplamaları temizle
        calculations = [];
        renderCalculationResult();

        // Maliyet analizi bölümü varsa ve görünürse temizle
        if (costAnalysisDiv && costAnalysisDiv.style.display !== 'none') {
            renderCostAnalysis();
        }
        
        // Tüm totalleri sıfırla
        if (totalRevenueEl) totalRevenueEl.textContent = '💸 Toplam Satış: 0 TL';
        if (totalCostEl) totalCostEl.textContent = '💰 Toplam Maliyet: 0 TL';
        if (totalProfitEl) totalProfitEl.textContent = '📈 Toplam Kar: 0 TL';
        if (totalPriceEl) totalPriceEl.textContent = '💰 Toplam Satış Tutarı: 0 TL';
        
        // Maliyet analizi bölümünü gizle
        if (costAnalysisDiv) costAnalysisDiv.style.display = 'none';
        
        calculationCount = 0;

    }

    // Hafızadan hesaplama silme fonksiyonu
    window.removeCalculationFromMemory = function(index) {
        calculations.splice(index, 1);
        renderCalculationResult();
        // Eğer maliyet analizi açıksa onu da güncelle
        if (costAnalysisDiv && costAnalysisDiv.style.display !== 'none') {
            renderCostAnalysis();
        }

    };

    // --- Notification Functions ---
    function showCalculatorNotification(message, type = 'success') {
        const notification = document.getElementById('calculatorNotification');
        const textElement = notification.querySelector('.notification-text');
        const iconElement = notification.querySelector('.notification-icon');
        
        if (!notification || !textElement || !iconElement) return;
        
        // Mesaj ve icon ayarla
        textElement.textContent = message;
        
        // Type'a göre icon ve renk ayarla
        if (type === 'success') {
            iconElement.textContent = '✓';
            notification.querySelector('.notification-content').style.background = 
                'linear-gradient(135deg, var(--success-color), var(--success-dark))';
        } else if (type === 'error') {
            iconElement.textContent = '✗';
            notification.querySelector('.notification-content').style.background = 
                'linear-gradient(135deg, var(--danger-color), var(--danger-dark))';
        } else if (type === 'info') {
            iconElement.textContent = 'ℹ';
            notification.querySelector('.notification-content').style.background = 
                'linear-gradient(135deg, var(--primary-color), var(--primary-dark))';
        }
        
        // Bildirimi göster
        notification.classList.add('show');
        
        // Type'a göre görüntüleme süresi ayarla
        const duration = type === 'error' ? 4000 : 3000; // Hata mesajları daha uzun
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, duration);
    }

    // --- Global Functions (called from HTML) ---
    window.editFabric = async function(id) {
        const fabric = fabricSeries.find(f => f.id === id);
        if (!fabric) return;

        fabricNameInput.value = fabric.name;
        fabricPriceInput.value = fabric.price;
        fabricCostInput.value = fabric.cost;
        editingFabricId = id;
        
        saveFabricBtn.textContent = 'Güncelle';
        cancelEditBtn.style.display = 'inline-block';
    };

    window.deleteFabric = async function(id) {
        try {
            await window.electronAPI.deleteFabricSeries(id);
            await loadFabricSeries();

        } catch (error) {

        }
    };

    // Eski veritabanı tabanlı silme fonksiyonu artık kullanılmıyor
    // removeCalculationFromMemory fonksiyonu kullanılıyor

    window.editCostSettings = function() {
        // Form alanlarına mevcut değerleri yükle
        if (fixedCostPerUnitInput && costSettings) {
            fixedCostPerUnitInput.value = costSettings.fixed_cost_per_unit || 25;
        }
        if (aluminiumCostPerCmInput && costSettings) {
            aluminiumCostPerCmInput.value = costSettings.aluminium_cost_per_cm || 0.8;
        }
        if (pliseCuttingMultiplierInput && costSettings) {
            pliseCuttingMultiplierInput.value = costSettings.plise_cutting_multiplier || 2.1;
        }
        
        // Form alanlarını vurgula
        if (fixedCostPerUnitInput) {
            fixedCostPerUnitInput.focus();
            fixedCostPerUnitInput.select();
        }
    };


    // --- Modal Functions ---
    function toggleModal(modalId, show) {
        const modal = document.getElementById(modalId);
        if (modal) {
            if (show) {
                modal.style.display = 'flex';
                modal.classList.add('active');
                document.body.classList.add('modal-open');
            } else {
                modal.style.display = 'none';
                modal.classList.remove('active');
                document.body.classList.remove('modal-open');
            }
        }
    }
    
    // Make toggleModal globally accessible
    window.toggleModal = toggleModal;

    // --- Event Listeners ---

    // Navigation
    initNavigation();

    // Calculate Button
    if (calculateBtn) {
        calculateBtn.addEventListener('click', performCalculation);
    }

    // Clear All Calculations
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', async () => {
            await clearAllCalculations();
        });
    }

    // Print Button
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            window.print();
        });
    }

    // Save Fabric Button
    if (saveFabricBtn) {
        saveFabricBtn.addEventListener('click', async () => {
            const name = fabricNameInput.value.trim();
            const price = parseFloat(fabricPriceInput.value);
            const cost = parseFloat(fabricCostInput.value);

            if (!name || isNaN(price) || isNaN(cost)) {

                return;
            }

            try {
                if (editingFabricId) {
                    // Güncelleme
                    await window.electronAPI.updateFabricSeries(editingFabricId, name, price, cost);

                } else {
                    // Yeni ekleme
                    await window.electronAPI.addFabricSeries(name, price, cost);

                }

                await loadFabricSeries();
                resetFabricForm();
                
                // Form işlemi tamamlandıktan sonra input focus'u sıfırla
                scheduleInputFix();
                setTimeout(() => {
                    fixInputFocus(); // Ekstra güvenlik için
                    if (fabricNameInput) {
                        fabricNameInput.style.pointerEvents = 'auto';
                        fabricNameInput.focus();
                    }
                }, 500); // Süreyi artırdık
            } catch (error) {

            }
        });
    }

    // Cancel Edit Button
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', resetFabricForm);
    }

    // Cost Settings Save Button
    if (saveCostSettingsBtn) {
        saveCostSettingsBtn.addEventListener('click', async () => {
            const fixedCost = parseFloat(fixedCostPerUnitInput.value);
            const aluminiumCost = parseFloat(aluminiumCostPerCmInput.value);
            const pliseMultiplier = parseFloat(pliseCuttingMultiplierInput.value);

            if (isNaN(fixedCost) || isNaN(aluminiumCost) || isNaN(pliseMultiplier)) {

                return;
            }

            try {
                await window.electronAPI.updateCostSettings(fixedCost, aluminiumCost, pliseMultiplier);
                
                // Maliyet ayarlarını güncelle
                await loadCostSettings();
                

                
                // Input alanlarını tekrar odaklanabilir hale getir
                scheduleInputFix();
                setTimeout(() => {
                    fixInputFocus(); // Ekstra güvenlik için
                    if (fixedCostPerUnitInput) {
                        fixedCostPerUnitInput.style.pointerEvents = 'auto';
                        fixedCostPerUnitInput.blur();
                        fixedCostPerUnitInput.focus();
                    }
                }, 500); // Süreyi artırdık
            } catch (error) {

            }
        });
    }

    // Calculate Cost Button
    if (calculateCostBtn) {
        calculateCostBtn.addEventListener('click', calculateCostAnalysis);
    }

    // Clear Cost Button
    if (clearCostBtn) {
        clearCostBtn.addEventListener('click', clearCostAnalysis);
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'Enter':
                    e.preventDefault();
                    if (calculateBtn && !calculateBtn.disabled) {
                        performCalculation();
                    }
                    break;
                case 'n':
                    e.preventDefault();
                    switchView('calculator');
                    if (widthInput) widthInput.focus();
                    break;
            }
        }
    });

    // Auto-focus on width input when calculator view is active
    const calculatorView = document.getElementById('calculator');
    if (calculatorView && widthInput) {
        const observer = new MutationObserver(() => {
            if (calculatorView.classList.contains('active')) {
                setTimeout(() => widthInput.focus(), 100);
            }
        });
        observer.observe(calculatorView, { attributes: true, attributeFilter: ['class'] });
    }

    // --- About Page Functions ---
    function showAboutPage() {
        toggleModal('about-modal', true);
    }

    // Web sitesi açma fonksiyonu
    window.openWebsite = function(url) {
        if (window.electronAPI && window.electronAPI.openExternal) {
            window.electronAPI.openExternal(url);
        } else {
            window.open(url, '_blank');
        }
    };

    // E-posta gönderme fonksiyonu
    window.sendEmail = function(email) {
        if (window.electronAPI && window.electronAPI.openExternal) {
            window.electronAPI.openExternal(`mailto:${email}`);
        } else {
            window.location.href = `mailto:${email}`;
        }
    };

    // Menu Event Listeners (Electron)
    if (window.electronAPI && window.electronAPI.onMenuAction) {
        window.electronAPI.onMenuAction((action) => {
            switch (action) {
                case 'new-calculation':
                    switchView('calculator');
                    if (widthInput) widthInput.focus();
                    break;
                case 'export-data':
                    exportData();
                    break;
                case 'show-about':
                    showAboutPage();
                    break;
                case 'show-help':
                    showAboutPage();
                    break;
            }
        });
    }

    function exportData() {
        const data = {
            calculations: calculations,
            fabricSeries: fabricSeries,
            costSettings: costSettings,
            timestamp: new Date().toISOString(),
            version: '2.0.0'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `plise-perde-hesaplamalari-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        

    }

    // --- Initialize Application ---
    try {
        await loadFabricSeries();
        await loadCostSettings();
        await loadCalculations();
        switchView('calculator');
        
        // Auto-focus on width input
        if (widthInput) {
            setTimeout(() => {
                widthInput.focus();
            }, 800);
        }
    } catch (error) {

    }
}

// Uygulamayı başlat
document.addEventListener('DOMContentLoaded', initializeApp);

// Sayfa tamamen yüklendiğinde de çağır (fallback)
if (document.readyState !== 'loading') {
    initializeApp();
}
