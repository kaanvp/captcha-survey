/**
 * CAPTCHA HCI Experiment - Image Selection Prototype Engine
 * Koşul B: Görsel Seçimi CAPTCHA (3x3 Izgara)
 * 
 * Özellikler:
 * - 3x3 ızgara düzeninde 9 sabit kare
 * - stimuli.json manifestosuna bağlı sabit bulmaca düzenleri
 * - Klavyeden (Enter/Boşluk) ve dokunmatik ekrandan tam erişilebilirlik
 * - t0 ve ilk seçim (t_first) zaman damgalarının kaydedilmesi
 * - Seçilen karelerin, deneme sayısının ve doğruluğun loglanması
 */

class ImageCaptchaController {
  constructor(gridElement, instructionElement, submitBtn, feedbackElement, options = {}) {
    this.grid = gridElement;
    this.instruction = instructionElement;
    this.submitBtn = submitBtn;
    this.feedback = feedbackElement;
    this.reloadBtn = options.reloadBtn || null;
    this.infoBtn = options.infoBtn || null;
    this.audioBtn = options.audioBtn || null;

    this.tilesManifest = options.tilesManifest || (typeof STIMULI !== "undefined" ? STIMULI.tiles : {});
    this.maxAttempts = options.maxAttempts || 3;
    this.targetCategory = options.targetCategory || "bisiklet";

    this.currentPuzzle = null;
    this.selectedTileIds = new Set();
    
    // Zaman ve etkileşim logları
    this.t0 = null;
    this.tFirst = null;
    this.attemptCount = 0;
    this.attemptHistory = [];
    this.isActive = false;

    // Callback fonksiyonları
    this.onSolvedCallback = options.onSolved || null;
    this.onFailedCallback = options.onFailed || null;

    this.bindEvents();
  }

