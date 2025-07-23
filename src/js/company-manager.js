// Firma Bilgileri Yönetimi

class CompanyManager {
    constructor() {
        this.companies = [];
        this.activeCompany = null;
        this.currentEditId = null;
        this.init();
    }

    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.setupEventListeners();
            this.loadCompanies();
            this.loadActiveCompany();
        });
    }

    setupEventListeners() {
        // Form submit
        const companyForm = document.getElementById('companyForm');
        if (companyForm) {
            companyForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveCompany();
            });
        }

        // Form temizleme
        const clearForm = document.getElementById('clearCompanyForm');
        if (clearForm) {
            clearForm.addEventListener('click', () => this.clearForm());
        }

        // Navigation değişikliği dinle
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-view="company"]')) {
                setTimeout(() => {
                    this.loadCompanies();
                    this.loadActiveCompany();
                }, 100);
            }
        });
    }

    async loadActiveCompany() {
        try {
            const company = await window.electronAPI.getCompanyInfo();
            this.activeCompany = company;
            this.displayActiveCompany(company);
        } catch (error) {
            console.error('Aktif firma yüklenirken hata:', error);
            this.displayActiveCompany(null);
        }
    }

    displayActiveCompany(company) {
        const display = document.getElementById('activeCompanyDisplay');
        if (!display) return;

        if (!company) {
            display.innerHTML = '<p class="no-company">Henüz firma bilgisi eklenmemiş.</p>';
            return;
        }

        display.innerHTML = `
            <div class="company-details">
                <div class="company-detail-item">
                    <span class="icon">🏢</span>
                    <span class="label">Firma:</span>
                    <span class="value">${company.company_name}</span>
                </div>
                ${company.contact_person ? `
                <div class="company-detail-item">
                    <span class="icon">👤</span>
                    <span class="label">Kişi:</span>
                    <span class="value">${company.contact_person}</span>
                </div>
                ` : ''}
                ${company.phone ? `
                <div class="company-detail-item">
                    <span class="icon">📞</span>
                    <span class="label">Telefon:</span>
                    <span class="value">${company.phone}</span>
                </div>
                ` : ''}
                ${company.email ? `
                <div class="company-detail-item">
                    <span class="icon">📧</span>
                    <span class="label">E-posta:</span>
                    <span class="value">${company.email}</span>
                </div>
                ` : ''}
                ${company.address ? `
                <div class="company-detail-item">
                    <span class="icon">📍</span>
                    <span class="label">Adres:</span>
                    <span class="value">${company.address}</span>
                </div>
                ` : ''}
                ${company.website ? `
                <div class="company-detail-item">
                    <span class="icon">🌐</span>
                    <span class="label">Web:</span>
                    <span class="value">${company.website}</span>
                </div>
                ` : ''}
                ${company.tax_number ? `
                <div class="company-detail-item">
                    <span class="icon">🏷️</span>
                    <span class="label">Vergi No:</span>
                    <span class="value">${company.tax_number}</span>
                </div>
                ` : ''}
            </div>
        `;
    }

    async loadCompanies() {
        try {
            this.companies = await window.electronAPI.getAllCompanies();
            this.displayCompanies();
        } catch (error) {
            console.error('Firmalar yüklenirken hata:', error);
            this.showNotification('Firmalar yüklenemedi!', 'error');
        }
    }

    displayCompanies() {
        const tbody = document.getElementById('companiesTable');
        if (!tbody) return;

        if (this.companies.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #666;">Henüz firma kaydı yok</td></tr>';
            return;
        }

        tbody.innerHTML = this.companies.map(company => `
            <tr>
                <td><strong>${company.company_name}</strong></td>
                <td>${company.contact_person || '-'}</td>
                <td>${company.phone || '-'}</td>
                <td>${company.email || '-'}</td>
                <td>
                    <span class="status-badge ${company.is_active ? 'active' : 'inactive'}">
                        ${company.is_active ? 'Aktif' : 'Pasif'}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn edit" onclick="companyManager.editCompany(${company.id})" title="Düzenle">
                            ✏️
                        </button>
                        ${!company.is_active ? `
                        <button class="action-btn activate" onclick="companyManager.activateCompany(${company.id})" title="Aktif Yap">
                            ✅
                        </button>
                        ` : ''}
                        <button class="action-btn delete" onclick="companyManager.deleteCompany(${company.id})" title="Sil">
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    async saveCompany() {
        const formData = this.getFormData();
        
        if (!formData.company_name.trim()) {
            this.showNotification('Firma adı zorunludur!', 'error');
            return;
        }

        try {
            if (this.currentEditId) {
                await window.electronAPI.updateCompanyInfo(this.currentEditId, formData);
                this.showNotification('Firma güncellendi!', 'success');
            } else {
                await window.electronAPI.addCompanyInfo(formData);
                this.showNotification('Firma eklendi!', 'success');
            }

            this.clearForm();
            this.loadCompanies();
            this.loadActiveCompany();
        } catch (error) {
            console.error('Firma kaydetme hatası:', error);
            this.showNotification('Firma kaydedilemedi!', 'error');
        }
    }

    getFormData() {
        return {
            company_name: document.getElementById('companyName').value.trim(),
            contact_person: document.getElementById('contactPerson').value.trim(),
            phone: document.getElementById('companyPhone').value.trim(),
            email: document.getElementById('companyEmail').value.trim(),
            address: document.getElementById('companyAddress').value.trim(),
            website: document.getElementById('companyWebsite').value.trim(),
            tax_number: document.getElementById('taxNumber').value.trim()
        };
    }

    editCompany(id) {
        const company = this.companies.find(c => c.id === id);
        if (!company) return;

        this.currentEditId = id;
        this.fillForm(company);
        
        // Form'a scroll
        document.getElementById('companyForm').scrollIntoView({ behavior: 'smooth' });
        
        // Save butonunu güncelle
        const saveBtn = document.getElementById('saveCompany');
        if (saveBtn) {
            saveBtn.innerHTML = '<span class="icon">💾</span> Güncelle';
        }
    }

    fillForm(company) {
        document.getElementById('companyName').value = company.company_name || '';
        document.getElementById('contactPerson').value = company.contact_person || '';
        document.getElementById('companyPhone').value = company.phone || '';
        document.getElementById('companyEmail').value = company.email || '';
        document.getElementById('companyAddress').value = company.address || '';
        document.getElementById('companyWebsite').value = company.website || '';
        document.getElementById('taxNumber').value = company.tax_number || '';
    }

    clearForm() {
        const form = document.getElementById('companyForm');
        if (form) {
            form.reset();
        }
        
        this.currentEditId = null;
        
        // Save butonunu sıfırla
        const saveBtn = document.getElementById('saveCompany');
        if (saveBtn) {
            saveBtn.innerHTML = '<span class="icon">💾</span> Kaydet';
        }
    }

    async activateCompany(id) {
        if (confirm('Bu firmayı aktif yapmak istediğinizden emin misiniz?')) {
            try {
                await window.electronAPI.setActiveCompany(id);
                this.showNotification('Firma aktif yapıldı!', 'success');
                this.loadCompanies();
                this.loadActiveCompany();
            } catch (error) {
                console.error('Firma aktif yapma hatası:', error);
                this.showNotification('Firma aktif yapılamadı!', 'error');
            }
        }
    }

    async deleteCompany(id) {
        const company = this.companies.find(c => c.id === id);
        if (!company) return;

        if (confirm(`"${company.company_name}" firmasını silmek istediğinizden emin misiniz?`)) {
            try {
                await window.electronAPI.deleteCompany(id);
                this.showNotification('Firma silindi!', 'success');
                this.loadCompanies();
                this.loadActiveCompany();
            } catch (error) {
                console.error('Firma silme hatası:', error);
                this.showNotification('Firma silinemedi!', 'error');
            }
        }
    }

    showNotification(message, type = 'info') {
        // Notification sistemi zaten mevcut
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            alert(message);
        }
    }
}

// Global instance oluştur
const companyManager = new CompanyManager();
