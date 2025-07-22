# Build Workflow

Bu proje GitHub Actions kullanarak otomatik build yapar.

## Build Süreci

### Desteklenen Platformlar
- **macOS**: DMG installer
- **Windows**: 
  - NSIS installer (.exe)
  - Portable executable (.exe)

### Workflow Tetikleyicileri
- `main` branch'e push
- Tag ile push (örnek: `v1.0.0`)
- Pull request
- Manuel tetikleme (workflow_dispatch)

### Otomatik Release
Tag ile push yapıldığında (örnek: `v2.0.1`) otomatik release oluşturulur ve build'ler yüklenir.

## Portable Özellikler

### macOS
- Uygulama klasöründe `data/database.sqlite` oluşturur
- Yazma izni yoksa `~/Library/Application Support/Perde Hesaplama/` kullanır

### Windows
- Portable versiyonda executable'ın yanında `data/database.sqlite` oluşturur
- Normal installer versiyonda da aynı mantık çalışır

## Manual Build

Local build için:

```bash
# macOS için
npm run build:mac

# Windows için (sadece Windows'ta çalışır)
npm run build:win

# Tüm platformlar için (platform desteği gerekli)
npm run build:all
```

## Release Yapma

Yeni release için:

1. Version'u güncelleyin: `package.json`
2. Tag oluşturun: `git tag v2.0.1`
3. Push yapın: `git push origin v2.0.1`
4. GitHub Actions otomatik release oluşturacak
