import pandas as pd
import json
import numpy as np
from datetime import datetime
from .metrics_calculator import calculate_algorithm_summary, rank_algorithms

DATA_TYPE_NAMES = {
    "text": "Естественный текст",
    "binary": "Бинарный паттерн",
    "random": "Случайные данные",
    "image": "Изображение",
    "zeros": "Нулевые данные",
    "structured": "JSON-структура",
    "incremental": "Счётчик",
}

REPORT_TEMPLATE = """# Исследование криптостойкости алгоритмов шифрования
# с применением энтропийного анализа

**Дата:** {date}
**Метод:** Энтропийный анализ, лавинный эффект, статистические тесты

---

## 1. Сводная таблица энтропийных метрик (средние по всем экспериментам)

{entropy_table}

---

## 2. Энтропия по типам входных данных

{entropy_by_type_table}

---

## 3. Результаты теста лавинного эффекта

{avalanche_table}

---

## 4. Рейтинг алгоритмов по криптостойкости

{ranking_table}

---

## 5. Выводы

{conclusions}
"""


def generate_markdown_report(
    entropy_df: pd.DataFrame,
    avalanche_df: pd.DataFrame,
    output_path: str,
) -> str:
    """
    Генерирует Markdown-отчёт и сохраняет в файл.
    """
    entropy_summary = calculate_algorithm_summary(entropy_df)
    ranking = rank_algorithms(entropy_summary)

    # Summary table
    display_cols = ["algorithm"]
    for col in ["shannon_entropy_plain", "shannon_entropy_cipher", "kl_divergence",
                 "conditional_entropy", "mutual_information", "entropy_score"]:
        if col in entropy_summary.columns:
            display_cols.append(col)
    entropy_table = entropy_summary[display_cols].to_markdown(index=False, floatfmt=".4f")

    # Entropy by data type
    entropy_by_type_lines = []
    if "data_type" in entropy_df.columns:
        grouped = entropy_df.groupby(["algorithm", "data_type"]).agg({
            "shannon_entropy_plain": "mean",
            "shannon_entropy_cipher": "mean",
            "kl_divergence": "mean",
        }).reset_index()
        grouped["data_type_label"] = grouped["data_type"].map(
            lambda x: DATA_TYPE_NAMES.get(x, x)
        )
        grouped["entropy_gain"] = grouped["shannon_entropy_cipher"] - grouped["shannon_entropy_plain"]
        display = grouped[["algorithm", "data_type_label", "shannon_entropy_plain",
                           "shannon_entropy_cipher", "entropy_gain", "kl_divergence"]]
        display = display.rename(columns={
            "algorithm": "Алгоритм",
            "data_type_label": "Тип данных",
            "shannon_entropy_plain": "H(откр.)",
            "shannon_entropy_cipher": "H(шифр.)",
            "entropy_gain": "Прирост",
            "kl_divergence": "KL-дивергенция",
        })
        entropy_by_type_table = display.to_markdown(index=False, floatfmt=".4f")
    else:
        entropy_by_type_table = "Данные по типам не доступны."

    # Avalanche table
    aval_grouped = avalanche_df.groupby("algorithm").agg({
        "avalanche_mean": "mean",
        "avalanche_std": "mean",
        "is_good": lambda x: "Да" if all(x) else "Нет",
    }).reset_index()
    aval_grouped["deviation"] = (aval_grouped["avalanche_mean"] - 0.5).abs()
    aval_grouped = aval_grouped.rename(columns={
        "algorithm": "Алгоритм",
        "avalanche_mean": "Среднее",
        "avalanche_std": "Ст. откл.",
        "deviation": "Отклонение",
        "is_good": "Норма",
    })
    avalanche_table = aval_grouped.to_markdown(index=False, floatfmt=".4f")

    # Ranking table
    rank_cols = ["rank", "algorithm", "total_score"]
    score_cols = [c for c in ranking.columns if c.startswith("score_")]
    ranking_table = ranking[rank_cols + score_cols].to_markdown(
        index=False, floatfmt=".4f"
    )

    # Conclusions
    best_algo = ranking.iloc[0]["algorithm"]
    best_score = ranking.iloc[0]["total_score"]
    worst_algo = ranking.iloc[-1]["algorithm"]
    worst_score = ranking.iloc[-1]["total_score"]

    conclusions = (
        f"1. Наиболее криптостойким по совокупности метрик является **{best_algo}** "
        f"(комплексная оценка: {best_score:.4f}).\n\n"
        f"2. Наименее криптостойким — **{worst_algo}** "
        f"(комплексная оценка: {worst_score:.4f}).\n\n"
        f"3. Все исследованные алгоритмы обеспечивают энтропию шифротекста, близкую "
        f"к теоретическому максимуму (8.0 бит/байт), независимо от энтропии входных данных.\n\n"
        f"4. Блочные шифры (AES, DES, 3DES, Blowfish, Twofish, RC6, ГОСТ) демонстрируют лучший лавинный эффект "
        f"благодаря многораундовым подстановкам. Потоковый шифр RC4 "
        f"выполняет XOR с ключевым потоком, что не создаёт лавинного эффекта при "
        f"изменении открытого текста.\n\n"
        f"5. DES и RC4 не рекомендуются к использованию в новых системах. "
        f"Для задач, требующих высокой криптостойкости, следует применять AES-256, Twofish, RC6 или ГОСТ Р 34.12-2015."
    )

    report = REPORT_TEMPLATE.format(
        date=datetime.now().strftime("%Y-%m-%d %H:%M"),
        entropy_table=entropy_table,
        entropy_by_type_table=entropy_by_type_table,
        avalanche_table=avalanche_table,
        ranking_table=ranking_table,
        conclusions=conclusions,
    )

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(report)

    return report


def generate_csv_report(df: pd.DataFrame, output_path: str) -> None:
    """Сохраняет итоговую таблицу метрик в CSV."""
    df.to_csv(output_path, index=False, encoding="utf-8")


def generate_json_report(df: pd.DataFrame, output_path: str) -> None:
    """Сохраняет результаты в JSON."""
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(df.to_dict(orient="records"), f, ensure_ascii=False, indent=2)
