/**
 * CAPTCHA HCI Experiment - Distorted Text Prototype Engine
 * Koşul A: Bozulmuş Metin CAPTCHA
 * 
 * Özellikler:
 * - HTML5 Canvas tabanlı istemci tarafı üretim
 * - Karıştırılabilir karakterler hariç (l, I, 1, O, 0)
 * - Belgelenmiş gürültü çizgileri, noktalar ve harf rotasyonu
 * - t0 ve ilk etkileşim (t_first) zaman damgalarının kaydedilmesi
 * - Yenileme ("refresh") kullanımının loglanması
 * - Büyük-küçük harfe duyarsız doğrulama
 */

// Metin CAPTCHA'sı için arka plan fotoğrafı (gerçekçi görünüm) — sayfa açılınca önden yüklenir
const TEXT_BG_IMAGE = new Image();
TEXT_BG_IMAGE.src = "images/tiles/tile_dist_bench.jpg";

class TextCaptchaController {
  constructor(canvasElement, inputElement, refreshBtn, submitBtn, feedbackElement, options = {}) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext("2d");
    this.input = inputElement;
    this.refreshBtn = refreshBtn;
    this.submitBtn = submitBtn;
    this.feedback = feedbackElement;

    this.config = options.config || (typeof CONFIG !== "undefined" ? CONFIG.textConfig : {});
    this.maxAttempts = options.maxAttempts || 3;
    
    this.currentStimulus = null;
    this.currentText = "";
    this.currentVariantIndex = -1; // -1: ana uyaran, 0+: yenileme varyantları
    
    // Zaman ve etkileşim logları
    this.t0 = null;
    this.tFirst = null;
    this.attemptCount = 0;
    this.refreshCount = 0;
    this.attemptHistory = [];
    this.isActive = false;

    // Callback fonksiyonları
    this.onSolvedCallback = options.onSolved || null;
    this.onFailedCallback = options.onFailed || null;

