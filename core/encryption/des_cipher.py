from Crypto.Cipher import DES
from Crypto.Util.Padding import pad, unpad
from Crypto.Random import get_random_bytes
from .base_cipher import BaseCipher


class DESCipher(BaseCipher):
    """DES в режиме CBC. Устаревший алгоритм, включён для сравнения."""

    KEY_SIZE = 8    # 56 активных бит (+ 8 бит паритета)
    BLOCK_SIZE = 8

    @property
    def name(self) -> str:
        return "DES"

    def generate_key(self) -> bytes:
        return get_random_bytes(self.KEY_SIZE)

    def encrypt(self, data: bytes, key: bytes) -> bytes:
        iv = get_random_bytes(self.BLOCK_SIZE)
        cipher = DES.new(key, DES.MODE_CBC, iv)
        ct = cipher.encrypt(pad(data, self.BLOCK_SIZE))
        return iv + ct

    def encrypt_deterministic(self, data: bytes, key: bytes, iv: bytes = None) -> bytes:
        if iv is None:
            iv = b'\x00' * self.BLOCK_SIZE
        cipher = DES.new(key, DES.MODE_CBC, iv)
        ct = cipher.encrypt(pad(data, self.BLOCK_SIZE))
        return ct

    def decrypt(self, data: bytes, key: bytes) -> bytes:
        iv = data[:self.BLOCK_SIZE]
        ct = data[self.BLOCK_SIZE:]
        cipher = DES.new(key, DES.MODE_CBC, iv)
        return unpad(cipher.decrypt(ct), self.BLOCK_SIZE)
