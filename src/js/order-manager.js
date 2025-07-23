// Sipariş Formu ve PDF Oluşturma Fonksiyonları

class OrderManager {
    constructor() {
        this.orderModal = null;
        this.orderForm = null;
        this.calculations = [];
        this.init();
    }

    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.orderModal = document.getElementById('orderModal');
            this.orderForm = document.getElementById('orderForm');
            this.setupEventListeners();
            this.setDefaultDate();
        });
    }

    setupEventListeners() {
        // Fiş Çıkar butonu
        const orderFormBtn = document.getElementById('orderFormBtn');
        if (orderFormBtn) {
            orderFormBtn.addEventListener('click', () => this.openOrderModal());
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
            this.showNotification('Lütfen önce hesaplama yapın!', 'warning');
            return;
        }

        // Hesaplamaları güncelle
        this.updateCalculations();
        
        if (this.orderModal) {
            this.orderModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    closeOrderModal() {
        if (this.orderModal) {
            this.orderModal.classList.remove('active');
            document.body.style.overflow = 'auto';
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
        const customerName = document.getElementById('customerName').value.trim();
        const customerPhone = document.getElementById('customerPhone').value.trim();
        
        if (!customerName) {
            this.showNotification('Lütfen müşteri adını girin!', 'error');
            return false;
        }
        
        if (!customerPhone) {
            this.showNotification('Lütfen telefon numarasını girin!', 'error');
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
        return `SP${year}${month}${day}${time}`;
    }

    async generateOrderPDF() {
        if (!this.validateForm()) return;

        try {
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
            
            this.showNotification('PDF başarıyla oluşturuldu!', 'success');
            this.closeOrderModal();
            
        } catch (error) {
            console.error('PDF oluşturma hatası:', error);
            this.showNotification('PDF oluşturulurken hata oluştu!', 'error');
        }
    }

    createPDFContent(pdf, customerData, orderNumber) {
        // PDF Başlığı
        pdf.setFontSize(20);
        pdf.setFont(undefined, 'bold');
        pdf.text('SİPARİŞ FİŞİ', 105, 20, { align: 'center' });
        
        // Logo alanı (opsiyonel)
        pdf.setFontSize(12);
        pdf.setFont(undefined, 'normal');
        pdf.text('TENGRA WORKS', 105, 30, { align: 'center' });
        pdf.text('Plise Perde Sistemleri', 105, 36, { align: 'center' });
        
        // Çizgi
        pdf.line(20, 42, 190, 42);
        
        // Sipariş Bilgileri
        pdf.setFontSize(11);
        pdf.setFont(undefined, 'bold');
        pdf.text('Sipariş No:', 20, 52);
        pdf.setFont(undefined, 'normal');
        pdf.text(orderNumber, 50, 52);
        
        pdf.setFont(undefined, 'bold');
        pdf.text('Tarih:', 130, 52);
        pdf.setFont(undefined, 'normal');
        pdf.text(customerData.orderDate, 150, 52);
        
        // Müşteri Bilgileri
        pdf.setFont(undefined, 'bold');
        pdf.text('MÜŞTERİ BİLGİLERİ', 20, 65);
        pdf.line(20, 67, 100, 67);
        
        pdf.setFont(undefined, 'normal');
        let yPos = 75;
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
        pdf.text('SİPARİŞ DETAYLARI', 20, yPos);
        pdf.line(20, yPos + 2, 120, yPos + 2);
        
        yPos += 10;
        
        // Tablo başlıkları
        pdf.setFontSize(9);
        const headers = ['Adet', 'Genişlik', 'Yükseklik', 'Alan (m²)', 'Kumaş', 'Fiyat'];
        const colWidths = [20, 25, 25, 25, 40, 30];
        let xPos = 20;
        
        pdf.setFont(undefined, 'bold');
        headers.forEach((header, index) => {
            pdf.text(header, xPos, yPos);
            xPos += colWidths[index];
        });
        
        // Çizgi
        pdf.line(20, yPos + 2, 185, yPos + 2);
        yPos += 8;
        
        // Tablo verileri
        pdf.setFont(undefined, 'normal');
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
        pdf.text('Bu sipariş fişi Tengra Works Plise Perde Hesaplayıcı ile oluşturulmuştur.', 105, 280, { align: 'center' });
        pdf.text('İletişim: tengraworks.com', 105, 285, { align: 'center' });
    }

    async printOrder() {
        if (!this.validateForm()) return;

        try {
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
            
            this.showNotification('Yazdırma penceresi açıldı!', 'success');
            this.closeOrderModal();
            
        } catch (error) {
            console.error('Yazdırma hatası:', error);
            this.showNotification('Yazdırılırken hata oluştu!', 'error');
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
                    <p class="company-info">TENGRA WORKS</p>
                    <p class="company-info">Plise Perde Sistemleri</p>
                    <p class="company-info">tengraworks.com</p>
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
                            <span>Onay Bekliyor</span>
                        </div>
                    </div>
                </div>

                <table class="order-table">
                    <thead>
                        <tr>
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

    showNotification(message, type = 'info') {
        // Basit bir notification sistemi
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 24px;
            border-radius: 6px;
            color: white;
            font-weight: 500;
            z-index: 10001;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        `;
        
        // Type'a göre renk
        const colors = {
            success: '#4caf50',
            error: '#f44336',
            warning: '#ff9800',
            info: '#2196f3'
        };
        
        notification.style.backgroundColor = colors[type] || colors.info;
        
        document.body.appendChild(notification);
        
        // Animasyon
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Otomatik kaldırma
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// OrderManager'ı başlat
const orderManager = new OrderManager();
