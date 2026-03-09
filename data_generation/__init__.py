from .text_generator import generate_plain_text
from .binary_generator import generate_binary_sequence
from .random_generator import generate_random_data
from .image_generator import generate_random_image


def generate_data(data_type: str, size: int, **kwargs) -> bytes:
    """
    Фабричная функция. data_type: 'text' | 'binary' | 'random' | 'image'
    """
    generators = {
        "text": generate_plain_text,
        "binary": generate_binary_sequence,
        "random": generate_random_data,
        "image": generate_random_image,
    }
    if data_type not in generators:
        raise ValueError(f"Неизвестный тип данных: {data_type}. Доступные: {list(generators)}")
    return generators[data_type](size, **kwargs)
