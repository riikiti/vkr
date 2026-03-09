import os
import pandas as pd
from datetime import datetime
from config import RESULTS_DIR
from .entropy_experiment import EntropyExperiment
from .avalanche_experiment import AvalancheExperiment
from .distribution_experiment import DistributionExperiment


def run_all_experiments(save_results: bool = True) -> dict[str, pd.DataFrame]:
    """
    Запускает все эксперименты последовательно.
    Возвращает словарь {имя_эксперимента: DataFrame}.
    """
    os.makedirs(RESULTS_DIR, exist_ok=True)

    experiments = [
        EntropyExperiment(),
        AvalancheExperiment(),
        DistributionExperiment(),
    ]

    all_results = {}

    for exp in experiments:
        print(f"\n=== Запуск: {exp.name} ===")
        df, elapsed = exp.run_timed()
        all_results[exp.name] = df

        if save_results:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{exp.name}_{timestamp}.csv"
            path = os.path.join(RESULTS_DIR, filename)
            df.to_csv(path, index=False)
            print(f"  Результаты сохранены: {path}")

    return all_results


def run_single_experiment(experiment_name: str) -> pd.DataFrame:
    """
    Запуск одного эксперимента по имени.
    Используется из интерфейса Streamlit.
    """
    registry = {
        "entropy": EntropyExperiment,
        "avalanche": AvalancheExperiment,
        "distribution": DistributionExperiment,
    }
    if experiment_name not in registry:
        raise ValueError(f"Эксперимент '{experiment_name}' не найден")
    exp = registry[experiment_name]()
    df, _ = exp.run_timed()
    return df
