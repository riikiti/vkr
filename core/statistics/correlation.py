import numpy as np
from scipy.stats import pearsonr, spearmanr


def calculate_autocorrelation(data: bytes, lag: int = 1) -> float:
    """
    Автокорреляция байтов с задержкой lag.
    Для идеального шифра: ≈ 0.
    """
    arr = np.frombuffer(data, dtype=np.uint8).astype(float)
    x = arr[:-lag]
    y = arr[lag:]
    if len(x) < 2:
        return 0.0
    corr, _ = pearsonr(x, y)
    return float(corr)


def calculate_plaintext_ciphertext_correlation(
    plaintext: bytes,
    ciphertext: bytes
) -> dict:
    """
    Корреляция Пирсона и Спирмена между открытым и зашифрованным текстом.
    Для идеального шифра оба значения ≈ 0.
    """
    min_len = min(len(plaintext), len(ciphertext))
    if min_len < 2:
        return {"pearson": 0.0, "spearman": 0.0}

    x = np.frombuffer(plaintext[:min_len], dtype=np.uint8).astype(float)
    y = np.frombuffer(ciphertext[:min_len], dtype=np.uint8).astype(float)

    pearson_r, _ = pearsonr(x, y)
    spearman_r, _ = spearmanr(x, y)

    return {
        "pearson": float(pearson_r),
        "spearman": float(spearman_r),
    }


def calculate_autocorrelation_profile(data: bytes, max_lag: int = 10) -> list[float]:
    """
    Профиль автокорреляции для lag = 1..max_lag.
    """
    return [calculate_autocorrelation(data, lag=i) for i in range(1, max_lag + 1)]
