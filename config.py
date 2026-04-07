# config.py

# Размеры тестовых данных (в байтах)
DATA_SIZES = [
    1024,       # 1 KB
    10240,      # 10 KB
    102400,     # 100 KB
    1048576,    # 1 MB
]

# Список исследуемых алгоритмов
ALGORITHMS = [
    "AES",
    "DES",
    "BLOWFISH",
    "TWOFISH",
    "RC4",
    "RC6",
    "3DES",
    "GOST",
]

# Типы входных данных для генерации
# Подобраны так, чтобы покрыть весь спектр энтропии исходных данных:
DATA_TYPES = [
    "text",         # Естественный язык (рус.) — энтропия ~4.0-4.5 бит/байт
    "binary",       # Повторяющийся паттерн — энтропия ~2.0 бит/байт
    "random",       # Криптографически случайные — энтропия ~8.0 бит/байт
    "image",        # Паттерновое изображение — энтропия ~5.0-6.0 бит/байт
    "zeros",        # Нулевые данные — энтропия = 0 бит/байт
    "structured",   # JSON-структура — энтропия ~3.5-4.0 бит/байт
    "incremental",  # Счётчик 0..255 — энтропия = 8.0, но предсказуемый
]

# Параметры энтропийного анализа
ENTROPY_BASE = 2          # Основание логарифма (бит)
MAX_ENTROPY = 8.0         # Максимальная энтропия для байтовых данных

# Параметры лавинного теста
AVALANCHE_TESTS = 100     # Количество итераций теста
AVALANCHE_IDEAL = 0.5     # Идеальный коэффициент (50 %)
AVALANCHE_TOLERANCE = 0.3 # Допустимое отклонение (учитывает CBC-режим блочных шифров)

# Пути к директориям
DATA_DIR = "data"
RAW_DIR = "data/raw"
GENERATED_DIR = "data/generated"
ENCRYPTED_DIR = "data/encrypted"
RESULTS_DIR = "data/results"

# Параметры отчётов
REPORT_FORMATS = ["csv", "json", "markdown"]
RESULTS_FILE = "data/results/experiment_results.csv"
REPORT_FILE = "data/results/research_report.md"
