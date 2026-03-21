# UML-диаграммы для диссертации

**Статус:** ⬜ Создаются параллельно с главой 3

## Список необходимых диаграмм

### 1. Диаграмма развертывания (Deployment Diagram)
**Глава:** 3.2 (Архитектура системы)
**Содержание:**
- Узлы: Client Browser, Nginx (Frontend), Uvicorn (Backend)
- Docker-контейнеры: frontend, backend
- Протоколы: HTTP, REST API
- Порты: 80 (frontend), 8000 (backend)
- Артефакты: React App, FastAPI App

**Статус:** ⬜

### 2. Диаграмма компонентов (Component Diagram)
**Глава:** 3.4 (Низкоуровневое проектирование)
**Содержание:**
- Компоненты:
  - Frontend: App, Sidebar, Tabs (Overview, Entropy, Avalanche, Distribution, Comparison, Trace, Report)
  - Backend API: experiments, reports, config
  - Core: encryption, entropy, statistics, avalanche
  - Data Generation: text, binary, random, image generators
  - Analytics: metrics_calculator, research_report
- Зависимости между компонентами

**Статус:** ⬜

### 3. Диаграмма классов (Class Diagram) — КЛЮЧЕВАЯ
**Глава:** 3.4 (Низкоуровневое проектирование)
**Содержание:**
- Пакет core.encryption:
  - «abstract» BaseCipher: +encrypt(), +decrypt(), +generate_key(), +name, +encrypt_timed(), +encrypt_deterministic()
  - AESCipher, DESCipher, BlowfishCipher, RC4Cipher, TripleDESCipher, ChaCha20Cipher, GostCipher (наследуют BaseCipher)
  - CIPHER_REGISTRY: dict
  - get_cipher(name): BaseCipher
- Пакет core.entropy:
  - ShannonEntropy: +calculate(), +calculate_per_block(), +entropy_score()
  - KLDivergence: +calculate()
  - ConditionalEntropy: +calculate()
  - MutualInformation: +calculate(), +calculate_normalized()
  - analyze_all(plaintext, ciphertext): dict
- Пакет core.statistics:
  - FrequencyAnalysis: +get_byte_frequencies(), +chi_square_test(), +frequency_deviation()
  - Correlation: +autocorrelation(), +plaintext_ciphertext_correlation()
  - DistributionMetrics: +calculate(), +compare_to_uniform(), +index_of_coincidence()
- Пакет core.avalanche:
  - AvalancheTest: +run_test(), +run_per_bit(), +avalanche_vs_data_size()
- Пакет analytics:
  - MetricsCalculator: +calculate_summary(), +rank_algorithms()
  - ResearchReport: +generate_markdown(), +generate_csv(), +generate_json()

**Статус:** ⬜

### 4. Диаграмма последовательности (Sequence Diagram)
**Глава:** 3.4 (Низкоуровневое проектирование)
**Содержание:**
- Сценарий: Пользователь запускает эксперимент
- Участники: User, Frontend(App), Backend(API), DataGenerator, Cipher, EntropyAnalyzer, StatAnalyzer, AvalancheTest, MetricsCalculator
- Последовательность:
  1. User → Frontend: выбирает параметры, нажимает "Запустить"
  2. Frontend → Backend: POST /api/experiments/run
  3. Backend → DataGenerator: generate_data(type, size)
  4. Backend → Cipher: get_cipher(algo), generate_key(), encrypt_timed()
  5. Backend → EntropyAnalyzer: analyze_all(plain, cipher)
  6. Backend → StatAnalyzer: analyze_all_statistics(plain, cipher)
  7. Backend → AvalancheTest: run_avalanche_test(cipher, data, key, n)
  8. Backend → MetricsCalculator: calculate_summary(), rank_algorithms()
  9. Backend → Frontend: ExperimentResponse (JSON)
  10. Frontend → User: отображает результаты

**Статус:** ⬜

### 5. Диаграмма деятельности (Activity Diagram)
**Глава:** 3.4 (Низкоуровневое проектирование)
**Содержание:**
- Алгоритм комплексной оценки криптостойкости:
  - [Начало]
  - Выбор алгоритмов, типов данных, размеров
  - ═══ Parallel fork ═══
    - Ветка 1: Для каждой (algo, type, size):
      - Генерация данных
      - Шифрование
      - Расчет энтропийных метрик
      - Расчет статистических метрик
    - Ветка 2: Для каждой (algo, size):
      - Генерация данных
      - Лавинный тест (N итераций)
  - ═══ Parallel join ═══
  - Агрегация результатов (DataFrame)
  - Расчет сводных показателей
  - Ранжирование алгоритмов
  - Формирование ответа
  - [Конец]

**Статус:** ⬜

### 6. Диаграмма вариантов использования (Use Case Diagram) — опционально
**Глава:** 3.1 (Функциональные требования)
**Содержание:**
- Актор: Исследователь (пользователь)
- Use Cases:
  - Настроить параметры эксперимента
  - Запустить эксперимент
  - Просмотреть энтропийный анализ
  - Просмотреть лавинный эффект
  - Просмотреть статистический анализ
  - Сравнить алгоритмы
  - Просмотреть трассировку шифрования
  - Сгенерировать отчет
  - Скачать отчет

**Статус:** ⬜

## Инструменты создания
- draw.io (.drawio формат) — для векторных диаграмм
- Экспорт в PNG/SVG для вставки в документ

## Порядок создания
1. Диаграмма классов (самая информативная)
2. Диаграмма компонентов
3. Диаграмма последовательности
4. Диаграмма деятельности
5. Диаграмма развертывания
6. Диаграмма вариантов использования (если нужно)
