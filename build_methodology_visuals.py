"""
Generates the four visualizations referenced in METHODOLOGY.md Section 3.6.3:
  1. Per-class precision / recall / F1 bar chart
  2. Confusion matrix heatmap (counts + row-normalized percentages)
  3. Top 5 feature importance (RF vs XGBoost vs mean)
  4. Accuracy summary card (49.39% vs 33% chance baseline)

Outputs go to outputs/methodology_*.png
"""

import os
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, "outputs")

CLASS_ORDER = ["Low", "Middle", "High"]

# Hard-coded from outputs/stacking_classification_report.txt
METRICS = {
    "Low":    {"precision": 0.3727, "recall": 0.5642, "f1": 0.4489, "support": 179},
    "Middle": {"precision": 0.2716, "recall": 0.2986, "f1": 0.2844, "support": 211},
    "High":   {"precision": 0.7020, "recall": 0.5491, "f1": 0.6162, "support": 519},
}
ACCURACY = 0.4939
CHANCE_BASELINE = 1 / 3

# Confusion matrix from outputs/stacking_confusion_matrix.csv
CONFUSION = np.array([
    [101,  38,  40],   # Actual Low
    [ 67,  63,  81],   # Actual Middle
    [103, 131, 285],   # Actual High
])


def plot_per_class_metrics():
    fig, ax = plt.subplots(figsize=(9, 5.5))

    classes = CLASS_ORDER
    precision = [METRICS[c]["precision"] for c in classes]
    recall    = [METRICS[c]["recall"]    for c in classes]
    f1        = [METRICS[c]["f1"]        for c in classes]

    x = np.arange(len(classes))
    width = 0.26

    bars_p = ax.bar(x - width, precision, width, label="Precision",
                    color="#4C72B0", edgecolor="white")
    bars_r = ax.bar(x,         recall,    width, label="Recall",
                    color="#DD8452", edgecolor="white")
    bars_f = ax.bar(x + width, f1,        width, label="F1-score",
                    color="#55A868", edgecolor="white")

    for bars in (bars_p, bars_r, bars_f):
        for bar in bars:
            h = bar.get_height()
            ax.annotate(f"{h:.3f}",
                        xy=(bar.get_x() + bar.get_width() / 2, h),
                        xytext=(0, 3), textcoords="offset points",
                        ha="center", va="bottom", fontsize=9)

    ax.set_xticks(x)
    ax.set_xticklabels(
        [f"{c}\n(n = {METRICS[c]['support']})" for c in classes],
        fontsize=11,
    )
    ax.set_ylabel("Score", fontsize=11)
    ax.set_ylim(0, 0.85)
    ax.set_title("Per-Class Performance on Hold-out Test Set (909 families)",
                 fontsize=13, fontweight="bold", pad=14)
    ax.grid(axis="y", linestyle="--", alpha=0.4)
    ax.set_axisbelow(True)
    ax.legend(loc="upper left", frameon=True, fontsize=10)

    fig.text(0.5, 0.02,
             f"Overall hold-out accuracy: {ACCURACY:.2%}  "
             f"(random-guess baseline for 3 classes: {CHANCE_BASELINE:.2%})",
             ha="center", fontsize=10, style="italic", color="#444")

    plt.tight_layout(rect=[0, 0.04, 1, 1])
    out_path = os.path.join(OUT, "methodology_performance_metrics.png")
    plt.savefig(out_path, dpi=200, bbox_inches="tight")
    plt.close(fig)
    print(f"  saved {out_path}")


def plot_confusion_matrix_panels():
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5.5))

    # Left panel: raw counts
    im1 = ax1.imshow(CONFUSION, cmap="Blues")
    ax1.set_xticks(range(3))
    ax1.set_yticks(range(3))
    ax1.set_xticklabels([f"Predicted {c}" for c in CLASS_ORDER], fontsize=11)
    ax1.set_yticklabels([f"Actual {c}"    for c in CLASS_ORDER], fontsize=11)
    ax1.set_title("Confusion Matrix — Counts",
                  fontsize=12, fontweight="bold", pad=12)

    vmax = CONFUSION.max()
    for i in range(3):
        for j in range(3):
            val = CONFUSION[i, j]
            color = "white" if val > vmax * 0.55 else "black"
            weight = "bold" if i == j else "normal"
            ax1.text(j, i, str(val), ha="center", va="center",
                     color=color, fontsize=14, fontweight=weight)

    plt.colorbar(im1, ax=ax1, fraction=0.046, pad=0.04)

    # Right panel: row-normalized percentages
    row_pct = CONFUSION / CONFUSION.sum(axis=1, keepdims=True) * 100
    im2 = ax2.imshow(row_pct, cmap="Greens", vmin=0, vmax=100)
    ax2.set_xticks(range(3))
    ax2.set_yticks(range(3))
    ax2.set_xticklabels([f"Predicted {c}" for c in CLASS_ORDER], fontsize=11)
    ax2.set_yticklabels([f"Actual {c}"    for c in CLASS_ORDER], fontsize=11)
    ax2.set_title("Confusion Matrix — Row-Normalized (Recall %)",
                  fontsize=12, fontweight="bold", pad=12)

    for i in range(3):
        for j in range(3):
            val = row_pct[i, j]
            color = "white" if val > 55 else "black"
            weight = "bold" if i == j else "normal"
            ax2.text(j, i, f"{val:.1f}%", ha="center", va="center",
                     color=color, fontsize=13, fontweight=weight)

    plt.colorbar(im2, ax=ax2, fraction=0.046, pad=0.04, format="%.0f%%")

    fig.suptitle("Stacking Classifier — Hold-out Confusion Matrix",
                 fontsize=14, fontweight="bold", y=1.02)
    plt.tight_layout()
    out_path = os.path.join(OUT, "methodology_confusion_matrix.png")
    plt.savefig(out_path, dpi=200, bbox_inches="tight")
    plt.close(fig)
    print(f"  saved {out_path}")


