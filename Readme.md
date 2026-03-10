# CryptoAnalyzer — Платформа исследования криптостойкости

Экспериментальная платформа для анализа криптографической стойкости алгоритмов шифрования с применением энтропийного анализа.

## Стек технологий

- **Backend:** Python 3.12 + FastAPI
- **Frontend:** React 19 + Vite + Tailwind CSS + Recharts
- **Контейнеризация:** Docker + Docker Compose

## Структура проекта

```
├── backend/                # FastAPI-приложение
│   ├── main.py             # Точка входа
│   ├── schemas.py          # Pydantic-модели
│   ├── api/
│   │   ├── experiments.py  # POST /api/experiments/run, GET /api/config
│   │   └── reports.py      # POST /api/reports/generate
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/               # React-приложение
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api/client.js
│   │   └── components/     # Sidebar + 6 табов
│   ├── nginx.conf
│   └── Dockerfile
├── core/                   # Ядро криптоанализа
│   ├── encryption/         # AES, DES, Blowfish, RC4, ChaCha20
│   ├── entropy/            # Шеннон, условная, KL, взаимная информация
│   ├── statistics/         # Частотный анализ, корреляция, распределение
│   └── avalanche/          # Тест лавинного эффекта
├── data_generation/        # Генерация тестовых данных
├── analytics/              # Ранжирование, отчёты
├── config.py               # Константы
├── docker-compose.yml
└── docs/                   # Документация (12 файлов)
```

## Запуск через Docker (рекомендуется)

### Требования

- [Docker](https://docs.docker.com/get-docker/) и [Docker Compose](https://docs.docker.com/compose/install/)

### Команды

```bash
# Клонировать репозиторий
git clone <url> && cd <project>

# Собрать и запустить
docker compose up --build

# Или в фоновом режиме
docker compose up --build -d
```

После запуска:

| Сервис   | URL                          |
|----------|------------------------------|
| Frontend | http://localhost:3000         |
| Backend  | http://localhost:8000         |
| API Docs | http://localhost:8000/docs    |

### Остановка

```bash
docker compose down
```

### Пересборка после изменений

```bash
docker compose up --build
```

## Запуск без Docker (для разработки)

### Требования

- Python 3.12+
- Node.js 22+

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend запустится на http://localhost:5173, бэкенд на http://localhost:8000.

## API

### GET /api/config

Возвращает доступные алгоритмы, типы данных и размеры.

### POST /api/experiments/run

Запуск экспериментов. Тело запроса:

```json
{
  "algorithms": ["AES", "DES", "BLOWFISH", "RC4", "CHACHA20"],
  "data_types": ["text", "random"],
  "data_sizes": [1024, 102400],
  "avalanche_iterations": 100
}
```

Возвращает результаты: энтропия, лавинный эффект, распределение, рейтинг.

### POST /api/reports/generate

Генерация отчёта в формате `markdown`, `csv` или `json`.

## Алгоритмы шифрования

| Алгоритм  | Тип     | Размер ключа | Режим |
|-----------|---------|-------------|-------|
| AES       | Блочный | 256 бит     | CBC   |
| DES       | Блочный | 56 бит      | CBC   |
| Blowfish  | Блочный | 128 бит     | CBC   |
| RC4       | Поточный| 128 бит     | —     |
| ChaCha20  | Поточный| 256 бит     | —     |

## Метрики анализа

| Метрика              | Идеал    | Интерпретация                      |
|----------------------|----------|------------------------------------|
| Энтропия Шеннона     | 8.0      | Максимальная случайность           |
| KL-дивергенция       | 0        | Распределение близко к равномерному |
| Взаимная информация  | 0        | Нет зависимости открытый/шифротекст |
| Лавинный коэффициент | 0.5      | Хорошее рассеивание бит            |
| Корреляция Пирсона   | 0        | Нет линейной зависимости           |
| Хи-квадрат p-value   | > 0.05   | Равномерное распределение байтов   |
