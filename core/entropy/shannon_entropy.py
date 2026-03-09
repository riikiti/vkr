import numpy as np


def calculate_shannon_entropy(data: bytes) -> float:
    """
    Вычисляет энтропию Шеннона для байтовых данных.
    Возвращает значение в битах (основание 2).
    """
    if not data:
        return 0.0

    # Подсчёт частот байтов (0–255)
    counts = np.bincount(np.frombuffer(data, dtype=np.uint8), minlength=256)

    # Вероятности (только ненулевые)
    total = len(data)
    probabilities = counts[counts > 0] / total

    # H = -Σ p·log₂(p)
    entropy = -np.sum(probabilities * np.log2(probabilities))
    return float(entropy)


def calculate_entropy_per_block(data: bytes, block_size: int = 256) -> list[float]:
    """
    Вычисляет энтропию для каждого блока данных.
    Позволяет анализировать однородность шифртекста.
    """
    entropies = []
    for i in range(0, len(data), block_size):
        block = data[i:i + block_size]
        if len(block) >= 16:  # минимальный размер для значимого анализа
            entropies.append(calculate_shannon_entropy(block))
    return entropies


def entropy_score(entropy: float, max_entropy: float = 8.0) -> float:
    """
    Нормализованная оценка [0, 1]. 1.0 = идеальная случайность.
    """
    return entropy / max_entropy
