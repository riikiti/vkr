import struct
from Crypto.Util.Padding import pad, unpad
from Crypto.Random import get_random_bytes
from .base_cipher import BaseCipher


# RC6-32/20/b — финалист конкурса AES
# Параметры: w=32 (размер слова), r=20 (раунды), b=длина ключа в байтах

_W = 32
_R = 20
_MASK = 0xFFFFFFFF
_P32 = 0xB7E15163
_Q32 = 0x9E3779B9
_LGW = 5  # log2(32)


def _rotl(val, n):
    """Циклический сдвиг влево 32-битного слова."""
    n &= (_W - 1)
    return ((val << n) | (val >> (_W - n))) & _MASK


def _rotr(val, n):
    """Циклический сдвиг вправо 32-битного слова."""
    n &= (_W - 1)
    return ((val >> n) | (val << (_W - n))) & _MASK


def _key_schedule(key_bytes):
    """Расширение ключа RC6: генерация массива S[0..2r+3]."""
    b = len(key_bytes)
    # Разбиваем ключ на слова L[0..c-1]
    c = max(1, (b + 3) // 4)
    L = [0] * c
    for i in range(b - 1, -1, -1):
        L[i // 4] = (L[i // 4] << 8) + key_bytes[i]

    # Инициализация S
    t = 2 * _R + 4  # 44 для r=20
    S = [0] * t
    S[0] = _P32
    for i in range(1, t):
        S[i] = (S[i - 1] + _Q32) & _MASK

    # Перемешивание
    A = B = i = j = 0
    v = 3 * max(t, c)
    for _ in range(v):
        A = S[i] = _rotl((S[i] + A + B) & _MASK, 3)
        B = L[j] = _rotl((L[j] + A + B) & _MASK, (A + B) & _MASK)
        i = (i + 1) % t
        j = (j + 1) % c

    return S


def _rc6_encrypt_block(block, S):
    """Зашифровать один 128-битный блок RC6."""
    A, B, C, D = struct.unpack('<4I', block)

    B = (B + S[0]) & _MASK
    D = (D + S[1]) & _MASK

    for i in range(1, _R + 1):
        t = _rotl((B * ((2 * B + 1) & _MASK)) & _MASK, _LGW)
        u = _rotl((D * ((2 * D + 1) & _MASK)) & _MASK, _LGW)
        A = (_rotl(A ^ t, u) + S[2 * i]) & _MASK
        C = (_rotl(C ^ u, t) + S[2 * i + 1]) & _MASK
        A, B, C, D = B, C, D, A

    A = (A + S[2 * _R + 2]) & _MASK
    C = (C + S[2 * _R + 3]) & _MASK

    return struct.pack('<4I', A, B, C, D)


def _rc6_decrypt_block(block, S):
    """Расшифровать один 128-битный блок RC6."""
    A, B, C, D = struct.unpack('<4I', block)

    C = (C - S[2 * _R + 3]) & _MASK
    A = (A - S[2 * _R + 2]) & _MASK

    for i in range(_R, 0, -1):
        A, B, C, D = D, A, B, C
        u = _rotl((D * ((2 * D + 1) & _MASK)) & _MASK, _LGW)
        t = _rotl((B * ((2 * B + 1) & _MASK)) & _MASK, _LGW)
        C = _rotr((C - S[2 * i + 1]) & _MASK, t) ^ u
        A = _rotr((A - S[2 * i]) & _MASK, u) ^ t

    D = (D - S[1]) & _MASK
    B = (B - S[0]) & _MASK

    return struct.pack('<4I', A, B, C, D)


def _xor_bytes(a, b):
    return bytes(x ^ y for x, y in zip(a, b))


class RC6Cipher(BaseCipher):
    """RC6-32/20 — блочный шифр, финалист AES. Режим CBC с PKCS7."""

    KEY_SIZE = 32   # 256 бит
    BLOCK_SIZE = 16  # 128 бит

    @property
    def name(self) -> str:
        return "RC6"

    def generate_key(self) -> bytes:
        return get_random_bytes(self.KEY_SIZE)

    def encrypt(self, data: bytes, key: bytes) -> bytes:
        iv = get_random_bytes(self.BLOCK_SIZE)
        padded = pad(data, self.BLOCK_SIZE)
        S = _key_schedule(key)

        ct = bytearray()
        prev = iv
        for i in range(0, len(padded), self.BLOCK_SIZE):
            block = padded[i:i + self.BLOCK_SIZE]
            xored = _xor_bytes(block, prev)
            encrypted = _rc6_encrypt_block(xored, S)
            ct.extend(encrypted)
            prev = encrypted

        return iv + bytes(ct)

    def encrypt_deterministic(self, data: bytes, key: bytes, iv: bytes = None) -> bytes:
        if iv is None:
            iv = b'\x00' * self.BLOCK_SIZE
        else:
            iv = iv[:self.BLOCK_SIZE].ljust(self.BLOCK_SIZE, b'\x00')
        padded = pad(data, self.BLOCK_SIZE)
        S = _key_schedule(key)

        ct = bytearray()
        prev = iv
        for i in range(0, len(padded), self.BLOCK_SIZE):
            block = padded[i:i + self.BLOCK_SIZE]
            xored = _xor_bytes(block, prev)
            encrypted = _rc6_encrypt_block(xored, S)
            ct.extend(encrypted)
            prev = encrypted

        return bytes(ct)

    def decrypt(self, data: bytes, key: bytes) -> bytes:
        iv = data[:self.BLOCK_SIZE]
        ct = data[self.BLOCK_SIZE:]
        S = _key_schedule(key)

        pt = bytearray()
        prev = iv
        for i in range(0, len(ct), self.BLOCK_SIZE):
            block = ct[i:i + self.BLOCK_SIZE]
            decrypted = _rc6_decrypt_block(block, S)
            pt.extend(_xor_bytes(decrypted, prev))
            prev = block

        return unpad(bytes(pt), self.BLOCK_SIZE)
