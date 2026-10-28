/**
 * CAPTCHA HCI Experiment - Experiment Controller & State Machine
 * "CAPTCHA Sistemlerinde Güvenlik ve Kullanılabilirlik Dengesi"
 * 
 * Yönetilen İşlevler:
 * - Katılımcı içi (within-subjects) sıra dengeleme (AB / BA)
 * - Adım adım akış yönetimi (Bilgilendirme -> Demografi -> Koşul 1 -> Anket 1 -> Koşul 2 -> Anket 2 -> Tercihler & Gönderim)
 * - Sayaç ve zaman aşımı mekanizması
 * - Netlify Form asenkron gönderimi + Pano JSON fallback
 * - Deneyden ayrılma hakkı modalı ve veri imhası
 */

class ExperimentController {
  constructor() {
    this.config = typeof CONFIG !== "undefined" ? CONFIG : {
      version: "1.0.0",
      trialsPerCondition: 3,
      maxAttempts: 3,
      timeoutText: 60,
      timeoutImage: 90
    };

    this.stimuli = typeof STIMULI !== "undefined" ? STIMULI : null;

    // Katılımcı Durumu — kod otomatik üretilir, kullanıcı değiştiremez
    this.participantCode = this.generateParticipantCode();
    this.order = Math.random() < 0.5 ? "AB" : "BA"; // 50/50 rastgele dengeleme
    this.demographics = {
      ageGroup: "",
      device: this.detectDevice(),
      captchaFrequency: ""
    };

    // Koşul ve Deneme Takibi
    this.currentStep = "step-info";
    this.currentConditionIndex = 1; // 1: İlk koşul, 2: İkinci koşul
    this.currentTrialIndex = 1;      // 1, 2, 3
    this.timerInterval = null;
    this.timerSecondsLeft = 0;

    // Veri Günlükleri
    this.trialsLog = []; // Tüm 6 deneme sonucu
    this.surveyData = {
      cond1: {},
      cond2: {}
    };
    this.preferences = {
      easier: "",
      faster: "",
      safer: "",
      reason: ""
    };

    // CAPTCHA Kontrolcüleri
    this.textController = null;
    this.imageController = null;

    this.initDOM();
  }

  generateParticipantCode() {
    const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const digits = "23456789";
    let code = "KAT_";
    for (let i = 0; i < 4; i++) code += letters[Math.floor(Math.random() * letters.length)];
    for (let i = 0; i < 4; i++) code += digits[Math.floor(Math.random() * digits.length)];
    return code;
  }

