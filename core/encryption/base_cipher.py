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

    def encrypt_timed(self, data: bytes, key: bytes) -> tuple[bytes, float]:
        """Шифрование с замером времени. Возвращает (шифртекст, секунды)."""
        start = time.perf_counter()
        ciphertext = self.encrypt(data, key)
        elapsed = time.perf_counter() - start
        return ciphertext, elapsed
