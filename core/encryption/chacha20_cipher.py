from Crypto.Cipher import ChaCha20
from Crypto.Random import get_random_bytes
from .base_cipher import BaseCipher


class ChaCha20Cipher(BaseCipher):
    """ChaCha20 — современный потоковый шифр."""

    KEY_SIZE = 32   # 256 бит
    NONCE_SIZE = 12  # 96 бит (RFC 7539)

    @property
    def name(self) -> str:
        return "CHACHA20"

    def generate_key(self) -> bytes:
        return get_random_bytes(self.KEY_SIZE)

    def encrypt(self, data: bytes, key: bytes) -> bytes:
        nonce = get_random_bytes(self.NONCE_SIZE)
        cipher = ChaCha20.new(key=key, nonce=nonce)
        ct = cipher.encrypt(data)
        return nonce + ct   # nonce + шифртекст

    def encrypt_deterministic(self, data: bytes, key: bytes, iv: bytes = None) -> bytes:
        if iv is None:
            iv = b'\x00' * self.NONCE_SIZE
        else:
            iv = iv[:self.NONCE_SIZE].ljust(self.NONCE_SIZE, b'\x00')
        cipher = ChaCha20.new(key=key, nonce=iv)
        return cipher.encrypt(data)

    def decrypt(self, data: bytes, key: bytes) -> bytes:
        nonce = data[:self.NONCE_SIZE]
        ct = data[self.NONCE_SIZE:]
        cipher = ChaCha20.new(key=key, nonce=nonce)
        return cipher.decrypt(ct)
