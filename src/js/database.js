const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { app } = require('electron');
const fs = require('fs');

class DatabaseManager {
    constructor() {
        if (app && app.isPackaged) {
            // Build edilmiş uygulama için: executable'ın bulunduğu klasörde 'data' klasörü oluştur
            // Bu hem Windows hem macOS hem Linux için çalışır
            const execPath = process.execPath;
            const appDir = path.dirname(execPath);
            
            // Windows'ta portable uygulama için özel kontrol
            const isWindowsPortable = process.platform === 'win32' && 
                                    (execPath.includes('portable') || 
                                     !execPath.includes('Program Files') && 
                                     !execPath.includes('AppData'));
            
            let dataDir;
            if (isWindowsPortable) {
                // Windows portable versiyonu için uygulama klasöründe 'data' klasörü
                dataDir = path.join(appDir, 'data');
            } else {
                // Normal kurulum için uygulama klasöründe 'data' klasörü
                dataDir = path.join(appDir, 'data');
            }
            
            this.dbPath = path.join(dataDir, 'database.sqlite');
        } else {
            // Development için mevcut yol
            this.dbPath = path.join(__dirname, '../../database.sqlite');
        }
        
        this.db = null;
        this.ensureDatabaseDirectory();
    }

    // Veritabanı klasörünün var olduğundan emin ol
    ensureDatabaseDirectory() {
        const dbDir = path.dirname(this.dbPath);
        
        try {
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }
            
            // Yazma izni kontrol et
            fs.accessSync(dbDir, fs.constants.W_OK);
        } catch (error) {
            
            // Hata durumunda userData klasörüne geç
            if (app) {
                const fallbackPath = path.join(app.getPath('userData'), 'database.sqlite');
                this.dbPath = fallbackPath;
                
                const fallbackDir = path.dirname(fallbackPath);
                if (!fs.existsSync(fallbackDir)) {
                    fs.mkdirSync(fallbackDir, { recursive: true });
                }
            }
        }
    }

    // Veritabanı bağlantısını aç
    connect() {
        return new Promise((resolve, reject) => {
            // Veritabanı dosyasının var olduğundan emin ol
            this.ensureDatabaseDirectory();
            
            this.db = new sqlite3.Database(this.dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
                if (err) {
                    reject(err);
                } else {
                    this.initializeTables()
                        .then(() => {
                            resolve();
                        })
                        .catch((initErr) => {
                            reject(initErr);
                        });
                }
            });
        });
    }

    // Veritabanı tablolarını oluştur
    initializeTables() {
        return new Promise((resolve, reject) => {
            // İlk önce temel tabloları oluştur
            const tableQueries = [
                // Kumaş serileri tablosu
                `CREATE TABLE IF NOT EXISTS fabric_series (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE,
                    price REAL NOT NULL,
                    cost REAL NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`,
                
                // Maliyet ayarları tablosu
                `CREATE TABLE IF NOT EXISTS cost_settings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    fixed_cost_per_unit REAL NOT NULL DEFAULT 25,
                    aluminium_cost_per_cm REAL NOT NULL DEFAULT 0.8,
                    plise_cutting_multiplier REAL NOT NULL DEFAULT 2.1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`,
                
                // Hesaplamalar tablosu
                `CREATE TABLE IF NOT EXISTS calculations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    fabric_series_id INTEGER,
                    width REAL NOT NULL,
                    height REAL NOT NULL,
                    quantity INTEGER NOT NULL DEFAULT 1,
                    unit_price REAL NOT NULL,
                    total_price REAL NOT NULL,
                    unit_cost REAL NOT NULL,
                    total_cost REAL NOT NULL,
                    profit REAL NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (fabric_series_id) REFERENCES fabric_series (id)
                )`,
                
                // Firma bilgileri tablosu
                `CREATE TABLE IF NOT EXISTS company_info (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    company_name TEXT NOT NULL,
                    contact_person TEXT,
                    phone TEXT,
                    email TEXT,
                    address TEXT,
                    website TEXT,
                    tax_number TEXT,
                    is_active BOOLEAN DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`
            ];

            let completed = 0;
            let hasError = false;
            
            tableQueries.forEach((query, index) => {
                this.db.run(query, (err) => {
                    if (hasError) return; // Zaten hata varsa devam etme
                    
                    if (err) {
                        hasError = true;
                        reject(err);
                    } else {
                        completed++;
                        
                        if (completed === tableQueries.length) {
                            // Tablolar oluşturulduktan sonra trigger'ları ekle
                            this.createTriggers().then(() => {
                                this.migratePliseCuttingMultiplier().then(() => {
                                    this.initializeDefaultData().then(resolve).catch(reject);
                                }).catch(reject);
                            }).catch(reject);
                        }
                    }
                });
            });
        });
    }

    // Trigger'ları oluştur
    createTriggers() {
        return new Promise((resolve, reject) => {
            const triggerQueries = [
                // Trigger for updated_at
                `CREATE TRIGGER IF NOT EXISTS update_fabric_series_timestamp 
                 AFTER UPDATE ON fabric_series
                 FOR EACH ROW
                 BEGIN
                     UPDATE fabric_series SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
                 END`,
                
                `CREATE TRIGGER IF NOT EXISTS update_cost_settings_timestamp 
                 AFTER UPDATE ON cost_settings
                 FOR EACH ROW
                 BEGIN
                     UPDATE cost_settings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
                 END`,
                 
                `CREATE TRIGGER IF NOT EXISTS update_company_info_timestamp 
                 AFTER UPDATE ON company_info
                 FOR EACH ROW
                 BEGIN
                     UPDATE company_info SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
                 END`
            ];

            let completed = 0;
            let hasError = false;
            
            if (triggerQueries.length === 0) {
                resolve();
                return;
            }
            
            triggerQueries.forEach((query, index) => {
                this.db.run(query, (err) => {
                    if (hasError) return;
                    
                    if (err) {
                        // Trigger hataları kritik olmayabilir, ancak logla
                    }
                    
                    completed++;
                    if (completed === triggerQueries.length) {
                        resolve();
                    }
                });
            });
        });
    }

    // Plise kesim çarpanı sütunu migration işlemi
    migratePliseCuttingMultiplier() {
        return new Promise((resolve, reject) => {
            // Önce sütunun var olup olmadığını kontrol et
            this.db.all("PRAGMA table_info(cost_settings)", (err, columns) => {
                if (err) {
                    reject(err);
                    return;
                }

                const hasPliseColumn = columns.some(col => col.name === 'plise_cutting_multiplier');
                
                if (!hasPliseColumn) {
                    this.db.run(
                        "ALTER TABLE cost_settings ADD COLUMN plise_cutting_multiplier REAL NOT NULL DEFAULT 2.1",
                        (alterErr) => {
                            if (alterErr) {
                                reject(alterErr);
                            } else {
                                resolve();
                            }
                        }
                    );
                } else {
                    resolve();
                }
            });
        });
    }

    // Varsayılan verileri ekle
    initializeDefaultData() {
        return new Promise((resolve, reject) => {
            // Önce mevcut verileri kontrol et
            this.db.get("SELECT COUNT(*) as count FROM fabric_series", (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }

                // Eğer kumaş verisi yoksa, varsayılanları ekle
                if (row.count === 0) {
                    const fabricInserts = [
                        { name: 'Standart Plise', price: 350, cost: 180 },
                        { name: 'Blackout Plise', price: 450, cost: 220 },
                        { name: 'Premium Plise', price: 650, cost: 350 }
                    ];

                    let completed = 0;
                    fabricInserts.forEach((fabric) => {
                        this.addFabricSeries(fabric.name, fabric.price, fabric.cost)
                            .then(() => {
                                completed++;
                                if (completed === fabricInserts.length) {
                                    this.initializeCostSettings().then(resolve).catch(reject);
                                }
                            })
                            .catch(reject);
                    });
                } else {
                    this.initializeCostSettings().then(resolve).catch(reject);
                }
            });
        });
    }

    // Maliyet ayarlarını başlat
    initializeCostSettings() {
        return new Promise((resolve, reject) => {
            this.db.get("SELECT COUNT(*) as count FROM cost_settings", (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }

                if (row.count === 0) {
                    this.db.run(
                        "INSERT INTO cost_settings (fixed_cost_per_unit, aluminium_cost_per_cm, plise_cutting_multiplier) VALUES (?, ?, ?)",
                        [25, 0.8, 2.1],
                        (err) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve();
                            }
                        }
                    );
                } else {
                    resolve();
                }
            });
        });
    }

    // Kumaş serileri yönetimi
    getFabricSeries() {
        return new Promise((resolve, reject) => {
            this.db.all("SELECT * FROM fabric_series ORDER BY name", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    addFabricSeries(name, price, cost) {
        return new Promise((resolve, reject) => {
            this.db.run(
                "INSERT INTO fabric_series (name, price, cost) VALUES (?, ?, ?)",
                [name, price, cost],
                function(err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID, name, price, cost });
                }
            );
        });
    }

    updateFabricSeries(id, name, price, cost) {
        return new Promise((resolve, reject) => {
            this.db.run(
                "UPDATE fabric_series SET name = ?, price = ?, cost = ? WHERE id = ?",
                [name, price, cost, id],
                (err) => {
                    if (err) reject(err);
                    else resolve({ id, name, price, cost });
                }
            );
        });
    }

    deleteFabricSeries(id) {
        return new Promise((resolve, reject) => {
            this.db.run("DELETE FROM fabric_series WHERE id = ?", [id], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    // Maliyet ayarları yönetimi
    getCostSettings() {
        return new Promise((resolve, reject) => {
            this.db.get("SELECT * FROM cost_settings ORDER BY id DESC LIMIT 1", (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    const result = row || { 
                        fixed_cost_per_unit: 25, 
                        aluminium_cost_per_cm: 0.8, 
                        plise_cutting_multiplier: 2.1 
                    };
                    resolve(result);
                }
            });
        });
    }

    updateCostSettings(fixedCostPerUnit, aluminiumCostPerCm, pliseCuttingMultiplier = 2.1) {
        return new Promise((resolve, reject) => {
            
            const db = this.db; // Database reference'ını sakla
            
            // Önce mevcut kayıt var mı kontrol et
            db.get("SELECT id FROM cost_settings ORDER BY id DESC LIMIT 1", (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                if (row) {
                    // Mevcut kaydı güncelle
                    db.run(
                        "UPDATE cost_settings SET fixed_cost_per_unit = ?, aluminium_cost_per_cm = ?, plise_cutting_multiplier = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                        [fixedCostPerUnit, aluminiumCostPerCm, pliseCuttingMultiplier, row.id],
                        function(updateErr) {
                            if (updateErr) {
                                reject(updateErr);
                            } else {
                                resolve();
                            }
                        }
                    );
                } else {
                    // Yeni kayıt ekle
                    db.run(
                        "INSERT INTO cost_settings (fixed_cost_per_unit, aluminium_cost_per_cm, plise_cutting_multiplier, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                        [fixedCostPerUnit, aluminiumCostPerCm, pliseCuttingMultiplier],
                        function(insertErr) {
                            if (insertErr) {
                                reject(insertErr);
                            } else {
                                resolve();
                            }
                        }
                    );
                }
            });
        });
    }

    // Hesaplamalar yönetimi
    addCalculation(fabricSeriesId, width, height, quantity, unitPrice, totalPrice, unitCost, totalCost, profit) {
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT INTO calculations 
                 (fabric_series_id, width, height, quantity, unit_price, total_price, unit_cost, total_cost, profit) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [fabricSeriesId, width, height, quantity, unitPrice, totalPrice, unitCost, totalCost, profit],
                function(err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID });
                }
            );
        });
    }

    getCalculations(limit = null) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT c.*, f.name as fabric_name 
                FROM calculations c 
                LEFT JOIN fabric_series f ON c.fabric_series_id = f.id 
                ORDER BY c.created_at DESC
                ${limit ? `LIMIT ${limit}` : ''}
            `;
            
            this.db.all(query, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    deleteCalculation(id) {
        return new Promise((resolve, reject) => {
            this.db.run("DELETE FROM calculations WHERE id = ?", [id], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    clearAllCalculations() {
        return new Promise((resolve, reject) => {
            this.db.run("DELETE FROM calculations", (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    // Toplam istatistikler
    getCalculationStats() {
        return new Promise((resolve, reject) => {
            this.db.get(`
                SELECT 
                    COUNT(*) as total_calculations,
                    SUM(total_price) as total_revenue,
                    SUM(total_cost) as total_cost,
                    SUM(profit) as total_profit,
                    AVG(profit) as average_profit
                FROM calculations
            `, (err, row) => {
                if (err) reject(err);
                else resolve(row || {
                    total_calculations: 0,
                    total_revenue: 0,
                    total_cost: 0,
                    total_profit: 0,
                    average_profit: 0
                });
            });
        });
    }

    // Firma bilgileri yönetimi
    getCompanyInfo() {
        return new Promise((resolve, reject) => {
            this.db.get("SELECT * FROM company_info WHERE is_active = 1 ORDER BY id DESC LIMIT 1", (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row || null);
                }
            });
        });
    }

    addCompanyInfo(companyData) {
        return new Promise((resolve, reject) => {
            const { company_name, contact_person, phone, email, address, website, tax_number } = companyData;
            
            // Önce mevcut aktif firmaları pasif yap
            this.db.run("UPDATE company_info SET is_active = 0", (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                // Yeni firmayı ekle
                this.db.run(
                    `INSERT INTO company_info 
                     (company_name, contact_person, phone, email, address, website, tax_number, is_active) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
                    [company_name, contact_person, phone, email, address, website, tax_number],
                    function(err) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve({ id: this.lastID, ...companyData });
                        }
                    }
                );
            });
        });
    }

    updateCompanyInfo(id, companyData) {
        return new Promise((resolve, reject) => {
            const { company_name, contact_person, phone, email, address, website, tax_number } = companyData;
            
            this.db.run(
                `UPDATE company_info 
                 SET company_name = ?, contact_person = ?, phone = ?, email = ?, 
                     address = ?, website = ?, tax_number = ?, updated_at = CURRENT_TIMESTAMP 
                 WHERE id = ?`,
                [company_name, contact_person, phone, email, address, website, tax_number, id],
                (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ id, ...companyData });
                    }
                }
            );
        });
    }

    getAllCompanies() {
        return new Promise((resolve, reject) => {
            this.db.all("SELECT * FROM company_info ORDER BY created_at DESC", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    setActiveCompany(id) {
        return new Promise((resolve, reject) => {
            // Önce tüm firmaları pasif yap
            this.db.run("UPDATE company_info SET is_active = 0", (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                // Seçili firmayı aktif yap
                this.db.run("UPDATE company_info SET is_active = 1 WHERE id = ?", [id], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });
    }

    deleteCompany(id) {
        return new Promise((resolve, reject) => {
            this.db.run("DELETE FROM company_info WHERE id = ?", [id], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    // Veritabanı bağlantısını kapat
    close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }
}

module.exports = DatabaseManager;
