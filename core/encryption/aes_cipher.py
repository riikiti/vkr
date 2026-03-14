from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad
from Crypto.Random import get_random_bytes
from .base_cipher import BaseCipher


class AESCipher(BaseCipher):
    """AES-256 в режиме CBC с PKCS7-паддингом."""

    KEY_SIZE = 32   # 256 бит
    BLOCK_SIZE = 16  # 128 бит

    @property
    def name(self) -> str:
        return "AES"

    def generate_key(self) -> bytes:
        return get_random_bytes(self.KEY_SIZE)

    def encrypt(self, data: bytes, key: bytes) -> bytes:
        iv = get_random_bytes(self.BLOCK_SIZE)
        cipher = AES.new(key, AES.MODE_CBC, iv)
        ct = cipher.encrypt(pad(data, self.BLOCK_SIZE))
        return iv + ct  # IV + шифртекст

    def encrypt_deterministic(self, data: bytes, key: bytes, iv: bytes = None) -> bytes:
        if iv is None:
            iv = b'\x00' * self.BLOCK_SIZE
        cipher = AES.new(key, AES.MODE_CBC, iv)
        ct = cipher.encrypt(pad(data, self.BLOCK_SIZE))
        return ct  # без IV — сравниваем только шифртекст

    def decrypt(self, data: bytes, key: bytes) -> bytes:
        iv = data[:self.BLOCK_SIZE]
        ct = data[self.BLOCK_SIZE:]
        cipher = AES.new(key, AES.MODE_CBC, iv)
        return unpad(cipher.decrypt(ct), self.BLOCK_SIZE)
