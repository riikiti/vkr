import matplotlib.pyplot as plt
import plotly.graph_objects as go
import pandas as pd
import numpy as np


def plot_avalanche_comparison(df: pd.DataFrame, save_path: str = None):
    """
    Диаграмма со столбцами и полосами погрешности: mean +/- std.
    """
    summary = df.groupby("algorithm").agg(
        mean=("avalanche_mean", "mean"),
        std=("avalanche_std", "mean"),
    ).reset_index()

    fig, ax = plt.subplots(figsize=(10, 6))
    x = range(len(summary))
    colors = ["#4CAF50" if abs(m - 0.5) < 0.1 else "#F44336"
              for m in summary["mean"]]

    ax.bar(x, summary["mean"], yerr=summary["std"], capsize=5,
           color=colors, alpha=0.8, edgecolor="black")
    ax.axhline(y=0.5, color="blue", linestyle="--", linewidth=2,
               label="Идеальный коэффициент (0.5)")
    ax.axhspan(0.4, 0.6, alpha=0.1, color="green", label="Допустимый диапазон")

    ax.set_xticks(x)
    ax.set_xticklabels(summary["algorithm"], fontsize=11)
    ax.set_xlabel("Алгоритм", fontsize=12)
    ax.set_ylabel("Коэффициент лавинного эффекта", fontsize=12)
    ax.set_title("Тест лавинного эффекта по алгоритмам", fontsize=14)
    ax.set_ylim(0, 1)
    ax.legend()

    plt.tight_layout()
    if save_path:
        plt.savefig(save_path, dpi=150)
    return fig


def plot_avalanche_distribution(coefficients: list[float], algo_name: str) -> go.Figure:
    """
    Гистограмма распределения коэффициентов лавинного эффекта (plotly).
    """
    fig = go.Figure()
    fig.add_trace(go.Histogram(
        x=coefficients, nbinsx=20, name=algo_name,
        marker_color="#2196F3", opacity=0.8,
    ))
    fig.add_vline(x=0.5, line_dash="dash", line_color="red",
                  annotation_text="Идеальный (0.5)")
    fig.update_layout(
        title=f"Распределение коэффициентов лавинного эффекта — {algo_name}",
        xaxis_title="Коэффициент лавинного эффекта",
        yaxis_title="Число итераций",
    )
    return fig
