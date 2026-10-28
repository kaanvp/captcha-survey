#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CAPTCHA HCI Deneyi — Makale kalitesinde kapsamlı grafik seti (matplotlib + seaborn).

Araştırma önerisindeki analiz planına göre üretir:
  Fig 1  Eşleştirilmiş tamamlama süresi (kutu + nokta + katılımcı bağlantı çizgileri)
  Fig 2  İlk deneme doğruluğu + tamamlama oranı (ortalama ± %95 GA, katılımcı bazlı)
  Fig 3  Zaman aşımı / yeniden deneme / başarısız sayıları
  Fig 4  Algılanan zorluk ve algılanan güvenlik dağılımı (Likert 1–7)
  Fig 5  Algılanan zorluk ile algılanan güvenlik ilişkisi (nokta + ortalama)
  Fig 6  Katılımcı tercihleri (yığılmış oran)
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

TXT = "#4C72B0"    # Bozulmuş Metin
IMG = "#DD8452"    # Görsel Seçimi
OTHER = "#BDBDBD"  # Fark yok
GRAY = "#9AA0A6"


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


def trial_rows(parts):
    rows = []
    for p in parts:
        for cond, ctype in (("condition_text", "text"), ("condition_image", "image")):
            for t in cond_trials(p, cond):
                rows.append({
                    "type": ctype,
                    "outcome": t.get("outcome"),
                    "first_ok": first_ok(t),
                    "duration": duration(t),
                    "attempts": t.get("attempts") or 1,
                })
    return rows


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

    fig, ax = plt.subplots(figsize=(5.6, 4.3))
    sns.boxplot(data=long, x="Koşul", y="Süre (sn)", hue="Koşul", palette=[TXT, IMG],
                width=0.42, linewidth=1.3, showfliers=False, ax=ax, legend=False)
    sns.stripplot(data=long, x="Koşul", y="Süre (sn)", hue="Koşul", palette=[TXT, IMG],
                  size=5, alpha=0.85, jitter=0.08, dodge=False, ax=ax, legend=False)

    xs = {"Metin": 0, "Görsel": 1}
    for _, r in df.iterrows():
        ax.plot([xs["Metin"], xs["Görsel"]], [r["Metin"], r["Görsel"]],
                color=GRAY, lw=0.8, alpha=0.7, zorder=0)
    for cond, color in (("Metin", TXT), ("Görsel", IMG)):
        v = df[cond]
        ax.scatter(xs[cond], v.mean(), s=150, marker="X", color=color,
                   edgecolors="#202124", linewidths=1.2, zorder=5)

    ax.set_ylabel("Tamamlama süresi (sn)")
    ax.set_xlabel("")
    ax.set_title("Eşleştirilmiş tamamlama süresi (zaman aşımı hariç)")
    ax.text(0.5, 1.03, "n = %d katılımcı · noktalar katılımcı ortalaması · X grup ortalaması"
            % len(df), transform=ax.transAxes, ha="center", va="bottom",
            fontsize=9, color="#5F6368")
    save(fig, outdir, "fig1_eslestirilmis_sure.png")


def fig_accuracy(parts, outdir):
    rec = []
    for p in parts:
        for cond, ctype in (("condition_text", "text"), ("condition_image", "image")):
            trs = cond_trials(p, cond)
            if not trs:
                continue
            n = len(trs)
            first = sum(1 for t in trs if first_ok(t)) / n * 100
            solved = sum(1 for t in trs if t.get("outcome") == "solved") / n * 100
            rec.append({
                "Koşul": "Bozulmuş Metin" if ctype == "text" else "Görsel Seçimi",
                "İlk deneme doğruluğu": first,
                "Tamamlama oranı": solved,
            })
    if not rec:
        print("  (atlandı: deneme yok)")
        return
    df = pd.DataFrame(rec)
    fig, axes = plt.subplots(1, 2, figsize=(7.4, 3.5), sharey=True)
    for ax, col in zip(axes, ["İlk deneme doğruluğu", "Tamamlama oranı"]):
        sns.pointplot(data=df, x="Koşul", y=col, hue="Koşul", palette=[TXT, IMG],
                      errorbar=("ci", 95), markers="o", linestyle="none",
                      dodge=False, capsize=0.12, err_kws={"linewidth": 1.6}, ax=ax, legend=False)
        sns.stripplot(data=df, x="Koşul", y=col, hue="Koşul", palette=[TXT, IMG],
                      size=3.5, alpha=0.45, jitter=0.1, dodge=False, ax=ax, legend=False)
        ax.set_ylim(-2, 108)
        ax.set_title(col)
        ax.set_xlabel("")
        ax.set_ylabel("%" if ax is axes[0] else "")
    fig.suptitle("Doğruluk ve tamamlama (katılımcı bazlı, ortalama ± %95 GA)", y=1.04)
    fig.tight_layout()
    save(fig, outdir, "fig2_dogruluk_tamamlama.png")


