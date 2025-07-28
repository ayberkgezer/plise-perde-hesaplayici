// Sipariş Formu ve PDF Oluşturma Fonksiyonları

class OrderManager {
    constructor() {
        this.orderModal = null;
        this.orderForm = null;
        this.calculations = [];
        this.companyInfo = null;
        this.costSettings = null;
        this.init();
    }

    init() {
        // Ensure DOM is ready before initializing
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeElements());
        } else {
            this.initializeElements();
        }
    }

    initializeElements() {
        this.orderModal = document.getElementById('orderModal');
        this.orderForm = document.getElementById('orderForm');
        this.setupEventListeners();
        this.setDefaultDate();
        this.loadCompanyInfo();
        this.loadCostSettings();
    }

    setupEventListeners() {
        // Fiş Çıkar butonu
        const orderFormBtn = document.getElementById('orderFormBtn');
        if (orderFormBtn) {
            orderFormBtn.addEventListener('click', () => {
                this.openOrderModal();
            });
        } else {
        }

        // Modal kapatma butonları
        const closeOrderModal = document.getElementById('closeOrderModal');
        const cancelOrder = document.getElementById('cancelOrder');
        
        if (closeOrderModal) {
            closeOrderModal.addEventListener('click', () => this.closeOrderModal());
        }
        
        if (cancelOrder) {
            cancelOrder.addEventListener('click', () => this.closeOrderModal());
        }

        // Modal dışına tıklama ile kapatma
        if (this.orderModal) {
            this.orderModal.addEventListener('click', (e) => {
                if (e.target === this.orderModal) {
                    this.closeOrderModal();
                }
            });
        }

        // PDF oluşturma butonu
        const generatePDF = document.getElementById('generatePDF');
        if (generatePDF) {
            generatePDF.addEventListener('click', () => this.generateOrderPDF());
        }

        // Yazdırma butonu
        const printOrder = document.getElementById('printOrder');
        if (printOrder) {
            printOrder.addEventListener('click', () => this.printOrder());
        }

        // Form validasyonu
        if (this.orderForm) {
            this.orderForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.validateForm();
            });
        }
    }

    async loadCompanyInfo() {
        try {
            this.companyInfo = await window.electronAPI.getCompanyInfo();
        } catch (error) {
            this.companyInfo = null;
        }
    }

    async loadCostSettings() {
        try {
            this.costSettings = await window.electronAPI.getCostSettings();
        } catch (error) {
            this.costSettings = { 
                fixed_cost_per_unit: 25, 
                aluminium_cost_per_cm: 0.8, 
                plise_cutting_multiplier: 2.1 
            };
        }
    }

    setDefaultDate() {
        const orderDate = document.getElementById('orderDate');
        if (orderDate) {
            const today = new Date().toISOString().split('T')[0];
            orderDate.value = today;
        }
    }

    openOrderModal() {
        // Hesaplamaları kontrol et
        if (!this.hasCalculations()) {

            return;
        }

        // Hesaplamaları güncelle
        this.updateCalculations();
        
        if (this.orderModal) {
            window.toggleModal('orderModal', true);
        } else {
        }
    }

    closeOrderModal() {
        if (this.orderModal) {
            window.toggleModal('orderModal', false);
            this.resetForm();
        }
    }

    hasCalculations() {
        const resultTable = document.getElementById('resultTable');
        return resultTable && resultTable.children.length > 0;
    }

    updateCalculations() {
        this.calculations = [];
        
        // Access global calculations from renderer.js
        if (window.calculations && Array.isArray(window.calculations)) {
            this.calculations = [...window.calculations];
        } else {
            // Fallback: read from table if global calculations not available
            const resultTable = document.getElementById('resultTable');
            
            if (resultTable) {
                const rows = resultTable.getElementsByTagName('tr');
                for (let row of rows) {
                    const cells = row.getElementsByTagName('td');
                    if (cells.length >= 6) {
                        this.calculations.push({
                            quantity: cells[0].textContent,
                            width: cells[1].textContent,
                            height: cells[2].textContent,
                            area: cells[3].textContent,
                            fabric: cells[4].textContent,
                            price: cells[5].textContent
                        });
                    }
                }
            }
        }
    }

    validateForm() {
        const customerName = document.getElementById('customerName').value.trim();
        const customerPhone = document.getElementById('customerPhone').value.trim();
        
        if (!customerName) {

            return false;
        }
        
        if (!customerPhone) {

            return false;
        }
        
        return true;
    }

    resetForm() {
        if (this.orderForm) {
            this.orderForm.reset();
            this.setDefaultDate();
        }
    }

    getCustomerData() {
        return {
            name: document.getElementById('customerName').value.trim(),
            phone: document.getElementById('customerPhone').value.trim(),
            email: document.getElementById('customerEmail').value.trim(),
            address: document.getElementById('customerAddress').value.trim(),
            orderDate: document.getElementById('orderDate').value,
            notes: document.getElementById('orderNotes').value.trim()
        };
    }

    getTotalPrice() {
        // Calculations dizisinden direkt hesapla
        let total = 0;
        this.calculations.forEach(calc => {
            const price = calc.total_price || calc.price || 0;
            total += parseFloat(price) || 0;
        });
        
        // Fallback: DOM'dan oku
        if (total === 0) {
            const totalPriceEl = document.getElementById('totalPrice');
            if (totalPriceEl) {
                const text = totalPriceEl.textContent;
                const match = text.match(/([0-9,]+(?:\.[0-9]{2})?)/);
                return match ? match[1] : '0';
            }
        }
        
        return total.toFixed(2);
    }

    generateOrderNumber() {
        const now = new Date();
        const year = now.getFullYear().toString().substr(-2);
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const time = now.getHours().toString().padStart(2, '0') + 
                    now.getMinutes().toString().padStart(2, '0');
        return `SP${year}${month}${day}${time}`;
    }

    async generateOrderPDF() {
        
        if (!this.validateForm()) {
            return;
        }

        try {
            // jsPDF kütüphanesini kontrol et
            if (!window.jspdf) {
                alert('PDF kütüphanesi yüklenmemiş. Sayfayı yenileyin.');
                return;
            }
            
            
            // Firma bilgilerini ve maliyet ayarlarını yeniden yükle
            await this.loadCompanyInfo();
            await this.loadCostSettings();
            
            const customerData = this.getCustomerData();
            const orderNumber = this.generateOrderNumber();
            
            
            // PDF oluştur
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            
            // PDF içeriğini oluştur
            this.createPDFContent(pdf, customerData, orderNumber);
            
            // PDF'i kaydet
            const fileName = `Siparis_${orderNumber}_${customerData.name.replace(/\s+/g, '_')}.pdf`;
            pdf.save(fileName);
            
            alert('PDF başarıyla oluşturuldu ve indirildi!');

            this.closeOrderModal();
            
        } catch (error) {
            alert('PDF oluşturulurken hata oluştu: ' + error.message);
        }
    }

    createPDFContent(pdf, customerData, orderNumber) {
        // UTF-8 desteği için font ayarları
        try {
            pdf.setFont('helvetica', 'normal');
        } catch (e) {
        }
        
        // PDF Başlığı
        pdf.setFontSize(20);
        pdf.setFont('helvetica', 'bold');
        
        // Türkçe karakterleri encode et
        const title = 'SIPARIS FISI';
        pdf.text(title, 105, 20, { align: 'center' });
        
        // Firma Bilgileri
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
        
        if (this.companyInfo) {
            pdf.text(this.getSafeText(this.companyInfo.company_name), 105, 30, { align: 'center' });
            
            if (this.companyInfo.address) {
                pdf.setFontSize(10);
                pdf.text(this.getSafeText(this.companyInfo.address), 105, 36, { align: 'center' });
            }
            
            let infoLine = '';
            if (this.companyInfo.phone) infoLine += `Tel: ${this.companyInfo.phone}`;
            if (this.companyInfo.email) {
                if (infoLine) infoLine += ' | ';
                infoLine += `E-posta: ${this.companyInfo.email}`;
            }
            if (this.companyInfo.website) {
                if (infoLine) infoLine += ' | ';
                infoLine += `Web: ${this.companyInfo.website}`;
            }
            
            if (infoLine) {
                pdf.text(this.getSafeText(infoLine), 105, 42, { align: 'center' });
            }
        } else {
            pdf.text('TENGRA WORKS', 105, 30, { align: 'center' });
        }
        
        // Çizgi
        pdf.line(20, 48, 190, 48);
        
        // Sipariş Bilgileri
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Siparis No:', 20, 58);
        pdf.setFont('helvetica', 'normal');
        pdf.text(orderNumber, 50, 58);
        
        pdf.setFont('helvetica', 'bold');
        pdf.text('Tarih:', 130, 58);
        pdf.setFont('helvetica', 'normal');
        pdf.text(customerData.orderDate, 150, 58);
        
        // Müşteri Bilgileri
        pdf.setFont('helvetica', 'bold');
        pdf.text('MUSTERI BILGILERI', 20, 71);
        pdf.line(20, 73, 100, 73);
        
        pdf.setFont('helvetica', 'normal');
        let yPos = 81;
        pdf.text(`Ad Soyad: ${customerData.name}`, 20, yPos);
        yPos += 6;
        pdf.text(`Telefon: ${customerData.phone}`, 20, yPos);
        
        if (customerData.email) {
            yPos += 6;
            pdf.text(`E-posta: ${customerData.email}`, 20, yPos);
        }
        
        if (customerData.address) {
            yPos += 6;
            const addressLines = pdf.splitTextToSize(`Adres: ${customerData.address}`, 170);
            pdf.text(addressLines, 20, yPos);
            yPos += (addressLines.length * 6);
        }
        
        // Sipariş Detayları Tablosu
        yPos += 10;
        pdf.setFont(undefined, 'bold');
        pdf.text('SIPARIS DETAYLARI', 20, yPos);
        pdf.line(20, yPos + 2, 120, yPos + 2);
        
        yPos += 10;
        
        // Tablo başlıkları
        pdf.setFontSize(9);
        const headers = ['Adet', 'Genislik', 'Yukseklik', 'Alan (m²)', 'Kumas', 'Kesim Plise', 'Fiyat'];
        const colWidths = [18, 22, 22, 20, 30, 25, 28];
        let xPos = 20;
        
        pdf.setFont(undefined, 'bold');
        // Başlıkları siyah renkte göster
        pdf.setTextColor(0, 0, 0);
        headers.forEach((header, index) => {
            pdf.text(header, xPos, yPos);
            xPos += colWidths[index];
        });
        
        // Çizgi
        pdf.line(20, yPos + 2, 195, yPos + 2);
        yPos += 8;
        
        // Tablo verileri
        pdf.setFont(undefined, 'normal');
        pdf.setTextColor(0, 0, 0); // Verileri de siyah renkte göster
        this.calculations.forEach((calc) => {
            xPos = 20;
            // Kesim plise sayısını hesapla (yükseklik * veritabanından gelen çarpan)
            const height = typeof calc.height === 'string' ? 
                parseFloat(calc.height.replace(' cm', '')) : 
                parseFloat(calc.height) || 0;
            const multiplier = this.costSettings?.plise_cutting_multiplier || 2.1;
            const kesimPlise = Math.ceil(height * multiplier);

            // Veri tiplerini güvenli hale getir
            const safeQuantity = calc.quantity?.toString() || '1';
            const safeWidth = typeof calc.width === 'string' ? calc.width : `${calc.width} cm`;
            const safeHeight = typeof calc.height === 'string' ? calc.height : `${calc.height} cm`;
            const safeArea = typeof calc.area === 'string' ? calc.area : `${calc.area} m²`;
            const safeFabric = (calc.fabric_name || calc.fabric)?.toString() || 'Belirtilmemiş';
            const safePrice = typeof calc.total_price === 'string' ? calc.total_price : 
                            (calc.total_price ? `${calc.total_price} TL` : 
                            (calc.price ? `${calc.price} TL` : 'Fiyat belirtilmemiş'));
            
            const data = [safeQuantity, safeWidth, safeHeight, safeArea, safeFabric, kesimPlise.toString(), safePrice];
            
            data.forEach((item, index) => {
                const text = item.toString();
                if (index === 4) { // Kumaş adı - uzun olabilir
                    const lines = pdf.splitTextToSize(text, colWidths[index] - 2);
                    pdf.text(lines, xPos, yPos);
                } else {
                    pdf.text(text, xPos, yPos);
                }
                xPos += colWidths[index];
            });
            yPos += 6;
        });
        
        // Toplam Fiyat
        yPos += 5;
        pdf.line(20, yPos, 195, yPos);
        yPos += 8;
        
        pdf.setFont(undefined, 'bold');
        pdf.setFontSize(12);
        pdf.text(`TOPLAM TUTAR: ${this.getTotalPrice()} TL`, 20, yPos);
        
        // Notlar
        if (customerData.notes) {
            yPos += 15;
            pdf.setFont(undefined, 'bold');
            pdf.setFontSize(11);
            pdf.text('NOTLAR:', 20, yPos);
            
            yPos += 8;
            pdf.setFont(undefined, 'normal');
            pdf.setFontSize(10);
            const noteLines = pdf.splitTextToSize(customerData.notes, 170);
            pdf.text(noteLines, 20, yPos);
        }
        
        // Footer
        pdf.setFontSize(8);
        pdf.setFont(undefined, 'normal');
        pdf.text('Bu siparis fisi Tengra Works Plise Perde Hesaplayici ile olusturulmustur.', 105, 280, { align: 'center' });
        pdf.text('Iletisim: tengraworks.com', 105, 285, { align: 'center' });
    }

    async printOrder() {
        
        if (!this.validateForm()) {
            return;
        }

        try {
            // Firma bilgilerini ve maliyet ayarlarını yeniden yükle
            await this.loadCompanyInfo();
            await this.loadCostSettings();
            
            const customerData = this.getCustomerData();
            const orderNumber = this.generateOrderNumber();
            
            
            // Yazdırılabilir HTML içeriği oluştur
            const printContent = this.createPrintableHTML(customerData, orderNumber);
            
            
            // Yeni pencere açıp yazdır
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                alert('Pop-up engellendi! Lütfen pop-up engelini kaldırın.');
                return;
            }
            
            printWindow.document.write(printContent);
            printWindow.document.close();
            
            printWindow.onload = function() {
                printWindow.print();
                printWindow.onafterprint = function() {
                    printWindow.close();
                };
            };
            

            this.closeOrderModal();
            
        } catch (error) {
            alert('Yazdırma sırasında hata oluştu: ' + error.message);
        }
    }

    createPrintableHTML(customerData, orderNumber) {
        const totalPrice = this.getTotalPrice();
        
        let tableRows = '';
        this.calculations.forEach(calc => {
            // Kesim plise sayısını hesapla (yükseklik * veritabanından gelen çarpan)
            const height = typeof calc.height === 'string' ? 
                parseFloat(calc.height.replace(' cm', '')) : 
                parseFloat(calc.height) || 0;
            const multiplier = this.costSettings?.plise_cutting_multiplier || 2.1;
            const kesimPlise = (height / multiplier).toFixed(2);

            // HTML için veri tiplerini güvenli hale getir
            const safeQuantity = calc.quantity?.toString() || '1';
            const safeWidth = typeof calc.width === 'string' ? calc.width : `${calc.width} cm`;
            const safeHeight = typeof calc.height === 'string' ? calc.height : `${calc.height} cm`;
            const safeArea = typeof calc.area === 'string' ? calc.area : `${calc.area} m²`;
            const safeFabric = (calc.fabric_name || calc.fabric)?.toString() || 'Belirtilmemiş';
            const safePrice = typeof calc.total_price === 'string' ? calc.total_price : 
                            (calc.total_price ? `${calc.total_price} TL` : 
                            (calc.price ? `${calc.price} TL` : 'Fiyat belirtilmemiş'));
            
            tableRows += `
                <tr>
                    <td class="text-center">${safeQuantity}</td>
                    <td class="text-center">${safeWidth}</td>
                    <td class="text-center">${safeHeight}</td>
                    <td class="text-center">${safeArea}</td>
                    <td>${safeFabric}</td>
                    <td class="text-center">${kesimPlise}</td>
                    <td class="text-right">${safePrice}</td>
                </tr>
            `;
        });

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Sipariş Fişi - ${orderNumber}</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    font-size: 12px; 
                    line-height: 1.4; 
                    margin: 0; 
                    padding: 20px;
                    color: #333;
                }
                .order-receipt {
                    max-width: 210mm;
                    margin: 0 auto;
                }
                .receipt-header {
                    text-align: center;
                    margin-bottom: 20px;
                    border-bottom: 2px solid #333;
                    padding-bottom: 15px;
                }
                .receipt-header h1 {
                    font-size: 24px;
                    margin: 0 0 10px 0;
                    color: #333;
                }
                .company-info {
                    font-size: 11px;
                    color: #666;
                    margin: 0;
                }
                .receipt-info {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                    margin-bottom: 20px;
                }
                .customer-info, .order-info {
                    background: #f9f9f9;
                    padding: 10px;
                    border-radius: 4px;
                }
                .customer-info h3, .order-info h3 {
                    font-size: 14px;
                    margin: 0 0 8px 0;
                    color: #333;
                    border-bottom: 1px solid #ddd;
                    padding-bottom: 4px;
                }
                .info-item {
                    margin-bottom: 4px;
                    font-size: 11px;
                }
                .info-label {
                    font-weight: bold;
                    color: #666;
                    display: inline-block;
                    width: 80px;
                }
                .order-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 20px;
                    font-size: 10px;
                }
                .order-table th {
                    background: #333;
                    color: white;
                    padding: 8px 6px;
                    text-align: left;
                    font-weight: bold;
                }
                .order-table td {
                    padding: 8px 6px;
                    border-bottom: 1px solid #ddd;
                }
                .order-table tbody tr:nth-child(even) {
                    background: #f9f9f9;
                }
                .text-right { text-align: right; }
                .text-center { text-align: center; }
                .receipt-summary {
                    background: #f0f0f0;
                    padding: 15px;
                    border-radius: 4px;
                    margin-bottom: 20px;
                }
                .summary-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 5px;
                    font-size: 12px;
                }
                .summary-row.total {
                    border-top: 2px solid #333;
                    padding-top: 8px;
                    margin-top: 8px;
                    font-weight: bold;
                    font-size: 16px;
                }
                .receipt-footer {
                    text-align: center;
                    font-size: 10px;
                    color: #666;
                    border-top: 1px solid #ddd;
                    padding-top: 15px;
                }
                .notes-section {
                    margin-bottom: 20px;
                    padding: 10px;
                    background: #f9f9f9;
                    border-radius: 4px;
                }
                .notes-section h4 {
                    font-size: 12px;
                    margin: 0 0 8px 0;
                    color: #333;
                }
                @media print {
                    body { margin: 0; padding: 15mm; }
                    .order-receipt { max-width: none; }
                }
            </style>
        </head>
        <body>
            <div class="order-receipt">
                <div class="receipt-header">
                    <h1>SİPARİŞ FİŞİ</h1>
                    ${this.companyInfo ? `
                    <div class="company-info">
                        <div style="font-size: 16px; font-weight: bold; margin-bottom: 5px;">${this.companyInfo.company_name}</div>
                        ${this.companyInfo.address ? `<p class="company-info">${this.companyInfo.address}</p>` : ''}
                        <p class="company-info">
                            ${this.companyInfo.phone ? `Tel: ${this.companyInfo.phone}` : ''}
                            ${this.companyInfo.phone && this.companyInfo.email ? ' | ' : ''}
                            ${this.companyInfo.email ? `E-posta: ${this.companyInfo.email}` : ''}
                        </p>
                        ${this.companyInfo.website ? `<p class="company-info">Web: ${this.companyInfo.website}</p>` : ''}
                        ${this.companyInfo.tax_number ? `<p class="company-info">Vergi No: ${this.companyInfo.tax_number}</p>` : ''}
                    </div>
                    ` : `
                    <p class="company-info">TENGRA WORKS</p>
                    <p class="company-info">tengraworks.com</p>
                    `}
                </div>

                <div class="receipt-info">
                    <div class="customer-info">
                        <h3>Müşteri Bilgileri</h3>
                        <div class="info-item">
                            <span class="info-label">Ad Soyad:</span>
                            <span>${customerData.name}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Telefon:</span>
                            <span>${customerData.phone}</span>
                        </div>
                        ${customerData.email ? `
                        <div class="info-item">
                            <span class="info-label">E-posta:</span>
                            <span>${customerData.email}</span>
                        </div>
                        ` : ''}
                        ${customerData.address ? `
                        <div class="info-item">
                            <span class="info-label">Adres:</span>
                            <span>${customerData.address}</span>
                        </div>
                        ` : ''}
                    </div>
                    <div class="order-info">
                        <h3>Sipariş Bilgileri</h3>
                        <div class="info-item">
                            <span class="info-label">Sipariş No:</span>
                            <span>${orderNumber}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Tarih:</span>
                            <span>${customerData.orderDate}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Durum:</span>
                            <span>Onaylandı</span>
                        </div>
                    </div>
                </div>

                <table class="order-table">
                    <thead>
                        <tr style="background-color: #000; color: #fff;">
                            <th class="text-center">Adet</th>
                            <th class="text-center">Genişlik (cm)</th>
                            <th class="text-center">Yükseklik (cm)</th>
                            <th class="text-center">Alan (m²)</th>
                            <th>Kumaş Türü</th>
                            <th class="text-center">Kesim Plise Sayısı</th>
                            <th class="text-right">Fiyat</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>

                <div class="receipt-summary">
                    <div class="summary-row total">
                        <span>TOPLAM TUTAR:</span>
                        <span>${totalPrice} TL</span>
                    </div>
                </div>

                ${customerData.notes ? `
                <div class="notes-section">
                    <h4>Sipariş Notları:</h4>
                    <p>${customerData.notes}</p>
                </div>
                ` : ''}

                <div class="receipt-footer">
                    <p>Bu sipariş fişi Tengra Works Hesaplayıcı ile oluşturulmuştur.</p>
                    <p>İletişim: tengraworks.com</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    // Türkçe karakterleri PDF için güvenli hale getir
    encodeText(text) {
        if (!text) return '';
        
        // Türkçe karakterleri ASCII karşılıklarıyla değiştir
        return text
            .replace(/ç/g, 'c').replace(/Ç/g, 'C')
            .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
            .replace(/ı/g, 'i').replace(/İ/g, 'I')
            .replace(/ö/g, 'o').replace(/Ö/g, 'O')
            .replace(/ş/g, 's').replace(/Ş/g, 'S')
            .replace(/ü/g, 'u').replace(/Ü/g, 'U');
    }

    // Güvenli metin dönüştürücü (PDF için)
    getSafeText(text) {
        return this.encodeText(text);
    }
}

// OrderManager'ı başlat
const orderManager = new OrderManager();
