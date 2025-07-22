const DatabaseManager = require('./src/js/database.js');
const fs = require('fs');
const path = require('path');

async function migrateDataFromJsonToSQLite() {
    console.log('🚀 JSON verilerini SQLite veritabanına aktarıyor...');
    
    try {
        // Data.json dosyasını oku
        let dataPath = path.join(__dirname, 'data.json');
        
        // Ana dizinde yoksa archive klasöründe ara
        if (!fs.existsSync(dataPath)) {
            dataPath = path.join(__dirname, 'archive', 'data.json');
        }
        
        if (!fs.existsSync(dataPath)) {
            console.error('❌ data.json dosyası bulunamadı! (Ana dizin veya archive klasöründe)');
            console.log('💡 data.json dosyası ana dizinde veya archive/ klasöründe bulunmalıdır.');
            return;
        }
        
        const jsonData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        console.log('✅ data.json dosyası okundu');
        
        // Veritabanı bağlantısı oluştur
        const db = new DatabaseManager();
        await db.connect();
        console.log('✅ SQLite veritabanına bağlandı');
        
        // Mevcut verileri temizle (isteğe bağlı)
        console.log('🧹 Mevcut veriler temizleniyor...');
        await db.db.run('DELETE FROM fabric_series');
        await db.db.run('DELETE FROM cost_settings');
        console.log('✅ Mevcut veriler temizlendi');
        
        // Fabric Series verilerini aktar
        console.log('📦 Kumaş serilerini aktarıyor...');
        if (jsonData.fabricSeries && Array.isArray(jsonData.fabricSeries)) {
            for (const fabric of jsonData.fabricSeries) {
                await db.addFabricSeries(fabric.name, fabric.price, fabric.cost);
                console.log(`   ✅ ${fabric.name} eklendi (Fiyat: ${fabric.price}, Maliyet: ${fabric.cost})`);
            }
        }
        
        // Cost Settings verilerini aktar
        console.log('⚙️  Maliyet ayarlarını aktarıyor...');
        if (jsonData.costSettings) {
            const settings = jsonData.costSettings;
            await db.updateCostSettings(
                settings.fixedCostPerUnit || 25,
                settings.aluminiumCostPerCm || 0.8
            );
            console.log(`   ✅ Maliyet ayarları eklendi (Sabit maliyet: ${settings.fixedCostPerUnit}, Alüminyum: ${settings.aluminiumCostPerCm})`);
        }
        
        // Veritabanını kapat
        await db.close();
        console.log('✅ Veritabanı bağlantısı kapatıldı');
        
        // Yedek oluştur
        const backupPath = path.join(__dirname, `data-backup-${Date.now()}.json`);
        fs.copyFileSync(dataPath, backupPath);
        console.log(`📦 data.json yedeği oluşturuldu: ${backupPath}`);
        
        console.log('');
        console.log('🎉 Veri aktarımı başarıyla tamamlandı!');
        console.log('');
        console.log('📋 Özet:');
        console.log(`   • ${jsonData.fabricSeries?.length || 0} kumaş serisi aktarıldı`);
        console.log('   • Maliyet ayarları aktarıldı');
        console.log('   • data.json yedeği oluşturuldu');
        console.log('');
        console.log('🚨 Önemli: Artık data.json dosyasını silebilir veya arşivleyebilirsiniz.');
        console.log('   Tüm veriler SQLite veritabanında (database.sqlite) tutuluyor.');
        
    } catch (error) {
        console.error('❌ Migration sırasında hata:', error);
        console.error('Stack trace:', error.stack);
    }
}

// Script doğrudan çalıştırılırsa migration'ı başlat
if (require.main === module) {
    migrateDataFromJsonToSQLite();
}

module.exports = { migrateDataFromJsonToSQLite };
