import numpy as np


def calculate_conditional_entropy(
    plaintext: bytes,
    ciphertext: bytes,
    n_bins: int = 16
) -> float:
    """
    Вычисляет условную энтропию H(cipher | plain).
    Данные разбиваются на блоки n_bins для построения совместного распределения.
    """
    min_len = min(len(plaintext), len(ciphertext))
    if min_len == 0:
        return 0.0

    x = np.frombuffer(plaintext[:min_len], dtype=np.uint8).astype(np.int32)
    y = np.frombuffer(ciphertext[:min_len], dtype=np.uint8).astype(np.int32)

    # Квантизация в n_bins корзин
    x_bins = (x * n_bins // 256)
    y_bins = (y * n_bins // 256)

    # Совместное распределение p(x, y)
    joint_counts = np.zeros((n_bins, n_bins), dtype=np.float64)
    for xi, yi in zip(x_bins, y_bins):
        joint_counts[xi, yi] += 1

    joint_prob = joint_counts / min_len

    # Маргинальное распределение p(x)
    marginal_x = joint_prob.sum(axis=1)

    # H(Y|X) = -Σ p(x,y) * log2(p(y|x))
    h_cond = 0.0
    for i in range(n_bins):
        if marginal_x[i] == 0:
            continue
        for j in range(n_bins):
            if joint_prob[i, j] == 0:
                continue
            p_y_given_x = joint_prob[i, j] / marginal_x[i]
            h_cond -= joint_prob[i, j] * np.log2(p_y_given_x)

    return float(h_cond)
