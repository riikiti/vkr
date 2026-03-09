import numpy as np
from scipy.special import rel_entr


def calculate_kl_divergence(data: bytes) -> float:
    """
    Вычисляет KL-дивергенцию между распределением байтов данных
    и идеальным равномерным распределением (1/256 для каждого байта).
    """
    if not data:
        return 0.0

    counts = np.bincount(np.frombuffer(data, dtype=np.uint8), minlength=256)
    total = len(data)

    # Наблюдаемое распределение P
    p = counts / total

    # Равномерное распределение Q
    q = np.ones(256) / 256

    # Добавляем сглаживание Лапласа, чтобы избежать log(0)
    epsilon = 1e-10
    p_smooth = p + epsilon
    p_smooth /= p_smooth.sum()

    # D_KL(P || Q) через scipy
    kl = np.sum(rel_entr(p_smooth, q))
    return float(kl)


def calculate_kl_divergence_custom(p: np.ndarray, q: np.ndarray) -> float:
    """
    Дивергенция между двумя произвольными распределениями.
    p, q: массивы вероятностей, sum = 1.
    """
    epsilon = 1e-10
    p = p + epsilon
    q = q + epsilon
    p /= p.sum()
    q /= q.sum()
    return float(np.sum(p * np.log2(p / q)))
