import matplotlib.pyplot as plt
import plotly.graph_objects as go
import numpy as np


def plot_byte_histogram(data: bytes, title: str = "Распределение байтов",
                        save_path: str = None):
    """
    Гистограмма частот байтов (0-255).
    """
    counts = np.bincount(np.frombuffer(data, dtype=np.uint8), minlength=256)
    ideal = len(data) / 256

    fig, ax = plt.subplots(figsize=(14, 5))
    ax.bar(range(256), counts, color="#42A5F5", alpha=0.7, width=1)
    ax.axhline(y=ideal, color="red", linestyle="--", linewidth=1.5,
               label=f"Идеальное равномерное ({ideal:.0f})")

    ax.set_xlabel("Значение байта (0-255)", fontsize=11)
    ax.set_ylabel("Количество вхождений", fontsize=11)
    ax.set_title(title, fontsize=13)
    ax.legend()
    ax.set_xlim(0, 255)

    plt.tight_layout()
    if save_path:
        plt.savefig(save_path, dpi=150)
    return fig


def plot_byte_histogram_comparison(data_dict: dict[str, bytes]) -> go.Figure:
    """
    Сравнительная гистограмма байтов для нескольких алгоритмов (plotly).
    """
    fig = go.Figure()
    counts_arr = np.arange(256)

    for algo_name, data in data_dict.items():
        counts = np.bincount(np.frombuffer(data, dtype=np.uint8), minlength=256)
        probs = counts / len(data)
        fig.add_trace(go.Bar(x=counts_arr, y=probs, name=algo_name, opacity=0.7))

    fig.add_hline(y=1/256, line_dash="dash", line_color="red",
                  annotation_text="Идеальное равномерное (1/256)")
    fig.update_layout(
        title="Сравнение распределения байтов шифртекста",
        xaxis_title="Значение байта",
        yaxis_title="Вероятность",
        barmode="overlay",
    )
    return fig
