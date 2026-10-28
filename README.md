# CAPTCHA Sistemlerinde Güvenlik ve Kullanılabilirlik Dengesi: Kullanıcı Deneyi ve Literatür Temelli Bir Değerlendirme

**Ders:** İnsan-Bilgisayar Etkileşimi (HCI)  
**Tasarım Türü:** Tamamen Statik, Netlify Uyumlu Deney Aracı ve Araştırma Raporlama Platformu  
**Protokol Sürümü:** `CONFIG v1.0.0`

---

## 1. Proje Kimliği ve Araştırma Soruları

Bu proje, web güvenlik mimarilerinde yaygın olarak kullanılan iki görünür Turing testi prototipinin (**bozulmuş metin okuma** ve **3×3 görsel seçimi**) kullanıcı performansı, bilişsel çaba ve öznel güvenlik algısı üzerindeki etkilerini kontrollü bir kullanıcı deneyiyle incelemektedir.

### Birbirine Karıştırılmayacak Üç Temel Kavram
1. **Güvenlik (Bot Direnci):** Belirli bir saldırı modeli altında otomatik çözücülere, optik karakter tanıma (OCR) algoritmalarına ve çok modlu yapay zekâ (VLM) modellerine karşı teknik savunma gücü.
2. **Kullanılabilirlik:** Gerçek insanların görevi başarıyla, makul bir sürede ve kabul edilebilir zihinsel çabayla tamamlayabilmesi.
3. **Algılanan Güvenlik:** Kullanıcının sistemin koruyuculuğuna ve ciddiyetine ilişkin **öznel değerlendirmesi** — *gerçek güvenlik ve bot direnci değildir*. Arayüz metinlerinde ve analizlerde bu kavram her zaman "algılanan güvenlik" adıyla anılır.

### Araştırma Soruları
- **RQ1:** Bozulmuş metin ve görsel seçimi CAPTCHA'ları ilk denemede doğruluk, görev tamamlama oranı, tamamlama süresi, yeniden deneme ve vazgeçme sayısı bakımından nasıl farklılaşır?
- **RQ2:** Tür başına algılanan zorluk/çaba ve algılanan güvenlik değerlendirmeleri nasıl değişir?
- **RQ3:** Kullanıcılar türler arasında hangi nedenlerle tercih yapar?
- **RQ4:** Kullanılabilirlik bulguları, literatürdeki güvenlik ve erişilebilirlik sınırlılıklarıyla birlikte yorumlandığında denge maliyeti (trade-off) nasıl bir tablo çizer?

### Konumlandırma ve Sınırlılıklar
- **Yerel Prototipler:** Deneyde istemci tarafında çalışan vanilla JavaScript prototipleri kullanılmıştır; sonuçlar reCAPTCHA veya hCaptcha gibi ticari sistemlerin doğrudan performans değerlendirmesi olarak sunulamaz.
- **Görünmez Sistemler:** reCAPTCHA v3 veya Cloudflare Turnstile gibi risk tabanlı görünmez sistemler, kullanıcı görevi içermediğinden deneye üçüncü koşul olarak dahil edilmemiş; RQ4 kapsamında literatür üzerinden tartışılmıştır.
- **Erişilebilirlik Sınırlılığı:** Deney görsel modaliteye dayanmaktadır. Ekran okuyucu kullanan veya görme engelli bireyler örnekleme dahil edilmemiştir; bu durum çalışmanın bir sınırlılığı olarak W3C WCAG 2.2 belgeleriyle tartışılmıştır.

---

## 2. Deney Tasarımı ve Metodolojik Kurallar

- **Katılımcı İçi (Within-Subjects) Tasarım:** Her katılımcı her iki koşulu da deneyimler.
  - **Koşul A:** Bozulmuş Metin CAPTCHA
  - **Koşul B:** Görsel Seçimi CAPTCHA (3×3 ızgara)
