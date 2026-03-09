from .shannon_entropy import calculate_shannon_entropy
from .conditional_entropy import calculate_conditional_entropy


def calculate_mutual_information(plaintext: bytes, ciphertext: bytes) -> float:
    """
    Взаимная информация I(X;Y) = H(Y) - H(Y|X).
    Меньше — лучше (меньше зависимость).
    """
    h_cipher = calculate_shannon_entropy(ciphertext)
    h_cond = calculate_conditional_entropy(plaintext, ciphertext)
    mi = h_cipher - h_cond
    return max(0.0, float(mi))


def calculate_normalized_mi(plaintext: bytes, ciphertext: bytes) -> float:
    """
    Нормализованная взаимная информация NMI ∈ [0, 1].
    NMI = I(X;Y) / H(Y)
    """
    h_cipher = calculate_shannon_entropy(ciphertext)
    if h_cipher == 0:
        return 0.0
    mi = calculate_mutual_information(plaintext, ciphertext)
    return mi / h_cipher
