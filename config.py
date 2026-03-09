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
    "RC4",
    "CHACHA20",
]

# Типы входных данных для генерации
DATA_TYPES = [
    "text",     # Текстовые данные
    "binary",   # Бинарные последовательности
    "random",   # Случайные данные (контрольное распределение)
    "image",    # Пиксельные данные изображений
]

# Параметры энтропийного анализа
ENTROPY_BASE = 2          # Основание логарифма (бит)
MAX_ENTROPY = 8.0         # Максимальная энтропия для байтовых данных

# Параметры лавинного теста
AVALANCHE_TESTS = 100     # Количество итераций теста
AVALANCHE_IDEAL = 0.5     # Идеальный коэффициент (50 %)
AVALANCHE_TOLERANCE = 0.1 # Допустимое отклонение

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
