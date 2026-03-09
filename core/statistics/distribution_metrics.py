import numpy as np
from scipy.stats import skew, kurtosis

# Эталонные значения для равномерного распределения [0, 255]
UNIFORM_MEAN = 127.5
UNIFORM_VAR = 5461.25       # (256^2 - 1) / 12
UNIFORM_STD = 73.9          # sqrt(UNIFORM_VAR)
UNIFORM_SKEWNESS = 0.0      # симметричное
UNIFORM_KURTOSIS = -1.2     # эксцесс равномерного распределения


def calculate_distribution_metrics(data: bytes) -> dict:
    """
    Вычисляет статистические моменты распределения байтов.
    """
    arr = np.frombuffer(data, dtype=np.uint8).astype(float)

    return {
        "mean": float(np.mean(arr)),
        "variance": float(np.var(arr)),
        "std": float(np.std(arr)),
        "skewness": float(skew(arr)),
        "kurtosis": float(kurtosis(arr)),  # excess kurtosis (Fisher)
    }


def compare_to_uniform(metrics: dict) -> dict:
    """
    Сравнивает метрики с эталонными значениями равномерного распределения.
    Возвращает отклонения (абсолютные).
    """
    return {
        "mean_deviation": abs(metrics["mean"] - UNIFORM_MEAN),
        "variance_deviation": abs(metrics["variance"] - UNIFORM_VAR),
        "skewness_deviation": abs(metrics["skewness"] - UNIFORM_SKEWNESS),
        "kurtosis_deviation": abs(metrics["kurtosis"] - UNIFORM_KURTOSIS),
    }


def calculate_max_index_of_coincidence(data: bytes) -> float:
    """
    Индекс совпадений. Для случайных данных ≈ 0.00390 (1/256).
    Для английского текста ≈ 0.065.
    """
    counts = np.bincount(np.frombuffer(data, dtype=np.uint8), minlength=256)
    n = len(data)
    if n < 2:
        return 0.0
    ic = np.sum(counts * (counts - 1)) / (n * (n - 1))
    return float(ic)
