from abc import ABC, abstractmethod
import pandas as pd
import time


class BaseExperiment(ABC):
    """Шаблон эксперимента."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Название эксперимента."""

    @abstractmethod
    def run(self) -> pd.DataFrame:
        """
        Выполняет эксперимент и возвращает результаты как DataFrame.
        Колонки: algorithm, data_type, data_size + метрики.
        """

    def run_timed(self) -> tuple[pd.DataFrame, float]:
        """Запуск с замером времени."""
        start = time.perf_counter()
        result = self.run()
        elapsed = time.perf_counter() - start
        print(f"[{self.name}] Завершён за {elapsed:.2f}с")
        return result, elapsed