def plot_top5_feature_importance():
    csv_path = os.path.join(OUT, "stacking_feature_importance.csv")
    if not os.path.exists(csv_path):
        print(f"  SKIP: {csv_path} not found")
        return

    df = pd.read_csv(csv_path).head(5).iloc[::-1].reset_index(drop=True)

    fig, ax = plt.subplots(figsize=(10, 5.5))
    y = np.arange(len(df))
    height = 0.27

    bars_rf   = ax.barh(y + height, df["rf_importance"],   height,
                        label="Random Forest",   color="#4C72B0", edgecolor="white")
    bars_xgb  = ax.barh(y,           df["xgb_importance"],  height,
                        label="XGBoost (Boosting)", color="#DD8452", edgecolor="white")
    bars_mean = ax.barh(y - height, df["mean_importance"], height,
                        label="Mean (combined)", color="#55A868", edgecolor="white")

    for bars in (bars_rf, bars_xgb, bars_mean):
        for bar in bars:
            w = bar.get_width()
            ax.annotate(f"{w:.3f}",
                        xy=(w, bar.get_y() + bar.get_height() / 2),
                        xytext=(4, 0), textcoords="offset points",
                        va="center", fontsize=9)

    ax.set_yticks(y)
    ax.set_yticklabels(df["feature"], fontsize=11)
    ax.set_xlabel("Importance", fontsize=11)
    ax.set_title("Top 5 Most Important Features — Stacking Ensemble Base Learners",
                 fontsize=13, fontweight="bold", pad=14)
    ax.grid(axis="x", linestyle="--", alpha=0.4)
    ax.set_axisbelow(True)
    ax.legend(loc="lower right", frameon=True, fontsize=10)
    ax.set_xlim(0, max(df["rf_importance"].max(),
                       df["xgb_importance"].max(),
                       df["mean_importance"].max()) * 1.18)

    plt.tight_layout()
    out_path = os.path.join(OUT, "methodology_top5_features.png")
    plt.savefig(out_path, dpi=200, bbox_inches="tight")
    plt.close(fig)
    print(f"  saved {out_path}")


def plot_accuracy_summary():
    fig, ax = plt.subplots(figsize=(10, 4.5))
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 5)
    ax.axis("off")

    ax.text(5, 4.4, "Hold-out Test Set Performance",
            ha="center", fontsize=15, fontweight="bold")
    ax.text(5, 3.85, "(909 families, 20% held out, random_state = 42)",
            ha="center", fontsize=10, style="italic", color="#666")

    # Three metric cards
    cards = [
        ("Overall Accuracy", f"{ACCURACY:.2%}", "#4C72B0",
         f"vs {CHANCE_BASELINE:.0%} chance baseline"),
        ("Macro F1", "0.4498", "#55A868",
         "unweighted across 3 classes"),
        ("Weighted F1", "0.5062", "#DD8452",
         "weighted by class support"),
    ]

    card_w, card_h = 2.6, 2.0
    y0 = 1.0
    spacing = 0.4
    total_w = len(cards) * card_w + (len(cards) - 1) * spacing
    x0 = (10 - total_w) / 2

    for i, (label, value, color, sub) in enumerate(cards):
        x = x0 + i * (card_w + spacing)
        box = FancyBboxPatch(
            (x, y0), card_w, card_h,
            boxstyle="round,pad=0.04,rounding_size=0.12",
            linewidth=2, edgecolor=color, facecolor=color + "22",
        )
        ax.add_patch(box)
        ax.text(x + card_w / 2, y0 + card_h - 0.42, label,
                ha="center", fontsize=11, fontweight="bold", color="#222")
        ax.text(x + card_w / 2, y0 + card_h - 1.15, value,
                ha="center", fontsize=24, fontweight="bold", color=color)
        ax.text(x + card_w / 2, y0 + 0.28, sub,
                ha="center", fontsize=9, style="italic", color="#555")

    out_path = os.path.join(OUT, "methodology_accuracy_summary.png")
    plt.savefig(out_path, dpi=200, bbox_inches="tight")
    plt.close(fig)
    print(f"  saved {out_path}")


def main():
    os.makedirs(OUT, exist_ok=True)
    print("Generating methodology visualizations...")
    plot_accuracy_summary()
    plot_per_class_metrics()
    plot_confusion_matrix_panels()
    plot_top5_feature_importance()
    print("Done.")


if __name__ == "__main__":
    main()
