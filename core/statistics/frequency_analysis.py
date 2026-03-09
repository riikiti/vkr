import numpy as np
from scipy.stats import chisquare


def get_byte_frequencies(data: bytes) -> np.ndarray:
    """
    Возвращает массив длиной 256: количество вхождений каждого байта.
    """
    return np.bincount(np.frombuffer(data, dtype=np.uint8), minlength=256)


def get_byte_probabilities(data: bytes) -> np.ndarray:
    """
    Возвращает нормализованное распределение вероятностей (сумма = 1).
    """
    counts = get_byte_frequencies(data)
    return counts / len(data)


def chi_square_uniformity_test(data: bytes) -> dict:
    """
    Тест хи-квадрат на равномерность распределения байтов.

    Нулевая гипотеза H0: распределение равномерное.
    Если p-value > 0.05 — не отвергаем H0 (распределение близко к равномерному).
    """
    counts = get_byte_frequencies(data)
    expected = np.full(256, len(data) / 256)
    chi2, p_value = chisquare(counts, f_exp=expected)
    return {
        "chi2_stat": float(chi2),
        "p_value": float(p_value),
        "is_uniform": bool(p_value > 0.05),
    }


def frequency_deviation(data: bytes) -> float:
    """
    Среднее абсолютное отклонение частот от идеального равномерного распределения.
    Меньше — лучше.
    """
    probs = get_byte_probabilities(data)
    ideal = 1 / 256
    return float(np.mean(np.abs(probs - ideal)))
