import warnings
import numpy as np
from scipy.stats import pearsonr, spearmanr


def _safe_pearson(x, y):
    """Pearson correlation, возвращает 0.0 при постоянном массиве."""
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        try:
            r, _ = pearsonr(x, y)
            return 0.0 if np.isnan(r) else float(r)
        except Exception:
            return 0.0


def _safe_spearman(x, y):
    """Spearman correlation, возвращает 0.0 при постоянном массиве."""
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        try:
            r, _ = spearmanr(x, y)
            return 0.0 if np.isnan(r) else float(r)
        except Exception:
            return 0.0


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
    return _safe_pearson(x, y)


def calculate_plaintext_ciphertext_correlation(
    plaintext: bytes,
    ciphertext: bytes
) -> dict:
    """
    Корреляция Пирсона и Спирмена между открытым и зашифрованным текстом.
    Для идеального шифра оба значения ≈ 0.
    При постоянных данных (напр. все нули) возвращает 0.0.
    """
    min_len = min(len(plaintext), len(ciphertext))
    if min_len < 2:
        return {"pearson": 0.0, "spearman": 0.0}

    x = np.frombuffer(plaintext[:min_len], dtype=np.uint8).astype(float)
    y = np.frombuffer(ciphertext[:min_len], dtype=np.uint8).astype(float)

    return {
        "pearson": _safe_pearson(x, y),
        "spearman": _safe_spearman(x, y),
    }


def calculate_autocorrelation_profile(data: bytes, max_lag: int = 10) -> list[float]:
    """
    Профиль автокорреляции для lag = 1..max_lag.
    """
    return [calculate_autocorrelation(data, lag=i) for i in range(1, max_lag + 1)]
