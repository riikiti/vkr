import numpy as np


def generate_random_image(size: int) -> bytes:
    """
    Изображение с повторяющимися паттернами (горизонтальные полосы RGB).
    Средняя энтропия ~5.0-6.0 бит/байт — типична для реальных изображений
    с большими однотонными областями.
    """
    row_size = 48  # ширина строки в байтах (16 пикселей RGB)
    num_colors = 8
    rng = np.random.default_rng(seed=12345)
    colors = rng.integers(0, 256, size=num_colors, dtype=np.uint8)

    rows = []
    i = 0
    total = 0
    while total < size:
        color = colors[i % num_colors]
        # Добавляем небольшой шум к каждому пикселю (±5) для реалистичности
        noise = rng.integers(-5, 6, size=row_size, dtype=np.int16)
        row = np.clip(int(color) + noise, 0, 255).astype(np.uint8)
        rows.append(row.tobytes())
        total += row_size
        i += 1

    return b"".join(rows)[:size]


def generate_gradient_image(size: int) -> bytes:
    """
    Градиентное изображение — плавный переход значений.
    Энтропия ~7.0 бит/байт (все значения встречаются, но предсказуемо).
    """
    data = np.zeros(size, dtype=np.uint8)
    for i in range(size):
        data[i] = i % 256
    # Добавляем лёгкий шум
    rng = np.random.default_rng(seed=99)
    noise = rng.integers(-2, 3, size=size, dtype=np.int16)
    data = np.clip(data.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    return bytes(data)
