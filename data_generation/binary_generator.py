import numpy as np


def generate_binary_sequence(size: int, pattern_len: int = 8) -> bytes:
    """
    Повторяющийся бинарный паттерн. Низкая энтропия.
    pattern_len: длина базового паттерна в байтах.
    """
    pattern = np.random.randint(0, 256, size=pattern_len, dtype=np.uint8)
    repeats = (size // pattern_len) + 1
    data = np.tile(pattern, repeats)[:size]
    return bytes(data)


def generate_zero_data(size: int) -> bytes:
    """Нулевые данные. Минимальная энтропия = 0."""
    return b"\x00" * size


def generate_incremental_data(size: int) -> bytes:
    """Счётчик 0..255 по кругу. Равномерное, но не случайное."""
    data = bytes([i % 256 for i in range(size)])
    return data