- **Sıra Dengeleme (Counterbalancing):** Sıra etkisini (öğrenme/yorgunluk) dengelemek amacıyla katılımcıların yarısı **A &rarr; B**, diğer yarısı **B &rarr; A** sırasını izler. Atama JavaScript ile 50/50 oranında rastgele yapılır ve veri günlüğüne yazılır.
- **Doğal Bağlam (Kayıt Formu Demosu):** CAPTCHA'lar soyut bir ekranda değil, basit bir demo web kayıt formunun güvenlik adımı olarak sunulur. Demo alanlarındaki bilgiler (ad, e-posta) kesinlikle sunucuya iletilmez veya kaydedilmez. Formda parola alanı yer almaz.
- **Katılımcı Kodu:** Gizlilik ilkesi gereği isim-soyisim toplanmaz; **sistem tarafından otomatik üretilen** ve katılımcının değiştiremediği anonim kod (`KAT_XXXX9999`) kullanılır.
- **Koşulsuz Çekilme Hakkı:** Ekranın üstünde her an görünür **"Deneyden Ayrıl"** butonu bulunur; tıklandığında veri sunucuya gönderilmez ve oturum verileri anında imha edilir.

---

## 3. Süre Ölçümü ve Analiz Kuralları

- **$t_0$ (Başlangıç Zamanı):** CAPTCHA bileşeninin ekranda görünür hale geldiği ve DOM'a çizildiği andaki milisaniye zaman damgası (`Date.now()`).
- **$t_{first}$ (İlk Etkileşim Zamanı):** Katılımcının metin alanına ilk karakteri yazdığı veya görsel ızgarasındaki ilk kareye tıkladığı anın zaman damgası.
- **$t_{end}$ (Bitiş Zamanı):** Görevin başarıyla çözüldüğü, zaman aşımına uğradığı veya deneme haklarının tükendiği an.
- **Tamamlanma Süresi:** $(t_{end} - t_0) / 1000$ saniye.
- **ZAMAN AŞIMI KURALI (Censored Data):** Zaman aşımına uğrayan denemeler, **tamamlanmış çözüm süresi ortalamasına katılmaz**. Dağılım tablolarında ve kutu grafiklerinde bu denemeler ayrı olarak "zaman aşımı adedi" olarak raporlanır.
- **Eşleştirilmiş Analiz:** Aynı katılımcının iki koşuldaki sonuçları eşleştirilmiş olarak karşılaştırılır; her deneme bağımsız bir katılımcı gibi ele alınmaz.

---

## 4. Merkezi Yapılandırma Nesnesi (`CONFIG`)

Tüm deney parametreleri `js/config.js` dosyasındaki tek bir nesne üzerinden yönetilir:

```javascript
const CONFIG = {
  version: "1.0.0",
  protocolName: "HCI-CAPTCHA-USABILITY-2026",
  trialsPerCondition: 3,        // Koşul başına deneme adedi
  maxAttempts: 3,               // Deneme başına azami hak
  timeoutText: 60,              // Bozulmuş metin zaman aşımı (saniye)
  timeoutImage: 90,             // Görsel seçimi zaman aşımı (saniye)

  textConfig: {
    length: 5,                  // Karakter uzunluğu
    allowedChars: "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", // l, I, 1, O, 0 hariç
    canvasWidth: 260,
    canvasHeight: 84,
    fontFamily: "Newsreader, Georgia, serif",
    fontSize: 34,
    noiseLinesCount: 4,         // Gürültü çizgileri
    noiseDotsCount: 35,         // Gürültü noktaları
    maxRotationDeg: 18,         // Karakter rotasyon açısı
    maxDisplacementY: 6,        // Dikey deplasman
    caseSensitive: false        // Büyük-küçük harf duyarsız
  },

  imageConfig: {
    gridDimension: 3,           // 3x3 ızgara
    targetCategory: "bisiklet",  // Hedef nesne sınıfı
    minTargetsPerGrid: 2,
    maxTargetsPerGrid: 4
  },

  analysisRules: {
    timeoutExcludedFromDurationMean: true,
    withinSubjectsPaired: true,
    counterbalanceRatio: 0.5
  }
};
```

> **Not:** Bu varsayılan değerler 3–5 kişilik pilot çalışmanın ardından sabitlenir. `CONFIG.version` alanı her form gönderimine eklenir; parametreler değiştiğinde eski veriler yeni veriyle birleştirilmez.

---

## 5. Uyaran Sabitliği ve Manifestosu (Stimulus Constancy)

Ölçüm bütünlüğünü korumak amacıyla çalışma anında dinamik/rastgele görsel üretilmez; her katılımcı sabit ve belgelenmiş bir uyaran havuzuyla karşılaşır:

