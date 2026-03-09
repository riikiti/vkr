import pandas as pd
from config import ALGORITHMS, DATA_SIZES, DATA_TYPES
from core.encryption import get_cipher
from core.entropy import analyze_all
from data_generation import generate_data
from .base_experiment import BaseExperiment


class EntropyExperiment(BaseExperiment):
    """
    Вычисляет энтропийные метрики для всех комбинаций:
    алгоритм x тип данных x размер данных.
    """

    @property
    def name(self) -> str:
        return "EntropyExperiment"

    def run(self) -> pd.DataFrame:
        records = []

        for algo_name in ALGORITHMS:
            cipher = get_cipher(algo_name)
            key = cipher.generate_key()

            for data_type in DATA_TYPES:
                for size in DATA_SIZES:
                    plaintext = generate_data(data_type, size)
                    ciphertext, enc_time = cipher.encrypt_timed(plaintext, key)
                    metrics = analyze_all(plaintext, ciphertext)

                    records.append({
                        "algorithm": algo_name,
                        "data_type": data_type,
                        "data_size": size,
                        "encrypt_time_sec": enc_time,
                        **metrics,
                    })

        return pd.DataFrame(records)
