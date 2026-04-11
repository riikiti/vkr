import struct
from Crypto.Util.Padding import pad, unpad
from Crypto.Random import get_random_bytes
from .base_cipher import BaseCipher


# S-блоки ГОСТ Р 34.12-2015 «Магма» (id-GostR3411-94-CryptoProParamSet)
_SBOX = [
    [10, 4, 5, 6, 8, 1, 3, 7, 13, 12, 14, 0, 9, 2, 11, 15],
    [5, 15, 4, 0, 2, 13, 11, 9, 1, 7, 6, 3, 12, 14, 10, 8],
    [7, 15, 12, 14, 9, 4, 1, 0, 3, 11, 5, 2, 6, 10, 8, 13],
    [4, 10, 7, 12, 0, 15, 2, 8, 14, 1, 6, 5, 13, 11, 9, 3],
    [7, 6, 4, 11, 9, 12, 2, 10, 1, 8, 0, 14, 15, 13, 3, 5],
    [7, 6, 2, 4, 13, 9, 15, 0, 10, 1, 5, 11, 8, 14, 12, 3],
    [13, 14, 4, 1, 7, 0, 5, 10, 3, 12, 8, 15, 6, 2, 9, 11],
    [1, 3, 10, 9, 5, 11, 4, 15, 8, 6, 7, 14, 13, 0, 2, 12],
]


def _gost_round(block_l, block_r, key_part):
    """Один раунд сети Фейстеля ГОСТ Р 34.12-2015 (Магма)."""
    # Сложение с ключом по модулю 2^32
    temp = (block_r + key_part) & 0xFFFFFFFF

    # S-блоки подстановки
    result = 0
    for i in range(8):
        nibble = (temp >> (4 * i)) & 0xF
        result |= _SBOX[i][nibble] << (4 * i)

    # Циклический сдвиг влево на 11 бит
    result = ((result << 11) | (result >> 21)) & 0xFFFFFFFF

    # XOR с левой половиной
    return block_r, block_l ^ result


def _gost_encrypt_block(block, key_parts):
    """Зашифровать один 64-битный блок."""
    block_l = struct.unpack('<I', block[:4])[0]
    block_r = struct.unpack('<I', block[4:])[0]

    # 24 раунда прямого порядка ключей (3 × 8)
    for round_num in range(24):
        block_l, block_r = _gost_round(block_l, block_r, key_parts[round_num % 8])

    # 8 раундов обратного порядка ключей
    for round_num in range(8):
        block_l, block_r = _gost_round(block_l, block_r, key_parts[7 - round_num])

    # Без финального свопа
    return struct.pack('<I', block_r) + struct.pack('<I', block_l)


def _gost_decrypt_block(block, key_parts):
    """Расшифровать один 64-битный блок."""
    block_l = struct.unpack('<I', block[:4])[0]
    block_r = struct.unpack('<I', block[4:])[0]

    # 8 раундов прямого порядка
    for round_num in range(8):
        block_l, block_r = _gost_round(block_l, block_r, key_parts[round_num])

    # 24 раунда обратного порядка (3 × 8)
    for round_num in range(24):
        block_l, block_r = _gost_round(block_l, block_r, key_parts[7 - (round_num % 8)])

    return struct.pack('<I', block_r) + struct.pack('<I', block_l)


def _parse_key(key):
    """Разбить 256-битный ключ на 8 × 32-битных подключей."""
    return struct.unpack('<8I', key)


def _xor_bytes(a, b):
    return bytes(x ^ y for x, y in zip(a, b))


class GostCipher(BaseCipher):
    """ГОСТ Р 34.12-2015 (Магма) в режиме CBC с PKCS7-паддингом."""

    KEY_SIZE = 32   # 256 бит
    BLOCK_SIZE = 8  # 64 бита

    def __init__(self):
        self._cached_key_bytes = None
        self._cached_key_parts = None

    def _get_key_parts(self, key: bytes):
        if self._cached_key_bytes != key:
            self._cached_key_bytes = key
            self._cached_key_parts = _parse_key(key)
        return self._cached_key_parts

    @property
    def name(self) -> str:
        return "GOST"

    def generate_key(self) -> bytes:
        return get_random_bytes(self.KEY_SIZE)

    def encrypt(self, data: bytes, key: bytes) -> bytes:
        iv = get_random_bytes(self.BLOCK_SIZE)
        padded = pad(data, self.BLOCK_SIZE)
        key_parts = self._get_key_parts(key)

        ct = bytearray()
        prev = iv
        for i in range(0, len(padded), self.BLOCK_SIZE):
            block = padded[i:i + self.BLOCK_SIZE]
            xored = _xor_bytes(block, prev)
            encrypted = _gost_encrypt_block(xored, key_parts)
            ct.extend(encrypted)
            prev = encrypted

        return iv + bytes(ct)

    def encrypt_deterministic(self, data: bytes, key: bytes, iv: bytes = None) -> bytes:
        if iv is None:
            iv = b'\x00' * self.BLOCK_SIZE
        else:
            iv = iv[:self.BLOCK_SIZE].ljust(self.BLOCK_SIZE, b'\x00')
        padded = pad(data, self.BLOCK_SIZE)
        key_parts = self._get_key_parts(key)

        ct = bytearray()
        prev = iv
        for i in range(0, len(padded), self.BLOCK_SIZE):
            block = padded[i:i + self.BLOCK_SIZE]
            xored = _xor_bytes(block, prev)
            encrypted = _gost_encrypt_block(xored, key_parts)
            ct.extend(encrypted)
            prev = encrypted

        return bytes(ct)

    def decrypt(self, data: bytes, key: bytes) -> bytes:
        iv = data[:self.BLOCK_SIZE]
        ct = data[self.BLOCK_SIZE:]
        key_parts = self._get_key_parts(key)

        pt = bytearray()
        prev = iv
        for i in range(0, len(ct), self.BLOCK_SIZE):
            block = ct[i:i + self.BLOCK_SIZE]
            decrypted = _gost_decrypt_block(block, key_parts)
            pt.extend(_xor_bytes(decrypted, prev))
            prev = block

        return unpad(bytes(pt), self.BLOCK_SIZE)
