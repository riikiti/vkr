import plotly.graph_objects as go
from plotly.subplots import make_subplots
import pandas as pd


def create_comparison_dashboard(
    entropy_df: pd.DataFrame,
    avalanche_df: pd.DataFrame,
) -> go.Figure:
    """
    Сводный дашборд 2x2: энтропия, лавинный эффект, KL-дивергенция, корреляция.
    """
    fig = make_subplots(
        rows=2, cols=2,
        subplot_titles=[
            "Энтропия шифртекста",
            "Лавинный эффект",
            "KL-дивергенция",
            "Корреляция открытый<->шифр",
        ],
        vertical_spacing=0.15,
    )

    algo_order = entropy_df.groupby("algorithm")["shannon_entropy_cipher"] \
        .mean().sort_values(ascending=False).index.tolist()

    # 1. Энтропия
    ent = entropy_df.groupby("algorithm")["shannon_entropy_cipher"].mean().reindex(algo_order)
    fig.add_trace(go.Bar(x=ent.index, y=ent.values, name="Энтропия",
                         marker_color="#2196F3"), row=1, col=1)

    # 2. Лавинный эффект
    aval = avalanche_df.groupby("algorithm")["avalanche_mean"].mean().reindex(algo_order)
    fig.add_trace(go.Bar(x=aval.index, y=aval.values, name="Avalanche",
                         marker_color="#4CAF50"), row=1, col=2)

    # 3. KL-дивергенция
    if "kl_divergence" in entropy_df.columns:
        kl = entropy_df.groupby("algorithm")["kl_divergence"].mean().reindex(algo_order)
        fig.add_trace(go.Bar(x=kl.index, y=kl.values, name="KL div",
                             marker_color="#FF5722"), row=2, col=1)

    # 4. Корреляция
    if "corr_pearson" in entropy_df.columns:
        corr = entropy_df.groupby("algorithm")["corr_pearson"].mean().abs().reindex(algo_order)
        fig.add_trace(go.Bar(x=corr.index, y=corr.values, name="|Pearson|",
                             marker_color="#9C27B0"), row=2, col=2)

    fig.update_layout(
        title_text="Сравнительный анализ криптостойкости алгоритмов",
        showlegend=False,
        height=700,
    )
    return fig
