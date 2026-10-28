# CAPTCHA Deneyi Görsel Uyaran Üretim Promptları ve Manifestosu

Bu belge, "CAPTCHA Sistemlerinde Güvenlik ve Kullanılabilirlik Dengesi" İnsan-Bilgisayar Etkileşimi projesi kapsamındaki görsel seçimi CAPTCHA'sı (Koşul B) ve bilgilendirme sayfası için hazırlanan görsel üretim istemlerini (prompts), parametrelerini ve manifesto kayıtlarını içerir.

> **Güncel durum (2026-10-28):** Görsel kareleri artık **yerel JPEG gerçek fotoğraflardır** (`images/tiles/*.jpg`). Bisiklet hedefleri ile çoğu karıştırıcı Unsplash'tan, sokak lambası / çeşme / yedek bisiklet fotoğrafları ise Wikimedia Commons'tan indirilmiştir. Aşağıdaki Gemini promptları orijinal üretim şartnamesi olarak arşiv amaçlı korunmaktadır.

---

## 1. Tasarım Kısıtları ve Üretim Şartnamesi
- **Biçim:** 1:1 kare (512x512 piksel).
- **Renk Paleti & Işık:** Gerçekçi sokak ortamı, doğal gün ışığı, kâğıt tonlarıyla uyumlu doğal doygunluk.
- **Tasarım Kuralları:** Gradyan yok, yapay zekâ parıltısı ("AI slop") yok, abartılı filtre yok.
- **Hedef Sınıf:** Bisiklet (farklı açılardan, şehir bisikleti, dağ bisikleti, yol bisikleti, park edilmiş bisiklet).
- **Karıştırıcı (Distractor) Sınıflar:** Motosiklet, elektrikli skuter, park bankı, sokak lambası, yangın musluğu, bahçe çiti, otobüs durağı, park etmiş araba tekeri/gövdesi, taş süs havuzu.
- **Bilişsel Ayrım:** Karıştırıcılar hedef sınıfa semantik veya biçimsel yakınlık taşıyan (örneğin iki tekerlekli motosiklet/skuter ile bisiklet ayrımı) ve sokak bağlamında doğal duran nesnelerden seçilmiştir.

---

## 2. Gemini / Metinden Görsele Üretim Promptları

### Hedef Kareler (Bisiklet)

1. **`tile_bike_01` (Yol / Şehir Bisikleti)**
   - **Prompt:** `Square 1:1 realistic daytime street photograph of a dark green vintage commuter bicycle parked against a textured light sandstone wall on a cobblestone sidewalk. Natural daylight, straight eye-level framing, crisp realistic details, no gradients, no artistic blur.`
   - **Hedef:** Evet (Bisiklet)
   - **Kullanım:** Bulmaca 1, Bulmaca 3

2. **`tile_bike_02` (Bisiklet Park Demiri)**
   - **Prompt:** `Square 1:1 street photograph of a modern hybrid bicycle locked to a black metal U-rack on a pedestrian pavement, trees and cafe in soft background, clear daylight, crisp focus on bicycle frame and wheels, no filters.`
   - **Hedef:** Evet (Bisiklet)
   - **Kullanım:** Bulmaca 1

3. **`tile_bike_03` (Sepetli Klasik Bisiklet)**
   - **Prompt:** `Square 1:1 authentic street photograph of an ivory-colored classic bicycle with a front wicker basket parked next to a storefront window, warm natural sun, realistic street surface, sharp wheel spokes and handlebars.`
   - **Hedef:** Evet (Bisiklet)
   - **Kullanım:** Bulmaca 1, Bulmaca 3

4. **`tile_bike_04` (Dağ Bisikleti Yakın Çekim)**
   - **Prompt:** `Square 1:1 realistic street capture of a red mountain bicycle leaning against a park railing, visible knobby tires and handlebars, natural overcast lighting, crisp realistic texture.`
   - **Hedef:** Evet (Bisiklet)
   - **Kullanım:** Bulmaca 2

5. **`tile_bike_05` (Kargo / Şehir Bisikleti)**
   - **Prompt:** `Square 1:1 authentic documentary-style street photograph of a dark blue urban city bike with rear pannier bags parked on a paved plaza, natural sunlight, crisp shadows, clear bicycle silhouette.`
   - **Hedef:** Evet (Bisiklet)
   - **Kullanım:** Bulmaca 2, Bulmaca 3

