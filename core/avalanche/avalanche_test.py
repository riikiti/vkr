import numpy as np
from config import AVALANCHE_TESTS, AVALANCHE_IDEAL


def flip_bit(data: bytes, bit_pos: int) -> bytes:
    """
    Инвертирует один бит в байтовой строке.
    bit_pos: позиция бита (0 = старший бит первого байта).
    """
    byte_idx = bit_pos // 8
    bit_idx = 7 - (bit_pos % 8)   # MSB first
    data_list = bytearray(data)
    data_list[byte_idx] ^= (1 << bit_idx)
    return bytes(data_list)


def hamming_distance_bytes(a: bytes, b: bytes) -> int:
    """
    Расстояние Хэмминга между двумя байтовыми строками (число различающихся бит).
    """
    min_len = min(len(a), len(b))
    a_arr = np.frombuffer(a[:min_len], dtype=np.uint8)
    b_arr = np.frombuffer(b[:min_len], dtype=np.uint8)
    xor = np.bitwise_xor(a_arr, b_arr)
    return int(np.unpackbits(xor).sum())


def avalanche_coefficient(cipher_1: bytes, cipher_2: bytes) -> float:
    """
    Коэффициент лавинного эффекта для одной пары шифртекстов.
    """
    total_bits = min(len(cipher_1), len(cipher_2)) * 8
    if total_bits == 0:
        return 0.0
    changed = hamming_distance_bytes(cipher_1, cipher_2)
    return changed / total_bits


def run_avalanche_test(
    cipher,
    data: bytes,
    key: bytes,
    n_tests: int = AVALANCHE_TESTS,
    random_seed: int = 42
) -> dict:
    """
    Запускает полный тест лавинного эффекта для одного алгоритма.
    """
    rng = np.random.default_rng(seed=random_seed)
    total_bits = len(data) * 8

    if total_bits == 0:
        raise ValueError("Данные не могут быть пустыми")

    # Базовый шифртекст
    ciphertext_base = cipher.encrypt(data, key)
    coefficients = []

    for _ in range(n_tests):
        bit_pos = int(rng.integers(0, total_bits))
        data_flipped = flip_bit(data, bit_pos)
        ciphertext_flipped = cipher.encrypt(data_flipped, key)
        coef = avalanche_coefficient(ciphertext_base, ciphertext_flipped)
        coefficients.append(coef)

    coefficients = np.array(coefficients)

    return {
        "algorithm": cipher.name,
        "n_tests": n_tests,
        "mean": float(np.mean(coefficients)),
        "std": float(np.std(coefficients)),
        "min_val": float(np.min(coefficients)),
        "max_val": float(np.max(coefficients)),
        "coefficients": coefficients.tolist(),
        "is_good": bool(abs(np.mean(coefficients) - AVALANCHE_IDEAL) < 0.1),
    }


def run_avalanche_test_per_bit(
    cipher,
    data: bytes,
    key: bytes,
    sample_bits: int = 64
) -> dict:
    """
    Тест лавинного эффекта для каждого из sample_bits позиций.
    Позволяет построить тепловую карту.
    """
    ciphertext_base = cipher.encrypt(data, key)
    total_bits = min(len(data) * 8, sample_bits)
    positions = list(range(total_bits))
    coefficients = []

    for pos in positions:
        data_flipped = flip_bit(data, pos)
        ciphertext_flipped = cipher.encrypt(data_flipped, key)
        coef = avalanche_coefficient(ciphertext_base, ciphertext_flipped)
        coefficients.append(coef)

    return {
        "bit_positions": positions,
        "coefficients": coefficients,
    }


def avalanche_vs_data_size(cipher, sizes: list[int]) -> list[dict]:
    """
    Запускает тест для разных размеров входных данных.
    """
    from data_generation.random_generator import generate_random_data
    results = []
    for size in sizes:
        data = generate_random_data(size)
        key = cipher.generate_key()
        result = run_avalanche_test(cipher, data, key)
        result["data_size"] = size
        results.append(result)
    return results
