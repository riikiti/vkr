import pandas as pd
import numpy as np


def calculate_algorithm_summary(df: pd.DataFrame) -> pd.DataFrame:
    """
    Агрегирует метрики по алгоритму (среднее по всем размерам и типам данных).
    """
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    summary = df.groupby("algorithm")[numeric_cols].mean().reset_index()
    return summary


def rank_algorithms(summary_df: pd.DataFrame) -> pd.DataFrame:
    """
    Ранжирует алгоритмы по криптостойкости на основе сводных метрик.
    """
    df = summary_df.copy()

    scores = pd.DataFrame()
    scores["algorithm"] = df["algorithm"]

    if "entropy_score" in df.columns:
        scores["score_entropy"] = df["entropy_score"].clip(0, 1)

    if "kl_divergence" in df.columns:
        max_kl = df["kl_divergence"].max() + 1e-10
        scores["score_kl"] = 1 - (df["kl_divergence"] / max_kl)

    if "avalanche_mean" in df.columns:
        scores["score_avalanche"] = 1 - (df["avalanche_mean"] - 0.5).abs() * 2

    if "corr_pearson" in df.columns:
        scores["score_corr"] = 1 - df["corr_pearson"].abs()

    score_cols = [c for c in scores.columns if c.startswith("score_")]
    scores["total_score"] = scores[score_cols].mean(axis=1)
    scores = scores.sort_values("total_score", ascending=False).reset_index(drop=True)
    scores["rank"] = range(1, len(scores) + 1)

    return scores


def compare_block_vs_stream(df: pd.DataFrame) -> dict:
    """
    Сравнивает блочные и потоковые шифры по метрикам.
    """
    block_algos = ["AES", "DES", "BLOWFISH"]
    stream_algos = ["RC4", "CHACHA20"]

    block_df = df[df["algorithm"].isin(block_algos)]
    stream_df = df[df["algorithm"].isin(stream_algos)]

    metrics = ["shannon_entropy_cipher", "kl_divergence", "avalanche_mean"]
    result = {}
    for m in metrics:
        if m in df.columns:
            result[m] = {
                "block_mean": float(block_df[m].mean()),
                "stream_mean": float(stream_df[m].mean()),
            }
    return result
