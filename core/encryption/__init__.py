from .aes_cipher import AESCipher
from .des_cipher import DESCipher
from .blowfish_cipher import BlowfishCipher
from .twofish_cipher import TwofishCipher
from .rc4_cipher import RC4Cipher
from .rc6_cipher import RC6Cipher
from .triple_des_cipher import TripleDESCipher
from .gost_cipher import GostCipher
from .base_cipher import BaseCipher

CIPHER_REGISTRY = {
    "AES": AESCipher,
    "DES": DESCipher,
    "BLOWFISH": BlowfishCipher,
    "TWOFISH": TwofishCipher,
    "RC4": RC4Cipher,
    "RC6": RC6Cipher,
    "3DES": TripleDESCipher,
    "GOST": GostCipher,
}


def get_cipher(name: str) -> BaseCipher:
    name = name.upper()
    if name not in CIPHER_REGISTRY:
        raise ValueError(f"Неизвестный алгоритм: {name}. Доступные: {list(CIPHER_REGISTRY)}")
    return CIPHER_REGISTRY[name]()
