from Crypto.Cipher import ARC4
from Crypto.Random import get_random_bytes
from .base_cipher import BaseCipher


class RC4Cipher(BaseCipher):
    """RC4 — потоковый шифр. Устаревший, включён для сравнения."""

    KEY_SIZE = 16   # 128 бит

    @property
    def name(self) -> str:
        return "RC4"

    def generate_key(self) -> bytes:
        return get_random_bytes(self.KEY_SIZE)

    def encrypt(self, data: bytes, key: bytes) -> bytes:
        cipher = ARC4.new(key)
        return cipher.encrypt(data)

    def encrypt_deterministic(self, data: bytes, key: bytes, iv: bytes = None) -> bytes:
        # RC4 — потоковый шифр без IV, уже детерминирован
        cipher = ARC4.new(key)
        return cipher.encrypt(data)

    def decrypt(self, data: bytes, key: bytes) -> bytes:
        cipher = ARC4.new(key)
        return cipher.decrypt(data)
