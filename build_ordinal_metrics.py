"""
Ordinal evaluation of the income-level classifier.

The three income levels are ORDERED (Low < Middle < High), so beyond the
standard classification metrics we also report error-based metrics on the
ordinal tier codes (Low=0, Middle=1, High=2). This is what lets us report
MAE / MSE / RMSE — and a MASE-style scaled error — for a classifier whose
target is categorical.

All metrics are computed from the saved hold-out confusion matrix
(outputs/stacking_confusion_matrix.csv), so they match the classification
report exactly — no re-training, no extra randomness.

NOTE on MASE: true MASE is a time-series forecasting metric (it scales error
by a naive one-step-ahead forecast). This is a cross-sectional task, so we
report a MASE-STYLE ratio: model MAE / naive MAE, where the naive predictor
always guesses the majority class. A value > 1 means the model is worse than
that naive baseline in mean-absolute-tier-error terms.

NOTE on spacing: coding tiers 0/1/2 assumes equal spacing between levels.
The underlying income bands are not equal width (Low <= PHP 2,194;
Middle PHP 2,194-3,142; High > PHP 3,142), so these metrics treat a
Low->Middle gap as equal to a Middle->High gap — a standard ordinal-
evaluation simplification that should be stated in the writeup.
"""
import os

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from matplotlib.patches import FancyBboxPatch

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, "outputs")
CODE_TO_NAME = {0: "Low", 1: "Middle", 2: "High"}


def compute_ordinal_metrics(cm):
    """cm: square array, rows=actual, cols=predicted, order Low/Middle/High."""
    codes = np.arange(cm.shape[0])
    total = cm.sum()

    abs_err = sq_err = 0.0
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            err = codes[j] - codes[i]
            abs_err += cm[i, j] * abs(err)
            sq_err += cm[i, j] * err * err
    mae = abs_err / total
    mse = sq_err / total
    rmse = mse ** 0.5

    # classification context (kept so the figure is self-explanatory)
    accuracy = np.trace(cm) / total
    two_tier_errors = cm[0, -1] + cm[-1, 0]            # Low<->High only
    within_one_tier = (total - two_tier_errors) / total

    # MASE-style: scale by a naive predictor that always guesses the majority tier
    support = cm.sum(axis=1)                            # actual count per tier
    majority = int(np.argmax(support))
    naive_abs = sum(support[i] * abs(majority - codes[i]) for i in codes)
    mae_naive = naive_abs / total
    mase = mae / mae_naive if mae_naive else float("nan")

    return {
        "n": int(total),
        "accuracy": accuracy,
        "within_one_tier": within_one_tier,
        "mae": mae,
        "mse": mse,
        "rmse": rmse,
        "mae_naive": mae_naive,
        "mase": mase,
        "majority_tier": CODE_TO_NAME[majority],
    }


def write_report(m, path):
    lines = [
        "Ordinal evaluation - income-level classifier (hold-out, n={})".format(m["n"]),
        "Tiers coded Low=0, Middle=1, High=2 (ordered).",
        "",
        "Classification context:",
        "  Exact accuracy        : {:.4f}".format(m["accuracy"]),
        "  Within-one-tier acc.  : {:.4f}".format(m["within_one_tier"]),
        "",
        "Ordinal error metrics (lower is better):",
        "  MAE   : {:.4f}  (mean absolute tier error)".format(m["mae"]),
        "  MSE   : {:.4f}".format(m["mse"]),
        "  RMSE  : {:.4f}  (tiers)".format(m["rmse"]),
        "",
        "MASE-style (model MAE / naive MAE):",
        "  naive  = always predict majority tier ({})".format(m["majority_tier"]),
        "  naive MAE : {:.4f}".format(m["mae_naive"]),
        "  MASE      : {:.4f}   (>1 = worse than naive)".format(m["mase"]),
        "",
        "NOTES:",
        "  - MASE is natively a time-series metric; this is a cross-sectional",
        "    adaptation (scaled vs a majority-class baseline).",
        "  - Tiers assumed equally spaced; income bands are not equal width",
        "    (Low <= PHP 2,194; Middle PHP 2,194-3,142; High > PHP 3,142).",
    ]
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print("  saved", path)


def plot_ordinal_card(m, path):
    fig, ax = plt.subplots(figsize=(10, 4.8))
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 5)
    ax.axis("off")

    ax.text(5, 4.55, "Ordinal Evaluation - Income Levels as Ordered Tiers",
            ha="center", fontsize=14, fontweight="bold")
    ax.text(5, 4.0,
            f"Hold-out test set (n = {m['n']}), tiers coded Low=0 / Middle=1 / High=2",
            ha="center", fontsize=10, style="italic", color="#666")

    cards = [
        ("MAE",   f"{m['mae']:.3f}",  "#4C72B0", "mean abs. tier error"),
        ("MSE",   f"{m['mse']:.3f}",  "#C44E52", "mean squared error"),
        ("RMSE",  f"{m['rmse']:.3f}", "#55A868", "root mean sq. error"),
        ("MASE*", f"{m['mase']:.3f}", "#DD8452", "vs majority baseline"),
    ]
    card_w, card_h, spacing, y0 = 2.0, 1.9, 0.3, 1.15
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
                ha="center", fontsize=12, fontweight="bold", color="#222")
        ax.text(x + card_w / 2, y0 + card_h - 1.05, value,
                ha="center", fontsize=22, fontweight="bold", color=color)
        ax.text(x + card_w / 2, y0 + 0.26, sub,
                ha="center", fontsize=8.5, style="italic", color="#555")

    ax.text(5, 0.5,
            "*MASE-style: model MAE / naive(majority-class) MAE; >1 = worse than naive. "
            "MASE is natively a time-series metric (cross-sectional adaptation here).",
            ha="center", fontsize=8, color="#777")

    plt.savefig(path, dpi=200, bbox_inches="tight")
    plt.close(fig)
    print("  saved", path)


def main():
    cm_path = os.path.join(OUT, "stacking_confusion_matrix.csv")
    if not os.path.exists(cm_path):
        raise SystemExit(f"Missing {cm_path}; run build_stacking_model.py first.")
    cm = pd.read_csv(cm_path, index_col=0).to_numpy()

    print("Computing ordinal metrics from", cm_path)
    m = compute_ordinal_metrics(cm)
    for k, v in m.items():
        print(f"  {k}: {round(v, 4) if isinstance(v, float) else v}")

    write_report(m, os.path.join(OUT, "stacking_ordinal_metrics.txt"))
    plot_ordinal_card(m, os.path.join(OUT, "methodology_ordinal_metrics.png"))
    print("Done.")


if __name__ == "__main__":
    main()
