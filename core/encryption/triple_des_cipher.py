from Crypto.Cipher import DES3
from Crypto.Util.Padding import pad, unpad
from Crypto.Random import get_random_bytes
from .base_cipher import BaseCipher


class TripleDESCipher(BaseCipher):
    """3DES (Triple DES) в режиме CBC. Усиленная версия DES с тройным шифрованием."""

    KEY_SIZE = 24   # 192 бита (3 × 56 активных бит)
    BLOCK_SIZE = 8

    @property
    def name(self) -> str:
        return "3DES"

    def generate_key(self) -> bytes:
        while True:
            key = get_random_bytes(self.KEY_SIZE)
            try:
                DES3.adjust_key_parity(key)
                return key
            except ValueError:
                continue

    def encrypt(self, data: bytes, key: bytes) -> bytes:
        iv = get_random_bytes(self.BLOCK_SIZE)
        cipher = DES3.new(key, DES3.MODE_CBC, iv)
        ct = cipher.encrypt(pad(data, self.BLOCK_SIZE))
        return iv + ct

    def encrypt_deterministic(self, data: bytes, key: bytes, iv: bytes = None) -> bytes:
        if iv is None:
            iv = b'\x00' * self.BLOCK_SIZE
        cipher = DES3.new(key, DES3.MODE_CBC, iv)
        ct = cipher.encrypt(pad(data, self.BLOCK_SIZE))
        return ct

    def decrypt(self, data: bytes, key: bytes) -> bytes:
        iv = data[:self.BLOCK_SIZE]
        ct = data[self.BLOCK_SIZE:]
        cipher = DES3.new(key, DES3.MODE_CBC, iv)
        return unpad(cipher.decrypt(ct), self.BLOCK_SIZE)
