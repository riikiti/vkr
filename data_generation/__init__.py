from .text_generator import generate_plain_text, generate_structured_text
from .binary_generator import generate_binary_sequence, generate_zero_data, generate_incremental_data
from .random_generator import generate_random_data
from .image_generator import generate_random_image


def generate_data(data_type: str, size: int, **kwargs) -> bytes:
    """
    Фабричная функция генерации тестовых данных.

    Типы данных подобраны для покрытия всего спектра энтропии:
      - zeros:        0 бит/байт (минимум)
      - binary:       ~2.0 бит/байт
      - structured:   ~3.5-4.0 бит/байт
      - text:         ~4.0-4.5 бит/байт
      - image:        ~5.0-6.0 бит/байт
      - incremental:  8.0 бит/байт (равномерное, но предсказуемое)
      - random:       ~8.0 бит/байт (максимум, эталон)
    """
    generators = {
        "text": generate_plain_text,
        "binary": generate_binary_sequence,
        "random": generate_random_data,
        "image": generate_random_image,
        "zeros": generate_zero_data,
        "structured": generate_structured_text,
        "incremental": generate_incremental_data,
    }
    if data_type not in generators:
        raise ValueError(f"Неизвестный тип данных: {data_type}. Доступные: {list(generators)}")
    return generators[data_type](size, **kwargs)
