import numpy as np


def generate_random_image(size: int) -> bytes:
    """
    Пиксельные данные случайного изображения (RGB).
    Высокая энтропия исходника ~7–8 бит/байт.
    """
    pixels = np.random.randint(0, 256, size=size, dtype=np.uint8)
    return bytes(pixels)


def generate_pattern_image(size: int) -> bytes:
    """
    Изображение с повторяющимися паттернами (горизонтальные полосы).
    Средняя энтропия ~5–6 бит/байт.
    """
    row_size = 64  # ширина строки в байтах
    num_colors = 4
    colors = np.random.randint(0, 256, size=num_colors, dtype=np.uint8)
    result = b""
    i = 0
    while len(result) < size:
        color = colors[i % num_colors]
        result += bytes([color] * row_size)
        i += 1
    return result[:size]
