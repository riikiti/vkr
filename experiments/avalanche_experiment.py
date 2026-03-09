import pandas as pd
from config import ALGORITHMS, DATA_SIZES, AVALANCHE_TESTS
from core.encryption import get_cipher
from core.avalanche.avalanche_test import run_avalanche_test
from data_generation.random_generator import generate_random_data
from .base_experiment import BaseExperiment


class AvalancheExperiment(BaseExperiment):

    @property
    def name(self) -> str:
        return "AvalancheExperiment"

    def run(self) -> pd.DataFrame:
        records = []

        for algo_name in ALGORITHMS:
            cipher = get_cipher(algo_name)
            key = cipher.generate_key()

            for size in DATA_SIZES:
                data = generate_random_data(size)
                result = run_avalanche_test(cipher, data, key, n_tests=AVALANCHE_TESTS)

                records.append({
                    "algorithm": algo_name,
                    "data_size": size,
                    "avalanche_mean": result["mean"],
                    "avalanche_std": result["std"],
                    "avalanche_min": result["min_val"],
                    "avalanche_max": result["max_val"],
                    "is_good": result["is_good"],
                })

        return pd.DataFrame(records)
