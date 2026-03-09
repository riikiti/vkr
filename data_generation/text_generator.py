import random
import string


def generate_plain_text(size: int) -> bytes:
    """ASCII-символы: буквы + цифры + пробелы."""
    chars = string.ascii_letters + string.digits + " " * 10  # пробел часто
    text = "".join(random.choices(chars, k=size))
    return text.encode("ascii")[:size]


def generate_natural_language_text(size: int) -> bytes:
    """
    Имитация естественного языка через повтор слов.
    Высокая повторяемость — низкая энтропия исходника.
    """
    words = [
        "the", "and", "is", "in", "it", "of", "to", "a",
        "that", "this", "with", "for", "on", "are", "be",
    ]
    result = []
    while len(" ".join(result).encode()) < size:
        result.append(random.choice(words))
    return " ".join(result).encode()[:size]


def generate_structured_text(size: int) -> bytes:
    """Структурированные данные (JSON-подобный формат)."""
    template = '{"id": %d, "value": "%s", "flag": %s}\n'
    result = b""
    i = 0
    while len(result) < size:
        row = (template % (i, "data", "true")).encode()
        result += row
        i += 1
    return result[:size]
