from .shannon_entropy import calculate_shannon_entropy, entropy_score
from .conditional_entropy import calculate_conditional_entropy
from .kl_divergence import calculate_kl_divergence
from .mutual_information import calculate_mutual_information, calculate_normalized_mi


def analyze_all(plaintext: bytes, ciphertext: bytes) -> dict:
    """
    Вычисляет все энтропийные метрики за один вызов.
    Возвращает словарь метрик.
    """
    return {
        "shannon_entropy_plain": calculate_shannon_entropy(plaintext),
        "shannon_entropy_cipher": calculate_shannon_entropy(ciphertext),
        "kl_divergence": calculate_kl_divergence(ciphertext),
        "conditional_entropy": calculate_conditional_entropy(plaintext, ciphertext),
        "mutual_information": calculate_mutual_information(plaintext, ciphertext),
        "entropy_score": entropy_score(calculate_shannon_entropy(ciphertext)),
    }
