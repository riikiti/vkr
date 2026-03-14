import random
import string


def generate_plain_text(size: int) -> bytes:
    """
    Имитация естественного языка (русского) через повтор частых слов.
    Энтропия ~4.0-4.5 бит/байт — характерна для текста на естественном языке.
    Позволяет оценить, насколько хорошо алгоритм маскирует структуру текста.
    """
    words = [
        "данные", "система", "анализ", "метод", "результат",
        "алгоритм", "процесс", "значение", "функция", "модель",
        "задача", "решение", "параметр", "элемент", "структура",
        "информация", "программа", "объект", "операция", "массив",
        "в", "и", "на", "с", "по", "для", "из", "от", "к", "не",
        "это", "что", "как", "при", "все", "его", "она", "они",
    ]
    result = []
    current_len = 0
    while current_len < size:
        word = random.choice(words)
        result.append(word)
        current_len += len(word.encode("utf-8")) + 1  # +1 для пробела
    text = " ".join(result)
    return text.encode("utf-8")[:size]


def generate_natural_language_text(size: int) -> bytes:
    """
    Имитация английского естественного языка через повтор слов.
    Высокая повторяемость — низкая энтропия исходника (~3.5-4.0 бит/байт).
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
    """
    Структурированные данные (JSON-подобный формат).
    Очень высокая повторяемость ключей — энтропия ~3.5-4.0 бит/байт.
    """
    template = '{"id": %d, "value": "%s", "flag": %s}\n'
    result = b""
    i = 0
    while len(result) < size:
        row = (template % (i, "data", "true")).encode()
        result += row
        i += 1
    return result[:size]


def generate_ascii_random_text(size: int) -> bytes:
    """Случайные ASCII-символы: буквы + цифры + пробелы. Энтропия ~6.0-6.5 бит/байт."""
    chars = string.ascii_letters + string.digits + " " * 10
    text = "".join(random.choices(chars, k=size))
    return text.encode("ascii")[:size]
