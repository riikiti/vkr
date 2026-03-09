import pandas as pd
from config import ALGORITHMS, DATA_SIZES, DATA_TYPES
from core.encryption import get_cipher
from core.statistics import analyze_all_statistics
from data_generation import generate_data
from .base_experiment import BaseExperiment


class DistributionExperiment(BaseExperiment):

    @property
    def name(self) -> str:
        return "DistributionExperiment"

    def run(self) -> pd.DataFrame:
        records = []

        for algo_name in ALGORITHMS:
            cipher = get_cipher(algo_name)
            key = cipher.generate_key()

            for data_type in DATA_TYPES:
                for size in DATA_SIZES:
                    plaintext = generate_data(data_type, size)
                    ciphertext = cipher.encrypt(plaintext, key)
                    stats = analyze_all_statistics(plaintext, ciphertext)

                    records.append({
                        "algorithm": algo_name,
                        "data_type": data_type,
                        "data_size": size,
                        **stats,
                    })

        return pd.DataFrame(records)
