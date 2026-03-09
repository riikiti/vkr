import matplotlib.pyplot as plt
import plotly.express as px
import plotly.graph_objects as go
import pandas as pd


def plot_entropy_by_algorithm(df: pd.DataFrame, save_path: str = None):
    """
    Столбчатая диаграмма: энтропия шифртекста по алгоритмам.
    """
    summary = df.groupby("algorithm")["shannon_entropy_cipher"].mean().reset_index()
    summary = summary.sort_values("shannon_entropy_cipher", ascending=False)

    fig, ax = plt.subplots(figsize=(10, 6))
    bars = ax.bar(
        summary["algorithm"],
        summary["shannon_entropy_cipher"],
        color=["#2196F3" if v > 7.5 else "#FF5722" for v in summary["shannon_entropy_cipher"]],
        edgecolor="black",
        alpha=0.85,
    )
    ax.axhline(y=8.0, color="green", linestyle="--", linewidth=1.5, label="Максимум (8 бит)")
    ax.axhline(y=7.5, color="orange", linestyle=":", linewidth=1.5, label="Порог качества (7.5)")

    ax.set_xlabel("Алгоритм шифрования", fontsize=12)
    ax.set_ylabel("Энтропия Шеннона (бит/байт)", fontsize=12)
    ax.set_title("Сравнение энтропии шифртекста по алгоритмам", fontsize=14)
    ax.set_ylim(0, 8.5)
    ax.legend()

    for bar, val in zip(bars, summary["shannon_entropy_cipher"]):
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.05,
                f"{val:.3f}", ha="center", va="bottom", fontsize=10)

    plt.tight_layout()
    if save_path:
        plt.savefig(save_path, dpi=150)
    return fig


def plot_entropy_vs_data_size(df: pd.DataFrame, save_path: str = None):
    """
    Линейный график: энтропия vs размер данных.
    """
    fig, ax = plt.subplots(figsize=(11, 6))
    summary = df.groupby(["algorithm", "data_size"])["shannon_entropy_cipher"].mean().reset_index()

    for algo in summary["algorithm"].unique():
        algo_df = summary[summary["algorithm"] == algo]
        ax.plot(algo_df["data_size"], algo_df["shannon_entropy_cipher"],
                marker="o", label=algo, linewidth=2)

    ax.set_xscale("log")
    ax.set_xlabel("Размер данных (байт, log-шкала)", fontsize=12)
    ax.set_ylabel("Энтропия Шеннона (бит/байт)", fontsize=12)
    ax.set_title("Зависимость энтропии шифртекста от размера входных данных", fontsize=14)
    ax.legend(title="Алгоритм")
    ax.grid(True, alpha=0.3)
    ax.axhline(y=8.0, color="gray", linestyle="--", alpha=0.5)

    plt.tight_layout()
    if save_path:
        plt.savefig(save_path, dpi=150)
    return fig


def plot_entropy_heatmap(df: pd.DataFrame) -> go.Figure:
    """
    Тепловая карта (plotly): алгоритм x тип данных -> энтропия.
    """
    pivot = df.groupby(["algorithm", "data_type"])["shannon_entropy_cipher"].mean().unstack()
    fig = px.imshow(
        pivot,
        color_continuous_scale="RdYlGn",
        zmin=6.0, zmax=8.0,
        title="Энтропия шифртекста: алгоритм x тип данных",
        labels={"color": "Энтропия (бит/байт)"},
        text_auto=".3f",
    )
    return fig


def plot_entropy_interactive(df: pd.DataFrame) -> go.Figure:
    """Интерактивный столбчатый график для Streamlit."""
    summary = df.groupby("algorithm")["shannon_entropy_cipher"].mean().reset_index()
    fig = px.bar(
        summary, x="algorithm", y="shannon_entropy_cipher",
        title="Энтропия шифртекста по алгоритмам",
        labels={"shannon_entropy_cipher": "Энтропия (бит/байт)", "algorithm": "Алгоритм"},
        color="shannon_entropy_cipher",
        color_continuous_scale="Blues",
        range_y=[0, 8.5],
    )
    fig.add_hline(y=8.0, line_dash="dash", line_color="green",
                  annotation_text="Максимум (8 бит)")
    return fig