def fig_outcomes(parts, outdir):
    rows = trial_rows(parts)
    if not rows:
        print("  (atlandı: deneme yok)")
        return
    cats = ["Yeniden deneme", "Zaman aşımı", "Başarısız/vazgeçme"]
    data = {"Koşul": [], "Kategori": [], "Adet": []}
    for cond, ctype, label in (("text", "text", "Bozulmuş Metin"), ("image", "image", "Görsel Seçimi")):
        sub = [r for r in rows if r["type"] == ctype]
        retry = sum(1 for r in sub if r["attempts"] > 1)
        timeout = sum(1 for r in sub if r["outcome"] == "timeout")
        fail = sum(1 for r in sub if r["outcome"] in ("abandoned", "failed_attempts"))
        for cat, val in zip(cats, (retry, timeout, fail)):
            data["Koşul"].append(label)
            data["Kategori"].append(cat)
            data["Adet"].append(val)
    df = pd.DataFrame(data)
    fig, ax = plt.subplots(figsize=(5.6, 3.0))
    sns.barplot(data=df, x="Kategori", y="Adet", hue="Koşul", palette=[TXT, IMG],
                ax=ax, edgecolor="white")
    for c in ax.containers:
        ax.bar_label(c, padding=2, fontsize=8, color="#202124")
    ax.set_xlabel("")
    ax.set_ylabel("Deneme sayısı")
    ax.set_title("Yeniden deneme, zaman aşımı ve başarısız denemeler")
    ax.legend(frameon=False, title="")
    save(fig, outdir, "fig3_deneme_sayilari.png")


def fig_likert(parts, outdir):
    rows = []
    for p in parts:
        for cond, ctype in (("condition_text", "text"), ("condition_image", "image")):
            s = cond_survey(p, cond)
            d = pick(s, "perceivedDifficulty", "perceived_difficulty")
            sec = pick(s, "perceivedSecurity", "perceived_security")
            label = "Bozulmuş Metin" if ctype == "text" else "Görsel Seçimi"
            if d is not None:
                rows.append({"Koşul": label, "Ölçek": "Algılanan zorluk", "Puan": int(d)})
            if sec is not None:
                rows.append({"Koşul": label, "Ölçek": "Algılanan güvenlik", "Puan": int(sec)})
    if not rows:
        print("  (atlandı: anket verisi yok)")
        return
    df = pd.DataFrame(rows)
    g = sns.catplot(data=df, x="Puan", hue="Koşul", col="Ölçek", kind="count",
                    palette=[TXT, IMG], height=3.0, aspect=1.2)
    for ax in g.axes.flat:
        ax.set_xlabel("Puan (1–7)")
        ax.set_ylabel("Katılımcı sayısı")
        ax.set_xticks(range(1, 8))
    g.fig.suptitle("Algılanan zorluk ve algılanan güvenlik dağılımı", y=1.06)
    save(g.fig, outdir, "fig4_likert_dagilimi.png")


def fig_perception(parts, outdir):
    rec = []
    for p in parts:
        for cond, ctype in (("condition_text", "text"), ("condition_image", "image")):
            s = cond_survey(p, cond)
            d = pick(s, "perceivedDifficulty", "perceived_difficulty")
            sec = pick(s, "perceivedSecurity", "perceived_security")
            if d is not None and sec is not None:
                rec.append({"Koşul": "Bozulmuş Metin" if ctype == "text" else "Görsel Seçimi",
                            "Zorluk": int(d), "Güvenlik": int(sec)})
    if not rec:
        print("  (atlandı: anket verisi yok)")
        return
    df = pd.DataFrame(rec)
    fig, ax = plt.subplots(figsize=(4.8, 4.2))
    for cond, color in (("Bozulmuş Metin", TXT), ("Görsel Seçimi", IMG)):
        sub = df[df["Koşul"] == cond]
        ax.scatter(sub["Zorluk"], sub["Güvenlik"], s=30, alpha=0.55,
                   color=color, label=cond, edgecolors="none")
        if len(sub):
            ax.scatter(sub["Zorluk"].mean(), sub["Güvenlik"].mean(), s=150,
                       marker="X", color=color, edgecolors="#202124",
                       linewidths=1.2, zorder=5)
    ax.plot([1, 7], [1, 7], ls="--", color="#E8EAED", lw=1.2, zorder=0)
    ax.set_xlim(0.5, 7.5)
    ax.set_ylim(0.5, 7.5)
    ax.set_xticks(range(1, 8))
    ax.set_yticks(range(1, 8))
    ax.set_xlabel("Algılanan zorluk / çaba (1–7)")
    ax.set_ylabel("Algılanan güvenlik (1–7)")
    ax.set_title("Algılanan zorluk ile algılanan güvenlik")
    ax.legend(frameon=False, loc="best")
    save(fig, outdir, "fig5_zorluk_guvenlik.png")


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
    fig, ax = plt.subplots(figsize=(5.8, 3.0))
    left = np.zeros(len(qs))
    for label, color in (("Görsel Seçimi", IMG), ("Bozulmuş Metin", TXT), ("Fark Yok", OTHER)):
        vals = np.array([counts[k][label] for k in qs], dtype=float)
        ax.barh(qlabels, vals, left=left, color=color, label=label, edgecolor="white")
        left += vals
    ax.set_xlabel("Katılımcı sayısı")
    ax.set_title("Katılımcı tercihleri")
    ax.legend(frameon=False, ncol=3, loc="upper center", bbox_to_anchor=(0.5, -0.22))
    for i, k in enumerate(qs):
        if total[k]:
            ax.text(total[k] + 0.15, i, "n=%d" % total[k], va="center", fontsize=9, color="#5F6368")
    save(fig, outdir, "fig6_tercihler.png")


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
    tbl = ax.table(cellText=cell, colLabels=["Ölçüm", "Bozulmuş Metin", "Görsel Seçimi"],
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
