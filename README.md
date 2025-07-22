# Plise Perde Hesaplayıcı

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)

## Açıklama

Tengra Works tarafından geliştirilmiş, plise perde üreticileri ve bayileri için özel olarak tasarlanmış profesyonel plise perde hesaplama ve analiz sistemi masaüstü uygulamasıdır.

## 📋 Özellikler

- 🧮 **Otomatik Hesaplama**: Plise perde ölçüleri ve malzeme hesaplamaları
- 📊 **Analiz Sistemi**: Detaylı maliyet ve üretim analizleri
- 🎨 **Modern Arayüz**: Kullanıcı dostu ve profesyonel tasarım
- 💾 **Veri Saklama**: Hesaplamalarınızı kaydedin ve yönetin
- 🖥️ **Çapraz Platform**: Windows, macOS ve Linux desteği
- ⚡ **Hızlı Performans**: Electron tabanlı güvenilir performans

## 🚀 Kurulum

### Hazır Paketler

En son sürümü [Releases](https://github.com/tengra-works/plise-perde-hesaplayici/releases) sayfasından indirebilirsiniz:

- **Windows**: `.exe` dosyasını indirin ve çalıştırın
- **macOS**: `.dmg` dosyasını indirin ve uygulamayı Applications klasörüne sürükleyin  
- **Linux**: `.AppImage` dosyasını indirin ve çalıştırılabilir yapın

### Geliştirici Kurulumu

```bash
# Projeyi klonlayın
git clone https://github.com/tengra-works/plise-perde-hesaplayici.git

# Proje dizinine gidin
cd plise-perde-hesaplayici

# Bağımlılıkları yükleyin
npm install

# Uygulamayı çalıştırın
npm start
```

## 🛠️ Geliştirme

### Gereksinimler

- Node.js (v16 veya üzeri)
- npm veya yarn
- Electron

### Komutlar

```bash
# Geliştirme modunda çalıştır
npm run dev

# Üretim için derle
npm run build

# Platform spesifik derleme
npm run build:mac    # macOS için
npm run build:win    # Windows için  
npm run build:linux  # Linux için

# Test paketi oluştur
npm run pack
```

### Proje Yapısı

```text
plise-perde-hesaplayici/
├── main.js              # Ana Electron süreci
├── preload.js           # Preload script
├── renderer.js          # Renderer süreci
├── index.html           # Ana HTML dosyası
├── database.sqlite     # SQLite veritabanı
├── package.json        # Proje yapılandırması
├── migrate-data.js     # Veri migration scripti
└── src/
    ├── assets/         # Görsel dosyalar
    │   └── images/     # İkonlar ve görseller
    ├── js/             # JavaScript dosyaları
    │   └── database.js # Veritabanı yönetimi
    ├── styles/         # CSS stilleri
    └── views/          # HTML görünümleri
```

## 💡 Kullanım

1. **Uygulama Başlatma**: Uygulamayı açın
2. **Ölçü Girişi**: Plise perde ölçülerini girin
3. **Hesaplama**: Otomatik hesaplama sonuçlarını görüntüleyin
4. **Kaydetme**: Hesaplamalarınızı kaydedin
5. **Analiz**: Detaylı maliyet analizlerini inceleyin

## 🔧 Veri Yönetimi

Uygulama verileri SQLite veritabanında (`database.sqlite`) saklanır. Bu, daha güvenilir ve performanslı veri yönetimi sağlar.

### Migration

Eğer eski `data.json` formatından geçiş yapıyorsanız:

```bash
node migrate-data.js
```

Bu komut mevcut JSON verilerini SQLite veritabanına aktaracak ve JSON dosyasının yedeğini oluşturacaktır.

## 📸 Ekran Görüntüleri

Ekran görüntüleri eklenecek

## 🤝 Katkıda Bulunma

1. Bu projeyi fork edin
2. Feature branch oluşturun (`git checkout -b feature/yeni-ozellik`)
3. Değişikliklerinizi commit edin (`git commit -am 'Yeni özellik eklendi'`)
4. Branch'inizi push edin (`git push origin feature/yeni-ozellik`)
5. Pull Request oluşturun

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için [LICENSE](LICENSE) dosyasına bakın.

## 📞 İletişim

- **Geliştirici**: Tengra Works
- **Website**: [https://tengraworks.com](https://tengraworks.com)
- **GitHub**: [https://github.com/tengra-works](https://github.com/tengra-works)

## ⭐ Destek

Eğer bu proje işinize yaradıysa, lütfen bir ⭐ vererek destek olun!

---

Tengra Works ile güçlendirildi