  detectDevice() {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return "Tablet";
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua)) {
      return "Akıllı Telefon";
    }
    return "Masaüstü/Dizüstü";
  }

  initDOM() {
    // Adım 1: Bilgilendirme & Onam Butonları
    const btnConsent = document.getElementById("btn-consent-next");
    const chkConsent = document.getElementById("chk-consent");
    const codeDisplay = document.getElementById("participant-code-display");

    // Katılımcı kodu otomatik üretildi ve değiştirilemez; sadece gösterilir.
    if (codeDisplay) codeDisplay.textContent = this.participantCode;

    if (chkConsent && btnConsent) {
      const validateStep1 = () => {
        btnConsent.disabled = !chkConsent.checked;
      };
      chkConsent.addEventListener("change", validateStep1);
      validateStep1();

      btnConsent.addEventListener("click", () => {
        // Kod sabittir; kullanıcının değiştirme imkânı yoktur.
        this.goToStep("step-demographics");
      });
    }

    // Adım 2: Demografi Butonu
    const btnDemographics = document.getElementById("btn-demographics-next");
    if (btnDemographics) {
      btnDemographics.addEventListener("click", () => {
        const ageSelect = document.getElementById("demo-age-select");
        const deviceSelect = document.getElementById("demo-device-select");
        const freqSelect = document.getElementById("demo-freq-select");

        this.demographics.ageGroup = ageSelect ? ageSelect.value : "Belirtilmedi";
        this.demographics.device = deviceSelect ? deviceSelect.value : this.detectDevice();
        this.demographics.captchaFrequency = freqSelect ? freqSelect.value : "Belirtilmedi";

        // Koşul 1'e Başla
        this.currentConditionIndex = 1;
        this.currentTrialIndex = 1;
        this.startCondition(1);
      });
    }

    // Adım 4: Anket 1 Butonu
    const btnSurvey1 = document.getElementById("btn-survey1-next");
    if (btnSurvey1) {
      btnSurvey1.addEventListener("click", () => {
        if (this.validateSurvey(1)) {
          this.currentConditionIndex = 2;
          this.currentTrialIndex = 1;
          this.startCondition(2);
        }
      });
    }

    // Adım 6: Anket 2 Butonu
    const btnSurvey2 = document.getElementById("btn-survey2-next");
    if (btnSurvey2) {
      btnSurvey2.addEventListener("click", () => {
        if (this.validateSurvey(2)) {
          this.goToStep("step-final");
          this.setupFinalScreen();
        }
      });
    }

    // Adım 7: Tercih & Nihai Gönderim
    const btnFinalSubmit = document.getElementById("btn-final-submit");
    if (btnFinalSubmit) {
      btnFinalSubmit.addEventListener("click", () => {
        this.handleFinalSubmission();
      });
    }

    // Deneyden Ayrılma Modalı
    this.setupWithdrawalModal();

    // Likert ve Tercih Buton Tıklamaları
    this.setupInteractiveForms();
  }

  setupInteractiveForms() {
    // Likert Butonları Seçim Yönetimi
    document.querySelectorAll(".likert-scale").forEach(scale => {
      const targetInputId = scale.dataset.targetInput;
      const buttons = scale.querySelectorAll(".likert-btn");
      buttons.forEach(btn => {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          buttons.forEach(b => b.classList.remove("selected"));
          btn.classList.add("selected");
          if (targetInputId) {
            const input = document.getElementById(targetInputId);
            if (input) input.value = btn.dataset.value;
          }
        });
      });
    });

    // Tercih Kartları Seçim Yönetimi
    document.querySelectorAll(".preference-cards-grid").forEach(group => {
      const cards = group.querySelectorAll(".pref-radio-card");
      cards.forEach(card => {
        card.addEventListener("click", () => {
          cards.forEach(c => c.classList.remove("selected"));
          card.classList.add("selected");
          const radio = card.querySelector("input[type='radio']");
          if (radio) radio.checked = true;
        });
      });
    });
  }

  setupWithdrawalModal() {
    const modal = document.getElementById("withdrawal-modal");
    const openBtns = document.querySelectorAll(".btn-withdraw-trigger");
    const btnConfirm = document.getElementById("btn-modal-withdraw-confirm");
    const btnCancel = document.getElementById("btn-modal-withdraw-cancel");

    if (modal) {
      openBtns.forEach(btn => {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          modal.classList.add("active");
        });
      });

      if (btnCancel) {
        btnCancel.addEventListener("click", () => {
          modal.classList.remove("active");
        });
      }

      if (btnConfirm) {
        btnConfirm.addEventListener("click", () => {
          modal.classList.remove("active");
          this.clearExperimentData();
          this.goToStep("step-withdrawn");
        });
      }
    }
  }

  clearExperimentData() {
    clearInterval(this.timerInterval);
    this.trialsLog = [];
    this.surveyData = { cond1: {}, cond2: {} };
    this.preferences = {};
  }

  getConditionType(condIndex) {
    if (this.order === "AB") {
      return condIndex === 1 ? "text" : "image";
    } else {
      return condIndex === 1 ? "image" : "text";
    }
  }

  goToStep(stepId) {
    this.currentStep = stepId;
    document.querySelectorAll(".step-panel").forEach(panel => {
      panel.classList.remove("active");
    });
    const activePanel = document.getElementById(stepId);
    if (activePanel) {
      activePanel.classList.add("active");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    this.updateProgressBar(stepId);
  }

  updateProgressBar(stepId) {
    const stepMap = {
      "step-info": 1,
      "step-demographics": 2,
      "step-cond1": 3,
      "step-survey1": 4,
      "step-cond2": 5,
      "step-survey2": 6,
      "step-final": 7,
      "step-completed": 7,
      "step-withdrawn": 0
    };

    const currentNumber = stepMap[stepId] || 1;
    document.querySelectorAll(".progress-step-item").forEach(item => {
      const itemStep = parseInt(item.dataset.step, 10);
      item.classList.remove("active", "completed");
      if (itemStep === currentNumber) {
        item.classList.add("active");
      } else if (itemStep < currentNumber) {
        item.classList.add("completed");
      }
    });
  }

  startCondition(condIndex) {
    const condType = this.getConditionType(condIndex);
    const stepId = condIndex === 1 ? "step-cond1" : "step-cond2";
    this.goToStep(stepId);

    // Başlık ve Rozet Güncellemesi
    const titleEl = document.getElementById(`${stepId}-title`);
    const badgeEl = document.getElementById(`${stepId}-badge`);
    const descEl = document.getElementById(`${stepId}-desc`);

    if (condType === "text") {
      if (titleEl) titleEl.textContent = `Koşul ${condIndex}: Bozulmuş Metin CAPTCHA`;
      if (badgeEl) badgeEl.textContent = `Koşul ${condIndex} / 2`;
      if (descEl) descEl.textContent = "Aşağıdaki demo kayıt formunda yer alan resimdeki karakterleri okuyup metin alanına yazınız.";
    } else {
      if (titleEl) titleEl.textContent = `Koşul ${condIndex}: Görsel Seçimi CAPTCHA`;
      if (badgeEl) badgeEl.textContent = `Koşul ${condIndex} / 2`;
      if (descEl) descEl.textContent = "Aşağıdaki demo kayıt formunda yönergeye uygun tüm görsel karelerini seçerek doğrulamayı tamamlayınız.";
    }

    this.setupTrial(condIndex, 1);
  }

  setupTrial(condIndex, trialIndex) {
    clearInterval(this.timerInterval);
    this.currentTrialIndex = trialIndex;
    const condType = this.getConditionType(condIndex);
    const stepId = condIndex === 1 ? "step-cond1" : "step-cond2";

    // Deneme Gösterge Rozeti
    const trialBadge = document.getElementById(`${stepId}-trial-badge`);
    if (trialBadge) {
      trialBadge.textContent = `Deneme ${trialIndex} / ${this.config.trialsPerCondition}`;
    }

    // Sayaç Hazırlığı
    const timeoutSec = (condType === "text") ? this.config.timeoutText : this.config.timeoutImage;
    this.startCountdown(stepId, timeoutSec, () => {
      if (condType === "text" && this.textController) {
        this.textController.handleTimeout();
      } else if (condType === "image" && this.imageController) {
        this.imageController.handleTimeout();
      }
    });

    if (condType === "text") {
      this.initTextTrial(stepId, trialIndex);
    } else {
      this.initImageTrial(stepId, trialIndex);
    }
  }

  initTextTrial(stepId, trialIndex) {
    const textContainer = document.getElementById(`${stepId}-text-view`);
    const imageContainer = document.getElementById(`${stepId}-image-view`);
    if (textContainer) textContainer.style.display = "";
    if (imageContainer) imageContainer.style.display = "none";

    const canvas = document.getElementById(`${stepId}-canvas`);
    const input = document.getElementById(`${stepId}-text-input`);
    const refreshBtn = document.getElementById(`${stepId}-text-refresh`);
    const submitBtn = document.getElementById(`${stepId}-text-submit`);
    const feedback = document.getElementById(`${stepId}-text-feedback`);

    const stimulus = this.stimuli.textStimuli[trialIndex - 1] || this.stimuli.textStimuli[0];

    this.textController = new TextCaptchaController(canvas, input, refreshBtn, submitBtn, feedback, {
      config: this.config.textConfig,
      maxAttempts: this.config.maxAttempts,
      onSolved: (result) => this.onTrialComplete(result, "solved"),
      onFailed: (result) => this.onTrialComplete(result, result.outcome)
    });

    this.textController.loadTrial(stimulus);
  }

  initImageTrial(stepId, trialIndex) {
    const textContainer = document.getElementById(`${stepId}-text-view`);
    const imageContainer = document.getElementById(`${stepId}-image-view`);
    if (textContainer) textContainer.style.display = "none";
    if (imageContainer) imageContainer.style.display = "";

    const grid = document.getElementById(`${stepId}-image-grid`);
    const instruction = document.getElementById(`${stepId}-image-instruction`);
    const submitBtn = document.getElementById(`${stepId}-image-submit`);
    const feedback = document.getElementById(`${stepId}-image-feedback`);
    const reloadBtn = document.getElementById(`${stepId}-image-reload`);
    const infoBtn = document.getElementById(`${stepId}-image-info`);
    const audioBtn = document.getElementById(`${stepId}-image-audio`);

    const puzzle = this.stimuli.imagePuzzles[trialIndex - 1] || this.stimuli.imagePuzzles[0];

    this.imageController = new ImageCaptchaController(grid, instruction, submitBtn, feedback, {
      tilesManifest: this.stimuli.tiles,
      maxAttempts: this.config.maxAttempts,
      targetCategory: (this.config.imageConfig && this.config.imageConfig.targetCategory) || "bisiklet",
      reloadBtn: reloadBtn,
      infoBtn: infoBtn,
      audioBtn: audioBtn,
      onSolved: (result) => this.onTrialComplete(result, "solved"),
      onFailed: (result) => this.onTrialComplete(result, result.outcome)
    });

    this.imageController.loadTrial(puzzle);
  }

  startCountdown(stepId, seconds, onTimeoutCallback) {
    this.timerSecondsLeft = seconds;
    const timerDisplay = document.getElementById(`${stepId}-timer`);
    const updateDisplay = () => {
      if (timerDisplay) {
        timerDisplay.textContent = `Kalan Süre: ${this.timerSecondsLeft} sn`;
      }
    };
    updateDisplay();

    this.timerInterval = setInterval(() => {
      this.timerSecondsLeft--;
      updateDisplay();
      if (this.timerSecondsLeft <= 0) {
        clearInterval(this.timerInterval);
        if (typeof onTimeoutCallback === "function") {
          onTimeoutCallback();
        }
      }
    }, 1000);
  }

  onTrialComplete(result, outcome) {
    clearInterval(this.timerInterval);

    // Koşul ve sıra bilgisini sonuca ekle
    const condType = this.getConditionType(this.currentConditionIndex);
    const enrichedTrial = {
      conditionIndex: this.currentConditionIndex,
      conditionType: condType, // "text" veya "image"
      conditionOrder: this.order,
      ...result,
      outcome: outcome
    };

    this.trialsLog.push(enrichedTrial);

    // Sıradaki denemeye veya ankete geç
    if (this.currentTrialIndex < this.config.trialsPerCondition) {
      setTimeout(() => {
        this.setupTrial(this.currentConditionIndex, this.currentTrialIndex + 1);
      }, 700);
    } else {
      setTimeout(() => {
        const nextStep = (this.currentConditionIndex === 1) ? "step-survey1" : "step-survey2";
        this.goToStep(nextStep);
      }, 700);
    }
  }

  validateSurvey(condIndex) {
    const prefix = `survey-cond${condIndex}`;
    const diffVal = document.getElementById(`${prefix}-difficulty`).value;
    const secVal = document.getElementById(`${prefix}-security`).value;
    const clarVal = document.getElementById(`${prefix}-clarity`).value;
    const errorEl = document.getElementById(`${prefix}-error`);

    if (!diffVal || !secVal || !clarVal) {
      if (errorEl) {
        errorEl.textContent = "Lütfen tüm maddeleri değerlendiriniz (1 ile 7 arası bir değer seçiniz).";
        errorEl.style.display = "block";
      }
      return false;
    }

    if (errorEl) errorEl.style.display = "none";

    this.surveyData[`cond${condIndex}`] = {
      perceivedDifficulty: parseInt(diffVal, 10),
      perceivedSecurity: parseInt(secVal, 10),
      instructionClarity: parseInt(clarVal, 10),
      conditionType: this.getConditionType(condIndex)
    };

    return true;
  }

  setupFinalScreen() {
    // Katılımcı kodunu onay ekranında göster
    const codeDisplay = document.getElementById("final-participant-code-display");
    if (codeDisplay) {
      codeDisplay.textContent = this.participantCode || "KAT_ANON";
    }
  }

  // Gönderimi tarayıcı deposuna (localStorage) kaydet — böylece araştırmacı paneli
  // aynı tarayıcıda veriyi görebilir (statik sitede sunucu tarafı yazma yok).
  saveSubmissionToStorage(payload) {
    try {
      const key = "captcha_submissions";
      const list = JSON.parse(localStorage.getItem(key) || "[]");
      const dedupeKey = `${payload.participantCode}|${payload.timestamp}`;
      if (list.some(x => x && x.__key === dedupeKey)) return;

      const s1 = payload.surveyCondition1 || {};
      const s2 = payload.surveyCondition2 || {};
      const txtSurvey = (s1.conditionType === "text") ? s1 : (s2.conditionType === "text" ? s2 : {});
      const imgSurvey = (s1.conditionType === "image") ? s1 : (s2.conditionType === "image" ? s2 : {});
      const logs = payload.trialsLog || [];

      const participant = {
        __key: dedupeKey,
        participant_id: "LOCAL_" + Date.now(),
        participant_code: payload.participantCode,
        order: payload.order,
        timestamp: payload.timestamp,
        demographics: {
          age_group: payload.demographics?.ageGroup,
          device: payload.demographics?.device,
          captchaFrequency: payload.demographics?.captchaFrequency
        },
        condition_text: {
          trials: logs.filter(t => t.conditionType === "text"),
          survey: {
            perceivedDifficulty: txtSurvey.perceivedDifficulty,
            perceivedSecurity: txtSurvey.perceivedSecurity,
            instructionClarity: txtSurvey.instructionClarity
          }
        },
        condition_image: {
          trials: logs.filter(t => t.conditionType === "image"),
          survey: {
            perceivedDifficulty: imgSurvey.perceivedDifficulty,
            perceivedSecurity: imgSurvey.perceivedSecurity,
            instructionClarity: imgSurvey.instructionClarity
          }
        },
        preferences: {
          easier: payload.preferences?.easier,
          faster: payload.preferences?.faster,
          safer: payload.preferences?.safer,
          reason: payload.preferences?.reason
        }
      };

      list.push(participant);
      localStorage.setItem(key, JSON.stringify(list));
    } catch (e) {
      console.warn("Yerel kayıt başarısız:", e);
    }
  }

  handleFinalSubmission() {
    const radioEasier = document.querySelector("input[name='pref_easier']:checked");
    const radioFaster = document.querySelector("input[name='pref_faster']:checked");
    const radioSafer = document.querySelector("input[name='pref_safer']:checked");
    const txtReason = document.getElementById("pref-reason-text");
    const errorMsg = document.getElementById("final-submit-error");

    if (!radioEasier || !radioFaster || !radioSafer) {
      if (errorMsg) {
        errorMsg.textContent = "Lütfen tüm tercih sorularını cevaplayınız.";
        errorMsg.style.display = "block";
      }
      return;
    }

    if (errorMsg) errorMsg.style.display = "none";

    this.preferences = {
      easier: radioEasier.value,
      faster: radioFaster.value,
      safer: radioSafer.value,
      reason: txtReason ? txtReason.value.trim() : ""
    };

    // Tam veri yükü (JSON)
    const payload = {
      participantCode: this.participantCode,
      order: this.order,
      timestamp: new Date().toISOString(),
      configVersion: this.config.version,
      configSnapshot: this.config,
      demographics: this.demographics,
      trialsLog: this.trialsLog,
      surveyCondition1: this.surveyData.cond1,
      surveyCondition2: this.surveyData.cond2,
      preferences: this.preferences
    };

    const jsonString = JSON.stringify(payload, null, 2);

    // Yerel depoya kaydet (panel aynı tarayıcıda görebilsin)
    this.saveSubmissionToStorage(payload);

    // Gönderim Butonu Durumu
    const submitBtn = document.getElementById("btn-final-submit");
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Veriler İletiliyor...";
    }

    // Netlify Form Submission
    const formData = new URLSearchParams();
    formData.append("form-name", "captcha-deney");
    formData.append("participant_code", this.participantCode);
    formData.append("order", this.order);
    formData.append("timestamp", payload.timestamp);
    formData.append("config_version", this.config.version);
    formData.append("config_snapshot", JSON.stringify(this.config));
    formData.append("trial_log", JSON.stringify(this.trialsLog));
    formData.append("survey_cond1", JSON.stringify(this.surveyData.cond1));
    formData.append("survey_cond2", JSON.stringify(this.surveyData.cond2));
    formData.append("pref_easier", this.preferences.easier);
    formData.append("pref_faster", this.preferences.faster);
    formData.append("pref_safer", this.preferences.safer);
    formData.append("pref_reason", this.preferences.reason);
    formData.append("age_group", this.demographics.ageGroup);
    formData.append("device_type", this.demographics.device);
    formData.append("captcha_frequency", this.demographics.captchaFrequency);

    fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString()
    })
    .then(response => {
      // Netlify başarıyla kabul ettiğinde
      this.showCompletionScreen(payload, true);
    })
    .catch(err => {
      console.warn("Netlify Form iletimi (yerel ortam veya çevrimdışı fallback):", err);
      // Fallback: Kullanıcıya kopyalanabilir JSON sun
      this.showCompletionScreen(payload, false);
    });
  }

  showCompletionScreen(payload, isNetlifySuccess) {
    this.goToStep("step-completed");

    const codeEl = document.getElementById("completion-code-badge");
    const fallbackBox = document.getElementById("fallback-json-box");
    const jsonArea = document.getElementById("fallback-json-textarea");
    const copyBtn = document.getElementById("btn-copy-json");
    const copyStatus = document.getElementById("copy-json-status");

    // Benzersiz Doğrulama Kodu: ör. HCI-KAT_XYZ-7489
    const verificationCode = `HCI-${payload.participantCode}-${Math.floor(1000 + Math.random() * 9000)}`;
    if (codeEl) codeEl.textContent = verificationCode;

    if (jsonArea) {
      jsonArea.value = JSON.stringify(payload, null, 2);
    }

    if (copyBtn && jsonArea) {
      copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(jsonArea.value).then(() => {
          if (copyStatus) {
            copyStatus.textContent = "Veri panoya kopyalandı! Araştırmacıya gönderebilirsiniz.";
            copyStatus.style.display = "block";
          }
        }).catch(() => {
          jsonArea.select();
          document.execCommand("copy");
          if (copyStatus) {
            copyStatus.textContent = "Metin seçildi, Ctrl+C / Cmd+C ile kopyalayabilirsiniz.";
            copyStatus.style.display = "block";
          }
        });
      });
    }

    // Eğer Netlify başarılı olduysa fallback kutusunu ikincil olarak tut
    if (isNetlifySuccess) {
      const netlifyNotice = document.getElementById("netlify-success-notice");
      if (netlifyNotice) netlifyNotice.style.display = "block";
    } else {
      const netlifyNotice = document.getElementById("netlify-offline-notice");
      if (netlifyNotice) netlifyNotice.style.display = "block";
      if (fallbackBox) fallbackBox.style.display = "block";
    }
  }
}

// Sayfa yüklendiğinde başlat
document.addEventListener("DOMContentLoaded", () => {
  window.experiment = new ExperimentController();
});