  bindEvents() {
    this.submitBtn.addEventListener("click", (e) => {
      e.preventDefault();
      this.verifySelection();
    });

    if (this.reloadBtn) {
      this.reloadBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.resetSelection();
      });
    }

    if (this.infoBtn) {
      this.infoBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.showFeedback(`Yönerge: İçinde ${this.targetCategory} olan tüm kareleri seçin.`, "info");
      });
    }

    if (this.audioBtn) {
      this.audioBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.showFeedback("Bu prototipte sesli (işitsel) alternatif bulunmamaktadır.", "info");
      });
    }
  }

  loadTrial(puzzleData) {
    this.currentPuzzle = puzzleData;
    this.selectedTileIds.clear();
    this.attemptCount = 0;
    this.attemptHistory = [];
    this.tFirst = null;
    this.isActive = true;

    this.submitBtn.disabled = false;
    this.hideFeedback();

    if (this.instruction) {
      this.instruction.textContent = this.targetCategory;
    }

    this.renderGrid(puzzleData.layout);
    this.t0 = Date.now();
  }

  renderGrid(tileIds) {
    this.grid.innerHTML = "";

    tileIds.forEach((tileId, index) => {
      const tileMeta = this.tilesManifest[tileId] || {
        file: `images/tiles/${tileId}.jpg`,
        desc: `Kare ${index + 1}`
      };

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tile-btn";
      btn.setAttribute("role", "checkbox");
      btn.setAttribute("aria-checked", "false");
      btn.setAttribute("aria-label", `${index + 1}. görsel`);
      btn.dataset.tileId = tileId;
      btn.dataset.index = index;

      const img = document.createElement("img");
      img.src = tileMeta.file || `images/tiles/${tileId}.jpg`;
      img.alt = `Görsel ${index + 1}`;
      img.loading = "eager";
      btn.appendChild(img);

      // Tıklama & Dokunma
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        this.toggleTile(btn, tileId);
      });

      // Klavye ile seçim (Space / Enter)
      btn.addEventListener("keydown", (e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          this.toggleTile(btn, tileId);
        }
      });

      this.grid.appendChild(btn);
    });
  }

  toggleTile(btnElement, tileId) {
    if (!this.isActive) return;

    if (!this.tFirst) {
      this.tFirst = Date.now();
    }

    if (this.selectedTileIds.has(tileId)) {
      this.selectedTileIds.delete(tileId);
      btnElement.classList.remove("selected");
      btnElement.setAttribute("aria-checked", "false");
    } else {
      this.selectedTileIds.add(tileId);
      btnElement.classList.add("selected");
      btnElement.setAttribute("aria-checked", "true");
    }
  }

  // Seçimi temizle (reCAPTCHA'daki "yenile/yeni görseller" düğmesine benzer; uyaran sabitliği gereği aynı sabit düzen korunur)
  resetSelection() {
    if (!this.isActive || !this.currentPuzzle) return;

    this.selectedTileIds.clear();
    this.grid.querySelectorAll(".tile-btn").forEach(btn => {
      btn.classList.remove("selected");
      btn.setAttribute("aria-checked", "false");
    });

    this.hideFeedback();
    this.showFeedback("Seçim sıfırlandı. Lütfen hedef kareleri yeniden seçiniz.", "info");
  }

  verifySelection() {
    if (!this.isActive) return;

    if (this.selectedTileIds.size === 0) {
      this.showFeedback("Lütfen en az bir kare seçiniz.", "error");
      return;
    }

    this.attemptCount++;
    const now = Date.now();
    const targets = new Set(this.currentPuzzle.targetIds);
    const selected = this.selectedTileIds;

    // Doğruluk Kriteri: Hedeflerin tümü seçilmiş olmalı ve hiçbir karıştırıcı seçilmemiş olmalı
    const allTargetsSelected = [...targets].every(id => selected.has(id));
    const noDistractorsSelected = [...selected].every(id => targets.has(id));
    const isCorrect = (allTargetsSelected && noDistractorsSelected && (targets.size === selected.size));

    const attemptData = {
      attemptNumber: this.attemptCount,
      selectedTileIds: Array.from(selected),
      targetTileIds: this.currentPuzzle.targetIds,
      timestamp: now,
      isCorrect: isCorrect
    };
    this.attemptHistory.push(attemptData);

    if (isCorrect) {
      this.isActive = false;
      this.submitBtn.disabled = true;
      this.showFeedback("Doğrulama başarılı!", "success");

      const trialResult = {
        puzzleId: this.currentPuzzle.puzzleId,
        trialIndex: this.currentPuzzle.trialIndex,
        t0: this.t0,
        tFirstInteraction: this.tFirst || now,
        tEnd: now,
        durationSec: Math.round(((now - this.t0) / 1000) * 100) / 100,
        attempts: this.attemptCount,
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
        this.showFeedback(`Seçiminiz doğrulanamadı. Lütfen kontrol edip tekrar deneyiniz (Kalan hak: ${remaining}).`, "error");
      } else {
        this.isActive = false;
        this.submitBtn.disabled = true;
        this.showFeedback("Deneme hakkınız doldu. Sonraki adıma geçiliyor...", "error");

        const trialResult = {
          puzzleId: this.currentPuzzle.puzzleId,
          trialIndex: this.currentPuzzle.trialIndex,
          t0: this.t0,
          tFirstInteraction: this.tFirst || now,
          tEnd: now,
          durationSec: Math.round(((now - this.t0) / 1000) * 100) / 100,
          attempts: this.attemptCount,
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
    this.submitBtn.disabled = true;
    const now = Date.now();

    this.showFeedback("Süre doldu (zaman aşımı). Sonraki adıma geçiliyor...", "error");

    const trialResult = {
      puzzleId: this.currentPuzzle ? this.currentPuzzle.puzzleId : null,
      trialIndex: this.currentPuzzle ? this.currentPuzzle.trialIndex : null,
      t0: this.t0,
      tFirstInteraction: this.tFirst,
      tEnd: now,
      durationSec: Math.round(((now - this.t0) / 1000) * 100) / 100,
      attempts: this.attemptCount,
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
  module.exports = ImageCaptchaController;
}
