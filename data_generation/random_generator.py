import os
import numpy as np


def generate_random_data(size: int, use_os_random: bool = True) -> bytes:
    """
    Криптографически случайные данные.
    use_os_random=True: использует os.urandom() (CSPRNG)
    use_os_random=False: numpy random (для воспроизводимости)
    """
    if use_os_random:
        return os.urandom(size)
    else:
        rng = np.random.default_rng(seed=42)
        return bytes(rng.integers(0, 256, size=size, dtype=np.uint8))
