import pandas as pd
import json
import os
from config import RESULTS_DIR


def merge_experiment_results(results: dict[str, pd.DataFrame]) -> pd.DataFrame:
    """
    Объединяет результаты нескольких экспериментов в единую таблицу.
    """
    merged = None
    for exp_name, df in results.items():
        df = df.copy()
        keys = ["algorithm", "data_type", "data_size"]
        metric_cols = [c for c in df.columns if c not in keys]
        df = df.rename(columns={c: f"{exp_name[:4]}_{c}" for c in metric_cols})

        if merged is None:
            merged = df
        else:
            on_keys = [k for k in keys if k in df.columns and k in merged.columns]
            merged = merged.merge(df, on=on_keys, how="outer")

    return merged


def load_results_from_csv(results_dir: str = RESULTS_DIR) -> dict[str, pd.DataFrame]:
    """
    Загружает последние результаты экспериментов из CSV-файлов.
    """
    results = {}
    if not os.path.exists(results_dir):
        return results
    for filename in sorted(os.listdir(results_dir)):
        if filename.endswith(".csv"):
            exp_name = filename.split("_")[0]
            path = os.path.join(results_dir, filename)
            results[exp_name] = pd.read_csv(path)
    return results


def save_results_json(results: dict[str, pd.DataFrame], path: str) -> None:
    """
    Сохраняет результаты в JSON-формате.
    """
    json_data = {name: df.to_dict(orient="records") for name, df in results.items()}
    with open(path, "w", encoding="utf-8") as f:
        json.dump(json_data, f, ensure_ascii=False, indent=2)
