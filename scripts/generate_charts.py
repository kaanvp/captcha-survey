#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CAPTCHA HCI Deneyi — Makale kalitesinde grafikler (matplotlib + seaborn).

Araştırma önerisindeki analiz planına göre üretir:
  RQ1  Fig 1: Tamamlama süresi dağılımı (zaman aşımı hariç)
       Fig 2: İlk deneme doğruluğu + tamamlama oranı
  RQ2  Fig 3: Algılanan zorluk ile algılanan güvenlik ilişkisi
  RQ3  Fig 4: Katılımcı tercihleri (kolay / hızlı / güvenli)

Kullanım:
    python scripts/generate_charts.py
    python scripts/generate_charts.py --input indirilen_veri.json --outdir figures
"""
import argparse
import json
import os
import sys

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

TXT = "#4C72B0"    # Bozulmuş Metin
IMG = "#DD8452"    # Görsel Seçimi
OTHER = "#BDBDBD"  # Fark yok
LABELS = {"text": "Bozulmuş Metin", "image": "Görsel Seçimi"}


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


def first_attempt_success(t):
    v = t.get("firstAttemptSuccess")
    if v is None:
        v = t.get("first_attempt_success")
    return bool(v)


def duration(t):
    v = t.get("durationSec")
    if v is None:
        v = t.get("duration_sec")
    return float(v) if v is not None else None


def gather(parts):
    rows = []
    for p in parts:
        for cond, ctype in (("condition_text", "text"), ("condition_image", "image")):
            for t in cond_trials(p, cond):
                rows.append({
                    "type": ctype,
                    "outcome": t.get("outcome"),
                    "first_ok": first_attempt_success(t),
                    "duration": duration(t),
                })
    return rows


def setup_style():
    sns.set_theme(style="whitegrid", context="paper")
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


def fig_duration(rows, outdir):
    import pandas as pd
    solved = [r for r in rows if r["outcome"] == "solved" and r["duration"] is not None]
    if not solved:
        print("  (atlandı: çözülmüş süre yok)")
        return
    df = pd.DataFrame([{"Koşul": LABELS[r["type"]], "Süre": r["duration"]} for r in solved])
    order = [LABELS["text"], LABELS["image"]]
    palette = [TXT, IMG]
    fig, ax = plt.subplots(figsize=(5.2, 3.4))
    sns.boxplot(data=df, x="Koşul", y="Süre", order=order, hue="Koşul",
                palette=palette, width=0.5, showfliers=False, ax=ax,
                linewidth=1.2, legend=False)
    sns.stripplot(data=df, x="Koşul", y="Süre", order=order, hue="Koşul",
                  palette=palette, size=4, alpha=0.55, jitter=0.12, ax=ax, legend=False)
    ax.set_title("Tamamlama süresi dağılımı (zaman aşımı hariç)")
    ax.set_xlabel("")
    ax.set_ylabel("Süre (sn)")
    top = ax.get_ylim()[1]
    for i, cond in enumerate(("text", "image")):
        vals = [r["duration"] for r in solved if r["type"] == cond]
        if vals:
            ax.text(i, top * 0.98, "n=%d" % len(vals), ha="center", va="top",
                    fontsize=9, color="#5F6368")
    save(fig, outdir, "fig1_tamamlama_suresi.png")


def fig_accuracy(rows, outdir):
    if not rows:
        print("  (atlandı: deneme yok)")
        return
    stats = {}
    for cond in ("text", "image"):
        sub = [r for r in rows if r["type"] == cond]
        n = len(sub)
        first = sum(1 for r in sub if r["first_ok"]) / n * 100 if n else 0
        solved = sum(1 for r in sub if r["outcome"] == "solved") / n * 100 if n else 0
        stats[cond] = (first, solved)
    labels = ["İlk deneme doğruluğu", "Tamamlama oranı"]
    x = np.arange(len(labels))
    width = 0.34
    fig, ax = plt.subplots(figsize=(5.0, 3.2))
    ax.bar(x - width / 2, [stats["text"][0], stats["text"][1]], width,
           label="Bozulmuş Metin", color=TXT, alpha=0.9)
    ax.bar(x + width / 2, [stats["image"][0], stats["image"][1]], width,
           label="Görsel Seçimi", color=IMG, alpha=0.9)
    ax.set_xticks(x)
    ax.set_xticklabels(labels)
    ax.set_ylim(0, 105)
    ax.set_ylabel("%")
    ax.set_title("İlk deneme doğruluğu ve tamamlama oranı")
    ax.legend(frameon=False, loc="upper left")
    for c in ax.containers:
        ax.bar_label(c, fmt="%.1f", padding=2, fontsize=8)
    save(fig, outdir, "fig2_dogruluk_tamamlama.png")


def fig_perception(parts, outdir):
    import pandas as pd
    rec = []
    for p in parts:
        for cond, ctype in (("condition_text", "text"), ("condition_image", "image")):
            s = cond_survey(p, cond)
            d = pick(s, "perceivedDifficulty", "perceived_difficulty")
            sec = pick(s, "perceivedSecurity", "perceived_security")
            if d is not None and sec is not None:
                rec.append({"Koşul": LABELS[ctype], "Zorluk": d, "Güvenlik": sec})
    if not rec:
        print("  (atlandı: anket verisi yok)")
        return
    df = pd.DataFrame(rec)
    fig, ax = plt.subplots(figsize=(4.6, 4.0))
    for cond, color in (("Bozulmuş Metin", TXT), ("Görsel Seçimi", IMG)):
        sub = df[df["Koşul"] == cond]
        ax.scatter(sub["Zorluk"], sub["Güvenlik"], s=26, alpha=0.55,
                   color=color, label=cond, edgecolors="none")
        if len(sub):
            ax.scatter(sub["Zorluk"].mean(), sub["Güvenlik"].mean(), s=120,
                       marker="X", color=color, edgecolors="#202124",
                       linewidths=1.0, zorder=5)
    ax.set_xlim(0.5, 7.5)
    ax.set_ylim(0.5, 7.5)
    ax.set_xticks(range(1, 8))
    ax.set_yticks(range(1, 8))
    ax.set_xlabel("Algılanan zorluk / çaba (1–7)")
    ax.set_ylabel("Algılanan güvenlik (1–7)")
    ax.set_title("Algılanan zorluk ile algılanan güvenlik")
    ax.legend(frameon=False, loc="best")
    save(fig, outdir, "fig3_algilanan_zorluk_guvenlik.png")


def fig_preferences(parts, outdir):
    qs = ["easier", "faster", "safer"]
    qlabels = ["Daha kolay", "Daha hızlı", "Daha güvenli"]
    counts = {k: {"Görsel Seçimi": 0, "Bozulmuş Metin": 0, "Fark Yok": 0} for k in qs}
    for p in parts:
        prefs = p.get("preferences") or {}
        for k in qs:
            v = prefs.get(k)
            if v in counts[k]:
                counts[k][v] += 1
    total = {k: sum(counts[k].values()) for k in qs}
    if not any(total.values()):
        print("  (atlandı: tercih verisi yok)")
        return
    fig, ax = plt.subplots(figsize=(5.6, 2.8))
    left = np.zeros(len(qs))
    for label, color in (("Görsel Seçimi", IMG), ("Bozulmuş Metin", TXT), ("Fark Yok", OTHER)):
        vals = np.array([counts[k][label] for k in qs], dtype=float)
        ax.barh(qlabels, vals, left=left, color=color, label=label, edgecolor="white")
        left += vals
    ax.set_xlabel("Katılımcı sayısı")
    ax.set_title("Katılımcı tercihleri")
    ax.legend(frameon=False, ncol=3, loc="upper center", bbox_to_anchor=(0.5, -0.18))
    for i, k in enumerate(qs):
        if total[k]:
            ax.text(total[k] + 0.1, i, "n=%d" % total[k], va="center", fontsize=9, color="#5F6368")
    save(fig, outdir, "fig4_tercihler.png")


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
    rows = gather(parts)
    print("%d katılımcı, %d deneme işleniyor..." % (len(parts), len(rows)))
    fig_duration(rows, args.outdir)
    fig_accuracy(rows, args.outdir)
    fig_perception(parts, args.outdir)
    fig_preferences(parts, args.outdir)
    print("Bitti.")


if __name__ == "__main__":
    main()
