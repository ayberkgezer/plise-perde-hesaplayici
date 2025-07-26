// Müşteri Bilgi Fişi Yönetimi

class CustomerInfoManager {
    constructor() {
        this.customerInfoModal = null;
        this.customerInfoForm = null;
        this.calculations = [];
        this.companyInfo = null;
        this.costSettings = null;
        this.init();
    }

    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.customerInfoModal = document.getElementById('customerInfoModal');
            this.customerInfoForm = document.getElementById('customerInfoForm');
            this.setupEventListeners();
            this.loadCompanyInfo();
            this.loadCostSettings();
        });
    }

    setupEventListeners() {
        // Müşteri Bilgi Fişi butonu
        const customerInfoBtn = document.getElementById('customerInfoBtn');
        if (customerInfoBtn) {
            customerInfoBtn.addEventListener('click', () => this.openCustomerInfoModal());
        }

        // Modal kapatma butonları
        const closeCustomerInfoModal = document.getElementById('closeCustomerInfoModal');
        const cancelCustomerInfo = document.getElementById('cancelCustomerInfo');
        
        if (closeCustomerInfoModal) {
            closeCustomerInfoModal.addEventListener('click', () => this.closeCustomerInfoModal());
        }
        
        if (cancelCustomerInfo) {
            cancelCustomerInfo.addEventListener('click', () => this.closeCustomerInfoModal());
        }

        // Modal dışına tıklama ile kapatma
        if (this.customerInfoModal) {
            this.customerInfoModal.addEventListener('click', (e) => {
                if (e.target === this.customerInfoModal) {
                    this.closeCustomerInfoModal();
                }
            });
        }

        // PDF oluşturma butonu
        const generateCustomerInfoPDF = document.getElementById('generateCustomerInfoPDF');
        if (generateCustomerInfoPDF) {
            generateCustomerInfoPDF.addEventListener('click', () => this.generateCustomerInfoPDF());
        }

        // Yazdırma butonu
        const printCustomerInfo = document.getElementById('printCustomerInfo');
        if (printCustomerInfo) {
            printCustomerInfo.addEventListener('click', () => this.printCustomerInfo());
        }

        // Form validasyonu
        if (this.customerInfoForm) {
            this.customerInfoForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.validateForm();
            });
        }
    }

    async loadCompanyInfo() {
        try {
            this.companyInfo = await window.electronAPI.getCompanyInfo();
        } catch (error) {
            console.error('Firma bilgisi yüklenirken hata:', error);
            this.companyInfo = null;
        }
    }

    async loadCostSettings() {
        try {
            this.costSettings = await window.electronAPI.getCostSettings();
        } catch (error) {
            console.error('Maliyet ayarları yüklenirken hata:', error);
            this.costSettings = { 
                fixed_cost_per_unit: 25, 
                aluminium_cost_per_cm: 0.8, 
                plise_cutting_multiplier: 2.1 
            };
        }
    }

    openCustomerInfoModal() {
        // Hesaplamaları kontrol et
        if (!this.hasCalculations()) {

            return;
        }

        // Hesaplamaları güncelle
        this.updateCalculations();
        
        if (this.customerInfoModal) {
            toggleModal('customerInfoModal', true);
        }
    }

    closeCustomerInfoModal() {
        if (this.customerInfoModal) {
            toggleModal('customerInfoModal', false);
            this.resetForm();
        }
    }

    hasCalculations() {
        const resultTable = document.getElementById('resultTable');
        return resultTable && resultTable.children.length > 0;
    }

    updateCalculations() {
        this.calculations = [];
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

    validateForm() {
        const customerName = document.getElementById('customerInfoName').value.trim();
        
        if (!customerName) {

            return false;
        }
        
        return true;
    }

    resetForm() {
        if (this.customerInfoForm) {
            this.customerInfoForm.reset();
        }
    }

    getCustomerData() {
        return {
            name: document.getElementById('customerInfoName').value.trim()
        };
    }

    getTotalPrice() {
        const totalPriceEl = document.getElementById('totalPrice');
        if (totalPriceEl) {
            const text = totalPriceEl.textContent;
            const match = text.match(/([0-9,]+(?:\.[0-9]{2})?)/);
            return match ? match[1] : '0';
        }
        return '0';
    }

    generateOrderNumber() {
        const now = new Date();
        const year = now.getFullYear().toString().substr(-2);
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const time = now.getHours().toString().padStart(2, '0') + 
                    now.getMinutes().toString().padStart(2, '0');
        return `MB${year}${month}${day}${time}`;
    }

    async generateCustomerInfoPDF() {
        if (!this.validateForm()) return;

        try {
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
            const fileName = `Musteri_Bilgi_Fisi_${orderNumber}_${customerData.name.replace(/\s+/g, '_')}.pdf`;
            pdf.save(fileName);
            

            this.closeCustomerInfoModal();
            
        } catch (error) {
            console.error('PDF oluşturma hatası:', error);

        }
    }

    createPDFContent(pdf, customerData, orderNumber) {
        // UTF-8 desteği için font ayarları
        try {
            pdf.setFont('helvetica', 'normal');
        } catch (e) {
            console.warn('Font ayarı başarısız, varsayılan font kullanılıyor');
        }
        
        // PDF Başlığı
        pdf.setFontSize(20);
        pdf.setFont('helvetica', 'bold');
        
        const title = 'MUSTERI BILGI FISI';
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
        
        // Fiş Bilgileri
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Fis No:', 20, 58);
        pdf.setFont('helvetica', 'normal');
        pdf.text(orderNumber, 50, 58);
        
        pdf.setFont('helvetica', 'bold');
        pdf.text('Tarih:', 130, 58);
        pdf.setFont('helvetica', 'normal');
        const today = new Date().toLocaleDateString('tr-TR');
        pdf.text(today, 150, 58);
        
        // Müşteri Bilgileri
        pdf.setFont('helvetica', 'bold');
        pdf.text('MUSTERI BILGILERI', 20, 71);
        pdf.line(20, 73, 100, 73);
        
        pdf.setFont('helvetica', 'normal');
        let yPos = 81;
        pdf.text(`Musteri Ad Soyad: ${customerData.name}`, 20, yPos);
        
        // Sipariş Detayları Tablosu
        yPos += 20;
        pdf.setFont(undefined, 'bold');
        pdf.text('SIPARIS DETAYLARI', 20, yPos);
        pdf.line(20, yPos + 2, 120, yPos + 2);
        
        yPos += 10;
        
        // Tablo başlıkları
        pdf.setFontSize(9);
        const headers = ['Adet', 'Genislik', 'Yukseklik', 'Alan (m²)', 'Kumas', 'Fiyat'];
        const colWidths = [20, 25, 25, 25, 40, 30];
        let xPos = 20;
        
        pdf.setFont(undefined, 'bold');
        // Başlıkları siyah renkte göster
        pdf.setTextColor(0, 0, 0);
        headers.forEach((header, index) => {
            pdf.text(header, xPos, yPos);
            xPos += colWidths[index];
        });
        
        // Çizgi
        pdf.line(20, yPos + 2, 185, yPos + 2);
        yPos += 8;
        
        // Tablo verileri
        pdf.setFont(undefined, 'normal');
        pdf.setTextColor(0, 0, 0); // Verileri de siyah renkte göster
        this.calculations.forEach((calc) => {
            xPos = 20;
            const data = [calc.quantity, calc.width, calc.height, calc.area, calc.fabric, calc.price];
            
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
        pdf.line(20, yPos, 185, yPos);
        yPos += 8;
        
        pdf.setFont(undefined, 'bold');
        pdf.setFontSize(12);
        pdf.text(`TOPLAM TUTAR: ${this.getTotalPrice()} TL`, 20, yPos);
        
        // Footer
        pdf.setFontSize(8);
        pdf.setFont(undefined, 'normal');
        pdf.text('Bu musteri bilgi fisi Tengra Works Plise Perde Hesaplayici ile olusturulmustur.', 105, 280, { align: 'center' });
        pdf.text('Iletisim: tengraworks.com', 105, 285, { align: 'center' });
    }

    async printCustomerInfo() {
        if (!this.validateForm()) return;

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
            printWindow.document.write(printContent);
            printWindow.document.close();
            
            printWindow.onload = function() {
                printWindow.print();
                printWindow.onafterprint = function() {
                    printWindow.close();
                };
            };
            

            this.closeCustomerInfoModal();
            
        } catch (error) {
            console.error('Yazdırma hatası:', error);

        }
    }

    createPrintableHTML(customerData, orderNumber) {
        const totalPrice = this.getTotalPrice();
        
        let tableRows = '';
        this.calculations.forEach(calc => {
            tableRows += `
                <tr>
                    <td class="text-center">${calc.quantity}</td>
                    <td class="text-center">${calc.width}</td>
                    <td class="text-center">${calc.height}</td>
                    <td class="text-center">${calc.area}</td>
                    <td>${calc.fabric}</td>
                    <td class="text-right">${calc.price}</td>
                </tr>
            `;
        });

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Müşteri Bilgi Fişi - ${orderNumber}</title>
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
                @media print {
                    body { margin: 0; padding: 15mm; }
                    .order-receipt { max-width: none; }
                }
            </style>
        </head>
        <body>
            <div class="order-receipt">
                <div class="receipt-header">
                    <h1>MÜŞTERİ BİLGİ FİŞİ</h1>
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
                    </div>
                    <div class="order-info">
                        <h3>Fiş Bilgileri</h3>
                        <div class="info-item">
                            <span class="info-label">Fiş No:</span>
                            <span>${orderNumber}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Tarih:</span>
                            <span>${new Date().toLocaleDateString('tr-TR')}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Durum:</span>
                            <span>Hesaplanmış</span>
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

                <div class="receipt-footer">
                    <p>Bu müşteri bilgi fişi Tengra Works Hesaplayıcı ile oluşturulmuştur.</p>
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

// CustomerInfoManager'ı başlat
const customerInfoManager = new CustomerInfoManager();