### A) Görsel Kareleri Havuzu (`/images/tiles/` ve `data/stimuli.json`)
- **Format:** 512×512 piksel JPEG gerçek fotoğraf (kare kırpımı); yapay/vektör illüstrasyon değil.
- **Kaynak:** Kareler doğrudan `images/tiles/*.jpg` yerel dosyalarından yüklenir (harici görsel CDN'i yok). Netlify CSP'si (`img-src 'self' data:`) buna izin verecek şekilde kurulmuştur.
- **Arayüz:** Görsel seçimi adımı Google reCAPTCHA v2'nin görsel challenge ekranına benzetilmiştir: mavi başlıkta hedef nesne (bisiklet) ve örnek görsel, 3×3 kare ızgarası, alt çubukta yenile/ses/bilgi ikonları ve mavi "DOĞRULA" butonu. Erişilebilirlik gereği karelerin `alt`/`aria-label` metinleri cevabı açığa çıkarmayacak şekilde nötr tutulur (`Görsel 1`, `Görsel 2`, …).
- **Hedef Kareler (Bisiklet):**
  - `tile_bike_01.jpg`: Bina önünde bisiklet park demirine kilitli bisikletler
  - `tile_bike_02.jpg`: Taş duvar önünde park edilmiş bisiklet
  - `tile_bike_03.jpg`: Amsterdam'da duvar önünde park edilmiş şehir bisikleti
  - `tile_bike_04.jpg`: Bisiklet kafesinde park edilmiş bisiklet
  - `tile_bike_05.jpg`: Çocuk koltuğu olan park edilmiş şehir bisikleti
  - `tile_bike_06.jpg`: Yolda bisiklet süren kişi
- **Karıştırıcı Kareler (Distractors):**
  - `tile_dist_motorcycle.jpg`: Yol kenarında park edilmiş motosiklet (semantik yakın karıştırıcı)
  - `tile_dist_scooter.jpg`: Kaldırımda elektrikli skuter (semantik yakın karıştırıcı)
  - `tile_dist_bench.jpg`: Park bankı
  - `tile_dist_fence.jpg`: Ferforje bahçe parmaklığı
  - `tile_dist_hydrant.jpg`: Yangın musluğu
  - `tile_dist_lamp.jpg`: Kent meydanında sıralı sokak lambaları
  - `tile_dist_car.jpg`: Park edilmiş otomobil
  - `tile_dist_bus_stop.jpg`: Otobüs durağı
  - `tile_dist_fountain.jpg`: Sanat müzesi önündeki kent çeşmesi

### B) Sabit Görsel Bulmaca Düzenleri
1. **Deneme 1 (`img_puz_01`):** 3 hedef (`tile_bike_01`, `02`, `03`) + 6 karıştırıcı.
2. **Deneme 2 (`img_puz_02`):** 2 hedef (`tile_bike_04`, `05`) + 7 karıştırıcı.
3. **Deneme 3 (`img_puz_03`):** 4 hedef (`tile_bike_01`, `03`, `05`, `06`) + 5 karıştırıcı.

### C) Bozulmuş Metin Sabit Uyaranları
- **Deneme 1:** `T7W2K` (Yenileme alternatifleri: `M4K9R`, `D2X7P`)
- **Deneme 2:** `P8X4M` (Yenileme alternatifleri: `V6H3Y`, `B9E4C`)
- **Deneme 3:** `H3N9F` (Yenileme alternatifleri: `R8T2W`, `C5M7K`)

---

## 6. Veri Toplama, Netlify Forms ve Fallback

### Netlify Forms Yapılandırması
Sitenin `index.html` dosyası içinde Netlify'ın otomatik olarak algıladığı form tanımı bulunmaktadır:

```html
<form name="captcha-deney" method="POST" data-netlify="true" netlify-honeypot="bot-field" hidden>
  ...
</form>
```

- **Toplanan Gizli Alanlar:**
  - `participant_code`: Katılımcının anonim kodu
  - `order`: Atanan sıra ("AB" veya "BA")
  - `timestamp`: Gönderim anı (ISO string)
  - `config_version`: Çalışan protokol sürümü
  - `config_snapshot`: Deney anındaki `CONFIG` nesnesi
  - `trial_log`: 6 denemenin tamamının ayrıntılı zaman damgaları, deneme sayıları ve doğruluğu (JSON dizesi)
  - `survey_cond1`, `survey_cond2`: Koşul sonrası anket puanları (1-7 Likert)
  - `pref_easier`, `pref_faster`, `pref_safer`, `pref_reason`: Tercihler ve açık uçlu gerekçe
  - `age_group`, `device_type`, `captcha_frequency`: Sınırlı demografik bilgiler

### Netlify Ücretsiz Plan Kotası ve CSV Dışa Aktarma
- **100 Gönderim / Ay Sınırı:** Netlify ücretsiz planında ayda 100 form iletim hakkı tanınır. Bu ders projesinin 20–30 kişilik örneklem boyutu için bu kota fazlasıyla yeterlidir.
- **CSV Dışa Aktarma Adımları:**
  1. Netlify paneline (`app.netlify.com`) giriş yapınız.
  2. Proje sitesini seçiniz ve **Forms** sekmesine tıklayınız.
  3. `captcha-deney` formunun içine giriniz.
  4. Sağ üstteki **Download as CSV** butonuna basarak tüm katılımcı verilerini tek bir tabloda indiriniz.

### Çevrimdışı ve Ağ Hatası Fallback Sistemi
Kullanıcı deneyi yerel bir test ortamında çalıştırıldığında veya Netlify form iletimi ağ kesintisine uğradığında:
- Ekranda otomatik olarak biçimlendirilmiş **JSON metni** ve **"JSON'u Panoya Kopyala"** butonu belirir.
- Katılımcıya "Veriniz yerel olarak hazırlandı, lütfen kopyalayıp araştırmacıya iletiniz" yönergesi sunulur.
- Ayrıca tamamlanan her deney otomatik olarak tarayıcı `localStorage`'ına (`captcha_submissions`) kaydedilir; araştırmacı paneli aynı tarayıcıda bu kayıtları `data/results.json` ile birleştirerek gösterir (statik sitede sunucu tarafı yazma yoktur; bu yüzden aynı tarayıcı ve aynı adres kullanılmalıdır).

### Araştırmacı Paneli Erişimi (sonuclar.html)
- Panelde **giriş ekranı yoktur**. Sonuçlar yalnızca doğru anahtar bağlantısıyla açılır; anahtar araştırmacıya ayrıca iletilir ve **repoda düz metin olarak tutulmaz**.
- Kodda anahtar **düz metin olarak saklanmaz**; tuzlu hash ile doğrulanır. Anahtarı değiştirmek için `sonuclar.html` içindeki `ACCESS_HASH` değerini yeni anahtarın hash'i ile güncelleyin.
- Not: Bu, yalnızca araştırmacıyı ayırt etmeye yönelik **basit istemci tarafı gizlemedir** (tek başına gerçek güvenlik değildir). Gerçek erişim kontrolü için Netlify panelinden **Site Settings → Access → Password Protection** veya bir **Netlify Function** kullanılmalıdır.

---

## 7. Pilot Çalışma Kontrol Listesi (Pilot Checklist)

Ana deney açılmadan önce 3–5 kişilik bir pilot grup ile şu maddeler doğrulanmalıdır:
- [ ] **Sıra Dengeleme Kontrolü:** Sayfa farklı tarayıcılarda açıldığında yaklaşık %50 oranında "AB" ve "BA" sıralarının başladığı teyit edildi mi?
- [ ] **Canvas Okunabilirliği:** Bozulmuş metindeki bozulma seviyesi katılımcılar için çözülemez derecede aşırı mı? Harflerin tanınma oranı pilotta %60–%80 bandında mı?
- [ ] **Görsel Seçimi Netliği:** 3×3 ızgaradaki bisikletler ve karıştırıcılar (özellikle motosiklet ve skuter) katılımcılar tarafından net ayırt edilebiliyor mu?
- [ ] **Zaman Aşımı Süreleri:** 60 sn (metin) ve 90 sn (görsel) süreleri makul mü? Katılımcılar süre baskısından dolayı gereksiz panik yaşıyor mu?
- [ ] **Mobil Dokunma Hedefleri:** Akıllı telefonda karelerin tıklanması (min 44×44px dokunma hedefi) ve form alanları rahat çalışıyor mu?
- [ ] **Veri İletimi:** Netlify Forms panosuna deneme kayıtlarının eksiksiz düştüğü ve JSON ayrıştırmasının çalıştığı doğrulandı mı?

---

## 8. Veri Analizi ve İstatistiksel Yöntem

İndirilen CSV/JSON verileri R, Python (Pandas/SciPy) veya SPSS ortamında çözümlenirken şu kurallar izlenir:
1. **Eşleştirilmiş Karşılaştırma:** Metin ve görsel süreleri aynı katılımcı üzerinden eşleştirildiği için bağımsız t-testi yerine **Eşleştirilmiş t-testi (Paired t-test)** veya normallik varsayımı bozulduğunda parametrik olmayan **Wilcoxon İşaretli Sıralar Testi (Wilcoxon Signed-Rank Test)** kullanılır.
2. **Süre Dağılımı:** Süreler sağa çarpık (right-skewed) dağılma eğilimindedir. Bu nedenle yalnızca aritmetik ortalama değil, **Medyan** ve **Çeyrekler Aralığı (IQR)** birincil dağılım ölçüsü olarak raporlanır.
3. **Zaman Aşımları:** Zaman aşımına uğrayan kayıtlar süre analizine dahil edilmez, ayrıca "zaman aşımı oranı" olarak raporlanır.
4. **Likert Puanları:** 1-7 Likert verileri sıra ölçekli olduğu için medyan ve mod değerleriyle birlikte raporlanır.

### Makale Figürleri (matplotlib + seaborn)
`scripts/generate_charts.py`, `data/results.json` (veya panelden indirilen JSON) üzerinden 300 dpi makale figürleri üretir:
- **Fig 1:** Eşleştirilmiş tamamlama süresi (kutu + nokta + katılımcı bağlantı çizgileri + grup ortalaması)
- **Fig 2:** İlk deneme doğruluğu ve tamamlama oranı (katılımcı bazlı, ortalama ± %95 GA)
- **Fig 3:** Yeniden deneme, zaman aşımı ve başarısız deneme sayıları
- **Fig 4:** Algılanan zorluk ve algılanan güvenlik dağılımı (Likert 1–7)
- **Fig 5:** Algılanan zorluk ile algılanan güvenlik ilişkisi (nokta + ortalama)
- **Fig 6:** Katılımcı tercihleri (yığılmış oran)
- **Fig 7:** Özet istatistik tablosu

Kullanım: `python scripts/generate_charts.py --input data/results.json --outdir figures`

---

## 9. Kaynakça (Literature References)

1. **Bursztein, E., Bethard, S., Fabry, C., Mitchell, J. C. & Jurafsky, D. (2010).** How Good Are Humans at Solving CAPTCHAs? A Large Scale Evaluation. *IEEE Symposium on Security and Privacy*. [Stanford NLP](https://nlp.stanford.edu/pubs/bursztein_2010_captcha.pdf)
2. **Bursztein, E. vd.** Easy Does It: More Usable CAPTCHAs. [Stanford NLP](https://nlp.stanford.edu/pubs/easy.pdf)
3. **Searles, A., Nakatsuka, Y., Ozturk, E., Paverd, A., Tsudik, G. & Enkoji, A. (2023).** An Empirical Study & Evaluation of Modern CAPTCHAs. *USENIX Security 2023*. [arXiv:2307.12108](https://arxiv.org/pdf/2307.12108)
4. **W3C (2021).** Inaccessibility of CAPTCHA: Alternatives to Visual Turing Tests on the Web. *W3C Group Draft Note*. [W3C Turing Test](https://www.w3.org/TR/turingtest/)
5. **W3C.** Understanding Success Criterion 3.3.8 Accessible Authentication (Minimum). [W3C WCAG 2.2](https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html)
6. **W3C.** Understanding Success Criterion 1.1.1: Non-text Content. [W3C WCAG 2.1](https://w3c.github.io/wcag21/understanding/non-text-content.html)
7. **Google Developers.** reCAPTCHA v3 Geliştirici Belgeleri. [Google Developers](https://developers.google.com/recaptcha/docs/v3)
8. **arXiv (2023).** Dazed & Confused: A Large-Scale Real-World User Study of reCAPTCHA v2. [arXiv:2311.10911](https://arxiv.org/html/2311.10911v2)
9. **Bursztein, E. vd. (2014).** The End is Nigh: Generic Solving of Text-based CAPTCHAs. *USENIX WOOT '14*. [USENIX WOOT](https://www.usenix.org/system/files/conference/woot14/woot14-bursztein.pdf)
10. **ACM (2022).** Can't You Tell I am a Human? A Comparison of Common Text and Image CAPTCHAs Using a Low-Fidelity Methodology. [ACM DL](https://dl.acm.org/doi/fullHtml/10.1145/3563137.3563179)
11. **arXiv (2025).** IllusionCAPTCHA: A CAPTCHA based on Visual Illusion. [arXiv:2502.05461](https://ar5iv.labs.arxiv.org/html/2502.05461)
