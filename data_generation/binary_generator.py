import numpy as np


def generate_binary_sequence(size: int, pattern_len: int = 4) -> bytes:
    """
    Повторяющийся бинарный паттерн. Очень низкая энтропия (~2.0 бит/байт).
    pattern_len: длина базового паттерна в байтах.
    Используется фиксированный seed для воспроизводимости.
    """
    rng = np.random.default_rng(seed=42)
    pattern = rng.integers(0, 256, size=pattern_len, dtype=np.uint8)
    repeats = (size // pattern_len) + 1
    data = np.tile(pattern, repeats)[:size]
    return bytes(data)


def generate_zero_data(size: int) -> bytes:
    """
    Нулевые данные. Минимальная энтропия = 0.
    Экстремальный случай: показывает, как алгоритм обрабатывает
    полностью предсказуемый вход.
    """
    return b"\x00" * size


def generate_incremental_data(size: int) -> bytes:
    """
    Счётчик 0..255 по кругу. Равномерное распределение, но полностью
    предсказуемая последовательность (автокорреляция = 1).
    Энтропия = 8.0 бит/байт, но нулевая случайность.
    """
    data = bytes([i % 256 for i in range(size)])
    return data