6. **`tile_bike_06` (Yarış Bisikleti)**
   - **Prompt:** `Square 1:1 clean street photograph of a silver road racing bicycle with dropped handlebars standing near a low granite curb, bright daylight, realistic ground texture, sharp details.`
   - **Hedef:** Evet (Bisiklet)
   - **Kullanım:** Bulmaca 3

---

### Karıştırıcı Kareler (Distractors)

7. **`tile_dist_motorcycle` (Motosiklet - Zor Karıştırıcı)**
   - **Prompt:** `Square 1:1 realistic street photograph of a black vintage motorcycle parked at a street corner curb, engine and exhaust visible, two wheels but clearly motorized with fuel tank and leather seat, natural daytime lighting, crisp focus.`
   - **Hedef:** Hayır (Motosiklet)
   - **Kullanım:** Bulmaca 1, Bulmaca 2

8. **`tile_dist_scooter` (Elektrikli Skuter - Zor Karıştırıcı)**
   - **Prompt:** `Square 1:1 realistic street photograph of a shared electric kick-scooter upright on a concrete sidewalk, narrow deck, small wheels, vertical stem and brake levers, clear daylight.`
   - **Hedef:** Hayır (Skuter)
   - **Kullanım:** Bulmaca 2

9. **`tile_dist_bench` (Park Bankı)**
   - **Prompt:** `Square 1:1 realistic urban photograph of a classic wooden park bench with cast iron legs resting on a brick pavement under trees, natural ambient light, crisp textures.`
   - **Hedef:** Hayır (Bank)
   - **Kullanım:** Bulmaca 1, Bulmaca 3

10. **`tile_dist_fence` (Demir Parmaklık / Çit)**
    - **Prompt:** `Square 1:1 documentary street photo of an ornate wrought-iron garden fence bordering a sidewalk with green ivy leaves, natural lighting, sharp vertical bars.`
    - **Hedef:** Hayır (Çit)
    - **Kullanım:** Bulmaca 1, Bulmaca 2

11. **`tile_dist_hydrant` (Yangın Musluğu)**
    - **Prompt:** `Square 1:1 realistic street photo of a traditional red fire hydrant on a concrete street corner curb, natural sun, realistic asphalt background.`
    - **Hedef:** Hayır (Yangın Musluğu)
    - **Kullanım:** Bulmaca 1, Bulmaca 3

12. **`tile_dist_lamp` (Sokak Lambası)**
    - **Prompt:** `Square 1:1 photo of a dark wrought-iron decorative street lamp post base on a sidewalk, historical urban architecture, clean daylight.`
    - **Hedef:** Hayır (Sokak Lambası)
    - **Kullanım:** Bulmaca 1, Bulmaca 2

13. **`tile_dist_car` (Park Halindeki Otomobil)**
    - **Prompt:** `Square 1:1 street photograph showing the front bumper and wheel of a silver passenger car parked along a curbside street, asphalt ground, natural daytime.`
    - **Hedef:** Hayır (Otomobil)
    - **Kullanım:** Bulmaca 1, Bulmaca 3

14. **`tile_dist_bus_stop` (Otobüs Durağı)**
    - **Prompt:** `Square 1:1 realistic city photo of a modern glass and steel bus shelter stop with timetable board, pavement sidewalk, natural overcast lighting.`
    - **Hedef:** Hayır (Durak)
    - **Kullanım:** Bulmaca 2

15. **`tile_dist_fountain` (Süs Havuzu / Çeşme)**
    - **Prompt:** `Square 1:1 street photo of a stone drinking fountain in a public urban square, stone basin and brass spout, daylight.`
    - **Hedef:** Hayır (Çeşme)
    - **Kullanım:** Bulmaca 3

---

## 3. Bilgilendirme Sayfası İllüstrasyonu

- **Dosya:** `images/illustration_balance.svg`
- **Konu:** İnsan-Bilgisayar Etkileşiminde Güvenlik ve Kullanılabilirlik Dengesi (Turing Testi / CAPTCHA kavramı).
- **Prompt:** `Flat editorial vector illustration representing the tension between automated bot defense and human usability. A balanced mechanical scale with a digital lock icon on one side and a clean human hand/eye interaction icon on the other. Monochromatic deep teal (#0E6B5B) and ink (#1F1E1B) line art on paper background (#FAF9F6). Strictly NO gradients, NO 3D shading, NO AI-glow. Academic, minimal, precise graphic style.`
