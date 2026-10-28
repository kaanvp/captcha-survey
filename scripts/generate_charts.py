#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CAPTCHA HCI Deneyi — Makale kalitesinde, çeşitli grafik seti (matplotlib + seaborn).

Üretilen figürler (araştırma önerisindeki RQ1–RQ3 + analiz kurallarına göre):
  Fig 1  Eşleştirilmiş tamamlama süresi: keman (violin) + nokta + bağlantı çizgisi + ortalama + Wilcoxon
  Fig 2  İlk deneme doğruluğu ve tamamlama: dikey gruplu çubuk + %95 GA + bireysel nokta + Wilcoxon
  Fig 3  Deneme sonuç kompozisyonu: %100 yığılmış dikey çubuk
  Fig 4  Algılanan zorluk ve güvenlik: dikey kutu + nokta + Wilcoxon
  Fig 5  Algılanan zorluk × güvenlik: saçılım + kenar histogramları + ortalama
  Fig 6  Tercihler: dikey gruplu (dodged) çubuk
  Fig 7  Özet istatistik tablosu

Kullanım:
    python scripts/generate_charts.py
    python scripts/generate_charts.py --input indirilen_veri.json --outdir figures
"""
import argparse
import json
import os
import sys

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats as sps

TXT = "#4C72B0"    # Bozulmuş Metin
IMG = "#DD8452"    # Görsel Seçimi
OTHER = "#BDBDBD"  # Fark yok
GRAY = "#9AA0A6"
INK = "#202124"
LABEL_T = "Bozulmuş Metin"
LABEL_I = "Görsel Seçimi"


def load_data(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def cond_trials(p, cond):
    return (p.get(cond) or {}).get("trials") or []


def cond_survey(p, cond):
    return (p.get(cond) or {}).get("survey") or {}


def pick(s, *keys):
    for k in keys:
        if s.get(k) is not None:
            return s[k]
    return None


def first_ok(t):
    v = t.get("firstAttemptSuccess")
    if v is None:
        v = t.get("first_attempt_success")
    return bool(v)


def duration(t):
    v = t.get("durationSec")
    if v is None:
        v = t.get("duration_sec")
    return float(v) if v is not None else None


def solved_durations(p, cond):
    out = []
    for t in cond_trials(p, cond):
        if t.get("outcome") == "solved":
            d = duration(t)
            if d is not None:
                out.append(d)
    return out


def setup_style():
    sns.set_theme(style="whitegrid", context="paper", font_scale=1.12)
    plt.rcParams.update({
        "figure.dpi": 150,
        "savefig.dpi": 300,
        "font.family": "DejaVu Sans",
        "axes.titlesize": 12,
        "axes.labelsize": 10.5,
        "xtick.labelsize": 9.5,
        "ytick.labelsize": 9.5,
        "legend.fontsize": 9,
        "axes.edgecolor": "#9AA0A6",
        "grid.color": "#E8EAED",
    })


def save(fig, outdir, name):
    os.makedirs(outdir, exist_ok=True)
    path = os.path.join(outdir, name)
    fig.savefig(path, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    print("  ->", path)


def stars(p):
    if p is None:
        return "—"
    if p < 0.001:
        return "***"
    if p < 0.01:
        return "**"
    if p < 0.05:
        return "*"
    return "ns"


def sig_bracket(ax, x1, x2, top, text, h_frac=0.02):
    """İki grup arasına anlamlılık parantezi çizer."""
    y0 = top
    h = (ax.get_ylim()[1] - ax.get_ylim()[0]) * h_frac
    ax.plot([x1, x1, x2, x2], [y0, y0 + h, y0 + h, y0], lw=1.1, color=INK, clip_on=False)
    ax.text((x1 + x2) / 2, y0 + h, text, ha="center", va="bottom", fontsize=9.5,
            color=INK, fontweight="bold")


def boot_ci(vals, n=3000, ci=95, seed=0):
    vals = np.asarray(vals, dtype=float)
    rng = np.random.default_rng(seed)
    means = [rng.choice(vals, size=len(vals), replace=True).mean() for _ in range(n)]
    lo = np.percentile(means, (100 - ci) / 2)
    hi = np.percentile(means, 100 - (100 - ci) / 2)
    return lo, hi


# ---------------------------------------------------------------------------
# Fig 1 — Eşleştirilmiş tamamlama süresi
# ---------------------------------------------------------------------------
def fig_paired_duration(parts, outdir):
    rec = []
    for p in parts:
        td = solved_durations(p, "condition_text")
        im = solved_durations(p, "condition_image")
        if td and im:
            rec.append({
                "Katılımcı": p.get("participant_code") or p.get("participant_id"),
                "Metin": float(np.mean(td)),
                "Görsel": float(np.mean(im)),
            })
    if not rec:
        print("  (atlandı: eşleştirilmiş süre yok)")
        return
    df = pd.DataFrame(rec)
    long = pd.melt(df, id_vars=["Katılımcı"], value_vars=["Metin", "Görsel"],
                   var_name="Koşul", value_name="Süre (sn)")
    long["Koşul"] = long["Koşul"].map({"Metin": LABEL_T, "Görsel": LABEL_I})

    fig, ax = plt.subplots(figsize=(5.6, 4.6))
    sns.violinplot(data=long, x="Koşul", y="Süre (sn)", hue="Koşul",
                   palette=[TXT, IMG], inner=None, linewidth=1.2,
                   width=0.6, ax=ax, legend=False)
    sns.stripplot(data=long, x="Koşul", y="Süre (sn)", hue="Koşul",
                  palette=[TXT, IMG], size=5.5, alpha=0.85, jitter=0.06,
                  dodge=False, ax=ax, legend=False)

    xs = {LABEL_T: 0, LABEL_I: 1}
    for _, r in df.iterrows():
        ax.plot([xs[LABEL_T], xs[LABEL_I]], [r["Metin"], r["Görsel"]],
                color=GRAY, lw=0.8, alpha=0.65, zorder=0)
    for col, cond_label, color in (("Metin", LABEL_T, TXT), ("Görsel", LABEL_I, IMG)):
        v = df[col]
        ax.errorbar(xs[cond_label], v.mean(), yerr=v.std(),
                    fmt="D", markersize=7, color=INK, ecolor=INK,
                    elinewidth=1.4, capsize=4, zorder=6)

    # Wilcoxon (eşleştirilmiş)
    p = sps.wilcoxon(df["Metin"], df["Görsel"]).pvalue if len(df) >= 3 else None
    top = long["Süre (sn)"].max() * 1.12
    ax.set_ylim(top=long["Süre (sn)"].max() * 1.22)
    if p is not None:
        sig_bracket(ax, 0, 1, top, "p = %.3f %s" % (p, stars(p)))

    ax.set_ylabel("Tamamlama süresi (sn)")
    ax.set_xlabel("")
    ax.set_title("Eşleştirilmiş tamamlama süresi (zaman aşımı hariç)")
    ax.text(0.5, 1.06, "n = %d · keman = dağılım · nokta = katılımcı · ◆ = ortalama ± SS"
            % len(df), transform=ax.transAxes, ha="center", va="bottom",
            fontsize=8.5, color="#5F6368")
    save(fig, outdir, "fig1_eslestirilmis_sure.png")


# ---------------------------------------------------------------------------
# Fig 2 — İlk deneme doğruluğu + tamamlama (dikey gruplu çubuk + GA + Wilcoxon)
# ---------------------------------------------------------------------------
def fig_accuracy(parts, outdir):
    def per_participant(p, cond):
        trs = cond_trials(p, cond)
        if not trs:
            return None, None
        n = len(trs)
        first = sum(1 for t in trs if first_ok(t)) / n * 100
        solved = sum(1 for t in trs if t.get("outcome") == "solved") / n * 100
        return first, solved

    acc_t, acc_i, comp_t, comp_i = [], [], [], []
    for p in parts:
        a, c = per_participant(p, "condition_text")
        if a is not None:
            acc_t.append(a); comp_t.append(c)
        a, c = per_participant(p, "condition_image")
        if a is not None:
            acc_i.append(a); comp_i.append(c)
    if not acc_t and not acc_i:
        print("  (atlandı: deneme yok)")
        return

    metrics = ["İlk deneme doğruluğu", "Tamamlama oranı"]
    t_vals = [np.mean(acc_t) if acc_t else 0, np.mean(comp_t) if comp_t else 0]
    i_vals = [np.mean(acc_i) if acc_i else 0, np.mean(comp_i) if comp_i else 0]
    t_ci = [boot_ci(acc_t) if acc_t else (0, 0), boot_ci(comp_t) if comp_t else (0, 0)]
    i_ci = [boot_ci(acc_i) if acc_i else (0, 0), boot_ci(comp_i) if comp_i else (0, 0)]
    t_err = [[t_vals[j] - t_ci[j][0], t_ci[j][1] - t_vals[j]] for j in range(2)]
    i_err = [[i_vals[j] - i_ci[j][0], i_ci[j][1] - i_vals[j]] for j in range(2)]

    x = np.arange(len(metrics))
    w = 0.34
    fig, ax = plt.subplots(figsize=(6.4, 3.6))
    ax.bar(x - w / 2, t_vals, w, yerr=np.array(t_err).T, capsize=4,
           label=LABEL_T, color=TXT, alpha=0.9, edgecolor="white", error_kw={"elinewidth": 1.4})
    ax.bar(x + w / 2, i_vals, w, yerr=np.array(i_err).T, capsize=4,
           label=LABEL_I, color=IMG, alpha=0.9, edgecolor="white", error_kw={"elinewidth": 1.4})

    # bireysel noktalar
    def jitter_pts(xpos, vals, color):
        if not vals:
            return
        jx = xpos + np.random.default_rng(1).normal(0, 0.045, len(vals))
        ax.scatter(jx, vals, s=14, alpha=0.5, color=color, edgecolors="none", zorder=5)

    jitter_pts(x[0] - w / 2, acc_t, TXT)
    jitter_pts(x[0] + w / 2, acc_i, IMG)
    jitter_pts(x[1] - w / 2, comp_t, TXT)
    jitter_pts(x[1] + w / 2, comp_i, IMG)

    # Wilcoxon (eşleştirilmiş, katılımcı bazlı)
    for j, (a, b) in enumerate(((acc_t, acc_i), (comp_t, comp_i))):
        if len(a) >= 3 and len(b) >= 3 and len(a) == len(b):
            p = sps.wilcoxon(a, b).pvalue
            top = max(max(a), max(b)) * 1.14
            sig_bracket(ax, x[j] - w / 2, x[j] + w / 2, top, stars(p))

    ax.set_xticks(x)
    ax.set_xticklabels(metrics)
    ax.set_ylim(0, 118)
    ax.set_ylabel("%")
    ax.set_title("İlk deneme doğruluğu ve tamamlama oranı (katılımcı bazlı, ± %95 GA)")
    ax.legend(frameon=False, loc="upper right", bbox_to_anchor=(1, 1.04))
    save(fig, outdir, "fig2_dogruluk_tamamlama.png")


# ---------------------------------------------------------------------------
# Fig 3 — Deneme sonuç kompozisyonu (%100 yığılmış dikey çubuk)
# ---------------------------------------------------------------------------
def fig_outcomes(parts, outdir):
    def comp(cond):
        trs = [t for p in parts for t in cond_trials(p, cond)]
        n = len(trs)
        solved1 = sum(1 for t in trs if t.get("outcome") == "solved" and first_ok(t))
        solved_retry = sum(1 for t in trs if t.get("outcome") == "solved" and not first_ok(t))
        timeout = sum(1 for t in trs if t.get("outcome") == "timeout")
        failed = sum(1 for t in trs if t.get("outcome") in ("abandoned", "failed_attempts"))
        return n, [solved1, solved_retry, timeout, failed]

    nt, ct = comp("condition_text")
    ni, ci = comp("condition_image")
    if nt + ni == 0:
        print("  (atlandı: deneme yok)")
        return
    cats = ["İlk denemede çözüldü", "Tekrar ile çözüldü", "Zaman aşımı", "Başarısız/vazgeçme"]
    colors = [TXT, "#89A8D8", "#B7C6E3", OTHER]

    fig, ax = plt.subplots(figsize=(5.4, 3.6))
    bottom = np.zeros(2)
    for i, cat in enumerate(cats):
        vals = np.array([ct[i] / nt * 100 if nt else 0, ci[i] / ni * 100 if ni else 0])
        ax.bar([LABEL_T, LABEL_I], vals, bottom=bottom, color=colors[i], label=cat, edgecolor="white", width=0.5)
        for j, v in enumerate(vals):
            if v > 4:
                ax.text(j, bottom[j] + v / 2, "%.0f%%" % v, ha="center", va="center",
                        fontsize=8.5, color="white", fontweight="bold")
        bottom += vals
    ax.set_ylabel("Denemelerin payı (%)")
    ax.set_title("Deneme sonuç kompozisyonu")
    ax.legend(frameon=False, ncol=2, loc="upper center", bbox_to_anchor=(0.5, -0.18))
    ax.text(0.5, 1.06, "n = %d (metin) · %d (görsel) deneme" % (nt, ni),
            transform=ax.transAxes, ha="center", va="bottom", fontsize=8.5, color="#5F6368")
    save(fig, outdir, "fig3_deneme_kompozisyonu.png")


# ---------------------------------------------------------------------------
# Fig 4 — Algılanan zorluk ve güvenlik (dikey kutu + nokta + Wilcoxon)
# ---------------------------------------------------------------------------
def fig_likert(parts, outdir):
    def collect(key):
        a, b = [], []
        for p in parts:
            dt = pick(cond_survey(p, "condition_text"), key, key)
            di = pick(cond_survey(p, "condition_image"), key, key)
            if dt is not None:
                a.append(int(dt))
            if di is not None:
                b.append(int(di))
        return a, b

    diff_t, diff_i = collect("perceivedDifficulty")
    sec_t, sec_i = collect("perceivedSecurity")
    if not (diff_t or diff_i or sec_t or sec_i):
        print("  (atlandı: anket yok)")
        return

    fig, axes = plt.subplots(1, 2, figsize=(7.0, 3.6), sharey=True)
    panels = [("Algılanan zorluk", diff_t, diff_i, "perceivedDifficulty"),
              ("Algılanan güvenlik", sec_t, sec_i, "perceivedSecurity")]
    for ax, (title, t, i, key) in zip(axes, panels):
        data = pd.DataFrame({
            "Koşul": [LABEL_T] * len(t) + [LABEL_I] * len(i),
            "Puan": t + i,
        })
        sns.boxplot(data=data, x="Koşul", y="Puan", hue="Koşul",
                    palette=[TXT, IMG], width=0.45, linewidth=1.3,
                    showfliers=False, ax=ax, legend=False)
        sns.stripplot(data=data, x="Koşul", y="Puan", hue="Koşul",
                      palette=[TXT, IMG], size=4.5, alpha=0.75, jitter=0.1,
                      dodge=False, ax=ax, legend=False)
        if len(t) >= 3 and len(i) >= 3 and len(t) == len(i):
            p = sps.wilcoxon(t, i).pvalue
            top = max(max(t), max(i)) + 0.55
            sig_bracket(ax, 0, 1, top, stars(p))
        ax.set_ylim(0.5, 7.5)
        ax.set_yticks(range(1, 8))
        ax.set_title(title)
        ax.set_xlabel("")
        ax.set_ylabel("Puan (1–7)" if ax is axes[0] else "")
    fig.suptitle("Algılanan zorluk ve algılanan güvenlik (Likert 1–7)", y=1.04)
    fig.tight_layout()
    save(fig, outdir, "fig4_likert.png")


# ---------------------------------------------------------------------------
# Fig 5 — Algılanan zorluk × güvenlik (saçılım + kenar histogramları)
# ---------------------------------------------------------------------------
def fig_perception(parts, outdir):
    rec = []
    for p in parts:
        for cond, ctype in (("condition_text", "text"), ("condition_image", "image")):
            s = cond_survey(p, cond)
            d = pick(s, "perceivedDifficulty", "perceived_difficulty")
            sec = pick(s, "perceivedSecurity", "perceived_security")
            if d is not None and sec is not None:
                rec.append({"Koşul": LABEL_T if ctype == "text" else LABEL_I,
                            "Zorluk": int(d), "Güvenlik": int(sec)})
    if not rec:
        print("  (atlandı: anket yok)")
        return
    df = pd.DataFrame(rec)

    fig = plt.figure(figsize=(5.6, 5.0))
    gs = fig.add_gridspec(2, 2, width_ratios=(4, 1), height_ratios=(1, 4),
                          hspace=0.06, wspace=0.06)
    ax = fig.add_subplot(gs[1, 0])
    ax_top = fig.add_subplot(gs[0, 0], sharex=ax)
    ax_right = fig.add_subplot(gs[1, 1], sharey=ax)

    for cond, color in ((LABEL_T, TXT), (LABEL_I, IMG)):
        sub = df[df["Koşul"] == cond]
        ax.scatter(sub["Zorluk"], sub["Güvenlik"], s=34, alpha=0.55,
                   color=color, label=cond, edgecolors="none")
        if len(sub):
            ax.scatter(sub["Zorluk"].mean(), sub["Güvenlik"].mean(), s=170,
                       marker="X", color=color, edgecolors=INK, linewidths=1.2, zorder=6)

    ax.plot([1, 7], [1, 7], ls="--", color="#E8EAED", lw=1.2, zorder=0)
    ax.set_xlim(0.5, 7.5)
    ax.set_ylim(0.5, 7.5)
    ax.set_xticks(range(1, 8))
    ax.set_yticks(range(1, 8))
    ax.set_xlabel("Algılanan zorluk / çaba (1–7)")
    ax.set_ylabel("Algılanan güvenlik (1–7)")
    ax.legend(frameon=False, loc="best")

    # kenar histogramları (gri, tek taraflı)
    ax_top.hist(df["Zorluk"], bins=np.arange(1, 9) - 0.5, color="#C8CBD0",
                edgecolor="white", alpha=0.9)
    ax_right.hist(df["Güvenlik"], bins=np.arange(1, 9) - 0.5, color="#C8CBD0",
                  edgecolor="white", alpha=0.9, orientation="horizontal")
    ax_top.axis("off")
    ax_right.axis("off")

    fig.suptitle("Algılanan zorluk ile algılanan güvenlik ilişkisi", y=0.98)
    save(fig, outdir, "fig5_zorluk_guvenlik.png")


# ---------------------------------------------------------------------------
# Fig 6 — Tercihler (dikey gruplu / dodged çubuk)
# ---------------------------------------------------------------------------
def fig_preferences(parts, outdir):
    qs = ["easier", "faster", "safer"]
    qlabels = ["Daha kolay", "Daha hızlı", "Daha güvenli"]
    answers = [LABEL_I, LABEL_T, "Fark Yok"]
    colors = [IMG, TXT, OTHER]
    counts = {k: {a: 0 for a in answers} for k in qs}
    for p in parts:
        prefs = p.get("preferences") or {}
        for k in qs:
            v = prefs.get(k)
            if v in counts[k]:
                counts[k][v] += 1
    if not any(sum(counts[k].values()) for k in qs):
        print("  (atlandı: tercih yok)")
        return

    x = np.arange(len(qlabels))
    w = 0.26
    fig, ax = plt.subplots(figsize=(6.4, 3.4))
    for i, (ans, color) in enumerate(zip(answers, colors)):
        vals = [counts[k][ans] for k in qs]
        ax.bar(x + (i - 1) * w, vals, w, label=ans, color=color, alpha=0.92, edgecolor="white")
    for bars in ax.containers:
        ax.bar_label(bars, padding=2, fontsize=8, color=INK)
    ax.set_xticks(x)
    ax.set_xticklabels(qlabels)
    ax.set_ylabel("Katılımcı sayısı")
    ax.set_title("Katılımcı tercihleri")
    ax.legend(frameon=False, ncol=3, loc="upper right", bbox_to_anchor=(1, 1.04))
    save(fig, outdir, "fig6_tercihler.png")


# ---------------------------------------------------------------------------
# Fig 7 — Özet istatistik tablosu
# ---------------------------------------------------------------------------
def fig_summary_table(parts, outdir):
    def stats_for(cond):
        trs = [t for p in parts for t in cond_trials(p, cond)]
        n = len(trs)
        durs = [duration(t) for t in trs if t.get("outcome") == "solved" and duration(t) is not None]
        first = sum(1 for t in trs if first_ok(t)) / n * 100 if n else 0
        solved = sum(1 for t in trs if t.get("outcome") == "solved") / n * 100 if n else 0
        to = sum(1 for t in trs if t.get("outcome") == "timeout")
        d = pd.Series(durs)
        return {
            "Deneme (n)": n,
            "Medyan süre (sn)": ("%.1f" % d.median()) if len(d) else "—",
            "IQR (sn)": ("%.1f" % (d.quantile(0.75) - d.quantile(0.25))) if len(d) else "—",
            "Ort. süre ± SS (sn)": ("%.1f ± %.1f" % (d.mean(), d.std())) if len(d) else "—",
            "İlk deneme doğruluğu (%)": "%.1f" % first,
            "Tamamlama (%)": "%.1f" % solved,
            "Zaman aşımı": to,
        }

    txt = stats_for("condition_text")
    img = stats_for("condition_image")
    keys = list(txt.keys())
    cell = [[k, txt[k], img[k]] for k in keys]
    fig, ax = plt.subplots(figsize=(7.2, 3.4))
    ax.axis("off")
    tbl = ax.table(cellText=cell, colLabels=["Ölçüm", LABEL_T, LABEL_I],
                   loc="center", cellLoc="center")
    tbl.auto_set_font_size(False)
    tbl.set_fontsize(10)
    tbl.scale(1, 1.6)
    for (r, c), cell_ in tbl.get_celld().items():
        cell_.set_edgecolor("#E8EAED")
        if r == 0:
            cell_.set_facecolor("#202124")
            cell_.set_text_props(color="white", weight="bold")
        elif c == 0:
            cell_.set_text_props(weight="bold")
            cell_.set_facecolor("#F4F6F8")
        else:
            cell_.set_facecolor("white")
    ax.set_title("Özet istatistikler (zaman aşımı süre hesabına dahil değildir)", pad=10)
    save(fig, outdir, "fig7_ozet_tablo.png")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", default="data/results.json")
    ap.add_argument("--outdir", default="figures")
    args = ap.parse_args()

    setup_style()
    if not os.path.exists(args.input):
        sys.exit("Girdi dosyası bulunamadı: " + args.input)
    data = load_data(args.input)
    parts = data.get("participants") or []
    if not parts:
        print("Uyarı: participants boş. Önce veri toplayın veya panelden JSON dışa aktarın.")
        return
    print("%d katılımcı işleniyor..." % len(parts))
    fig_paired_duration(parts, args.outdir)
    fig_accuracy(parts, args.outdir)
    fig_outcomes(parts, args.outdir)
    fig_likert(parts, args.outdir)
    fig_perception(parts, args.outdir)
    fig_preferences(parts, args.outdir)
    fig_summary_table(parts, args.outdir)
    print("Bitti.")


if __name__ == "__main__":
    main()