    this.bindEvents();
  }

  bindEvents() {
    this.input.addEventListener("input", () => {
      if (!this.tFirst && this.isActive) {
        this.tFirst = Date.now();
      }
    });

    this.input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        this.verifyInput();
      }
    });

    this.refreshBtn.addEventListener("click", () => {
      this.handleRefresh();
    });

    this.submitBtn.addEventListener("click", (e) => {
      e.preventDefault();
      this.verifyInput();
    });
  }

  loadTrial(stimulusData) {
    this.currentStimulus = stimulusData;
    this.currentVariantIndex = -1;
    this.currentText = stimulusData.text;
    this.attemptCount = 0;
    this.refreshCount = 0;
    this.attemptHistory = [];
    this.tFirst = null;
    this.isActive = true;

    this.input.value = "";
    this.input.disabled = false;
    this.submitBtn.disabled = false;
    this.hideFeedback();

    // Çizim yap ve t0 kaydet
    this.renderCanvas(this.currentText, stimulusData.charAngles, stimulusData.charOffsetsY);
    this.t0 = Date.now();
  }

  renderCanvas(text, angles = [], offsetsY = []) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctx = this.ctx;

    // Deterministik rastgelelik (uyaran sabitliği: aynı seed → aynı çizim)
    let seed = this.currentStimulus ? this.currentStimulus.seed + (this.currentVariantIndex * 37) : 12345;
    const pseudoRand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    // 1. Zemin + fotoğraf arka planı (gerçek CAPTCHA görünümü)
    ctx.fillStyle = "#EDE8DE";
    ctx.fillRect(0, 0, w, h);
    if (typeof TEXT_BG_IMAGE !== "undefined" && TEXT_BG_IMAGE.complete && TEXT_BG_IMAGE.naturalWidth > 0) {
      ctx.globalAlpha = 0.34;
      ctx.drawImage(TEXT_BG_IMAGE, 0, 0, w, h);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(237, 232, 222, 0.78)"; // kâğıt yıkama: metin okunabilir kalsın
      ctx.fillRect(0, 0, w, h);
    }

    // 2. Dikey zemin çizgileri
    ctx.strokeStyle = "#DDD6C9";
    ctx.lineWidth = 1;
    for (let x = 10; x < w; x += 22) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // 3. Eğrisel gürültü çizgileri (adet CONFIG'den)
    const noiseLines = this.config.noiseLinesCount || 6;
    const lineColors = ["#57534E", "#0E6B5B", "#78716C", "#9A3B26"];
    for (let i = 0; i < noiseLines; i++) {
      ctx.strokeStyle = lineColors[i % lineColors.length];
      ctx.lineWidth = 1 + pseudoRand() * 1.5;
      ctx.beginPath();
      const startY = 10 + (i * (h - 20) / Math.max(noiseLines - 1, 1));
      const cp1x = w * (0.2 + pseudoRand() * 0.3);
      const cp1y = h * (0.1 + pseudoRand() * 0.8);
      const cp2x = w * (0.5 + pseudoRand() * 0.3);
      const cp2y = h * (0.1 + pseudoRand() * 0.8);
      const endY = h - 10 - (i * 10);
      ctx.moveTo(0, startY);
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, w, endY);
      ctx.stroke();
    }

    // 4. Gürültü noktaları (adet CONFIG'den)
    const noiseDots = this.config.noiseDotsCount || 60;
    ctx.fillStyle = "#57534E";
    for (let i = 0; i < noiseDots; i++) {
      const dotX = pseudoRand() * w;
      const dotY = pseudoRand() * h;
      const radius = 0.8 + pseudoRand() * 2.2;
      ctx.beginPath();
      ctx.arc(dotX, dotY, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. Harflerin çizimi (boyut + yatay konum titreşimi ile)
    ctx.textBaseline = "middle";

    const charCount = text.length;
    const availableWidth = w - 40;
    const charSpacing = availableWidth / charCount;

    for (let i = 0; i < charCount; i++) {
      const char = text[i];
      const angleDeg = (angles && angles[i] !== undefined) ? angles[i] : ((pseudoRand() - 0.5) * 28);
      const offsetY = (offsetsY && offsetsY[i] !== undefined) ? offsetsY[i] : ((pseudoRand() - 0.5) * 12);
      const fontSize = (this.config.fontSize || 34) + Math.round((pseudoRand() - 0.5) * 8);
      const xJitter = (pseudoRand() - 0.5) * 8;

      const charX = 25 + (i * charSpacing) + (charSpacing * 0.2) + xJitter;
      const charY = (h / 2) + offsetY;

      ctx.save();
      ctx.translate(charX, charY);
      ctx.rotate((angleDeg * Math.PI) / 180);

      ctx.font = `bold ${fontSize}px ${this.config.fontFamily || "Newsreader, Georgia, serif"}`;
      ctx.fillStyle = (i % 2 === 0) ? "#1F1E1B" : "#0E6B5B";
      ctx.fillText(char, 0, 0);

      ctx.restore();
    }
  }

  handleRefresh() {
    if (!this.isActive) return;
    this.refreshCount++;

    const variants = this.currentStimulus.refreshVariants || [];
    if (variants.length > 0) {
      this.currentVariantIndex = (this.currentVariantIndex + 1) % variants.length;
      const v = variants[this.currentVariantIndex];
      this.currentText = v.text;
      this.renderCanvas(v.text, v.charAngles, v.charOffsetsY);
    } else {
      // Varyant yoksa aynı metni hafif rotasyonla yeniden çiz
      this.renderCanvas(this.currentText);
    }

    this.input.value = "";
    this.input.focus();
    this.showFeedback("Yeni metin yüklendi. Lütfen okuduğunuz karakterleri giriniz.", "info");
  }

  verifyInput() {
    if (!this.isActive) return;

    const entered = this.input.value.trim();
    if (!entered) {
      this.showFeedback("Lütfen resimdeki karakterleri yazınız.", "error");
      this.input.focus();
      return;
    }

    this.attemptCount++;
    const now = Date.now();
    const isCorrect = (entered.toUpperCase() === this.currentText.toUpperCase());

    const attemptData = {
      attemptNumber: this.attemptCount,
      enteredValue: entered,
      targetValue: this.currentText,
      timestamp: now,
      isCorrect: isCorrect
    };
    this.attemptHistory.push(attemptData);

    if (isCorrect) {
      this.isActive = false;
      this.input.disabled = true;
      this.submitBtn.disabled = true;
      this.showFeedback("Doğrulama başarılı!", "success");

      const trialResult = {
        stimulusId: this.currentStimulus.stimulusId,
        trialIndex: this.currentStimulus.trialIndex,
        t0: this.t0,
        tFirstInteraction: this.tFirst || now,
        tEnd: now,
        durationSec: Math.round(((now - this.t0) / 1000) * 100) / 100,
        attempts: this.attemptCount,
        refreshCount: this.refreshCount,
        outcome: "solved",
        firstAttemptSuccess: (this.attemptCount === 1),
        attemptHistory: this.attemptHistory
      };

      if (typeof this.onSolvedCallback === "function") {
        setTimeout(() => this.onSolvedCallback(trialResult), 500);
      }
    } else {
      const remaining = this.maxAttempts - this.attemptCount;
      if (remaining > 0) {
        this.showFeedback(`Karakterler eşleşmedi. Tekrar deneyiniz (Kalan hak: ${remaining}).`, "error");
        this.input.select();
      } else {
        // Deneme hakkı tükendi
        this.isActive = false;
        this.input.disabled = true;
        this.submitBtn.disabled = true;
        this.showFeedback("Deneme hakkınız doldu. Sonraki adıma geçiliyor...", "error");

        const trialResult = {
          stimulusId: this.currentStimulus.stimulusId,
          trialIndex: this.currentStimulus.trialIndex,
          t0: this.t0,
          tFirstInteraction: this.tFirst || now,
          tEnd: now,
          durationSec: Math.round(((now - this.t0) / 1000) * 100) / 100,
          attempts: this.attemptCount,
          refreshCount: this.refreshCount,
          outcome: "failed_attempts",
          firstAttemptSuccess: false,
          attemptHistory: this.attemptHistory
        };

        if (typeof this.onFailedCallback === "function") {
          setTimeout(() => this.onFailedCallback(trialResult), 1200);
        }
      }
    }
  }

  handleTimeout() {
    if (!this.isActive) return;
    this.isActive = false;
    this.input.disabled = true;
    this.submitBtn.disabled = true;
    const now = Date.now();

    this.showFeedback("Süre doldu (zaman aşımı). Sonraki adıma geçiliyor...", "error");

    const trialResult = {
      stimulusId: this.currentStimulus ? this.currentStimulus.stimulusId : null,
      trialIndex: this.currentStimulus ? this.currentStimulus.trialIndex : null,
      t0: this.t0,
      tFirstInteraction: this.tFirst,
      tEnd: now,
      durationSec: Math.round(((now - this.t0) / 1000) * 100) / 100,
      attempts: this.attemptCount,
      refreshCount: this.refreshCount,
      outcome: "timeout",
      firstAttemptSuccess: false,
      attemptHistory: this.attemptHistory
    };

    if (typeof this.onFailedCallback === "function") {
      setTimeout(() => this.onFailedCallback(trialResult), 1200);
    }
  }

  showFeedback(msg, type = "info") {
    this.feedback.textContent = msg;
    this.feedback.className = `captcha-feedback-msg ${type}`;
    this.feedback.style.display = "block";
  }

  hideFeedback() {
    this.feedback.textContent = "";
    this.feedback.style.display = "none";
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = TextCaptchaController;
}
