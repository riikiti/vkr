from abc import ABC, abstractmethod
import time


class BaseCipher(ABC):
    """Абстрактный интерфейс для всех алгоритмов шифрования."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Название алгоритма (для отчётов)."""

    @abstractmethod
    def generate_key(self) -> bytes:
        """Генерация ключа подходящей длины."""

    @abstractmethod
    def encrypt(self, data: bytes, key: bytes) -> bytes:
        """Шифрование. Возвращает шифртекст."""

    @abstractmethod
    def decrypt(self, data: bytes, key: bytes) -> bytes:
        """Дешифрование. Возвращает открытый текст."""

    def encrypt_deterministic(self, data: bytes, key: bytes, iv: bytes = None) -> bytes:
        """
        Шифрование с фиксированным IV/nonce для корректного лавинного теста.
        Гарантирует, что при одинаковых (data, key, iv) результат одинаков.
        По умолчанию вызывает encrypt() — подклассы переопределяют.
        """
        return self.encrypt(data, key)

    def encrypt_timed(self, data: bytes, key: bytes) -> tuple[bytes, float]:
        """Шифрование с замером времени. Возвращает (шифртекст, секунды)."""
        start = time.perf_counter()
        ciphertext = self.encrypt(data, key)
        elapsed = time.perf_counter() - start
        return ciphertext, elapsed
