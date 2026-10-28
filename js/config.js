/**
 * CAPTCHA HCI Experiment - Central Configuration Object
 * "CAPTCHA Sistemlerinde Güvenlik ve Kullanılabilirlik Dengesi"
 * 
 * Tüm deney parametreleri TEK bir CONFIG nesnesi üzerinden yönetilir.
 * Pilot çalışma sonrasında bu parametreler sabitlenir ve README'de belgelenir.
 */

const CONFIG = {
  // Sürüm ve Protokol Bilgisi
  version: "1.0.0",
  protocolName: "HCI-CAPTCHA-USABILITY-2026",
  lastUpdated: "2026-10-28",

  // Deney Akış Parametreleri
  trialsPerCondition: 3,        // Her koşulda (Metin / Görsel) 3 deneme
  maxAttempts: 3,               // Her denemede tanınan azami deneme hakkı
  timeoutText: 60,              // Bozulmuş metin için zaman aşımı süresi (saniye)
  timeoutImage: 90,             // Görsel seçimi için zaman aşımı süresi (saniye)

  // A) Bozulmuş Metin CAPTCHA Parametreleri
  textConfig: {
    length: 5,                  // Karakter uzunluğu: 5 karakter
    // Karıştırılabilir karakterler (l, I, 1, O, 0) hariç tutulmuştur:
    allowedChars: "ABCDEFGHJKLMNPQRSTUVWXYZ23456789",
    canvasWidth: 260,
    canvasHeight: 84,
    fontFamily: "Newsreader, Georgia, serif",
    fontSize: 34,
    noiseLinesCount: 7,         // Eğrisel gürültü çizgisi adedi
    noiseDotsCount: 70,         // Rastgele gürültü noktası adedi
    maxRotationDeg: 18,         // Azami harf rotasyonu (derece, +/-)
    maxDisplacementY: 6,        // Azami dikey kayma (piksel, +/-)
    caseSensitive: false        // Giriş büyük-küçük harfe DUYARSIZ doğrulanır
  },

  // B) Görsel Seçimi CAPTCHA Parametreleri
  imageConfig: {
    gridDimension: 3,           // 3x3 ızgara (toplam 9 kare)
    targetCategory: "bisiklet",  // Hedef nesne sınıfı
    minTargetsPerGrid: 2,       // Izgara başına asgari hedef kare sayısı
    maxTargetsPerGrid: 4,       // Izgara başına azami hedef kare sayısı
    tileWidth: 512,
    tileHeight: 512
  },

  // Süre ve Analiz Kuralı
  analysisRules: {
    timeoutExcludedFromDurationMean: true, // Zaman aşımına uğrayanlar süre ortalamasına katılmaz
    withinSubjectsPaired: true,           // Eşleştirilmiş katılımcı içi analiz
    counterbalanceRatio: 0.5              // %50 A-B, %50 B-A rastgele atama
  }
};

// Global dışa aktarma (Tarayıcı ve Node uyumlu)
if (typeof module !== "undefined" && module.exports) {
  module.exports = CONFIG;
}
