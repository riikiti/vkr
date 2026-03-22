# Генерация магистерской диссертации

## Тема
**Исследование криптостойкости алгоритмов шифрования с применением энтропийного анализа**

Автор: Курский Р.И., магистрант кафедры ИВТ БГТУ
Научный руководитель: Дергачев К.В.

## Структура

```
docs/vkr/
├── generate_dissertation.js    # Генератор .docx (Node.js, библиотека docx v9.6.1)
├── take_screenshots.js         # Захват скриншотов из CryptoAnalyzer (Puppeteer)
├── package.json                # Зависимости: docx, puppeteer
├── Диссертация.docx            # Текущая сгенерированная версия
├── versions/                   # Архив предыдущих версий (автоматически)
├── diagrams/                   # UML-диаграммы (.drawio + .png)
│   ├── class_diagram.png
│   ├── component_diagram.png
│   ├── sequence_diagram.png
│   ├── activity_diagram.png
│   └── deployment_diagram.png
├── screenshots/                # Скриншоты интерфейса CryptoAnalyzer
│   ├── 01_main_interface.png
│   ├── 02_overview_results.png
│   ├── 03_entropy.png
│   ├── 04_avalanche.png
│   ├── 05_distribution.png
│   ├── 06_comparison.png
│   ├── 07_trace.png
│   └── 08_report.png
└── plan/                       # Планы глав в формате .md
    ├── 01_аннотация.md
    ├── 02_введение.md
    ├── 03_глава1_обзор.md
    ├── 04_глава2_теория.md
    ├── 05_глава3_реализация.md
    ├── 06_глава4_эксперимент.md
    ├── 07_заключение.md
    └── 08_литература.md
```

## Генерация документа

```bash
cd docs/vkr
node generate_dissertation.js
```

При каждой генерации предыдущая версия автоматически сохраняется в `versions/` с меткой времени последнего изменения (формат: `Диссертация_YYYY-MM-DD_HH-MM-SS.docx`).

## Снятие скриншотов

```bash
cd docs/vkr
node take_screenshots.js
```

Скриншоты снимаются с работающего экземпляра CryptoAnalyzer и сохраняются в `screenshots/`.

## Форматирование документа

- **Шрифт:** Times New Roman, 14pt
- **Поля:** левое 3см, правое 1.5см, верхнее/нижнее 2см
- **Межстрочный интервал:** 1.5
- **Отступ первой строки:** 1.27см
- **Страница:** A4
- **Библиография:** ГОСТ Р 7.0.5-2008, 35+ источников

## Генератор (generate_dissertation.js)

Файл ~2700 строк, JavaScript/Node.js. Использует библиотеку `docx` для программной генерации Word-документа.

### Ключевые функции
- `normalParagraph(text, options)` — обычный абзац с форматированием
- `heading1(text)`, `heading2(number, text)`, `heading3(number, text)` — заголовки уровней
- `listItem(text, options)` — элементы списков (нумерованные/маркированные)
- `diagramImage(filename, widthCm)` — вставка UML-диаграмм
- `screenshotImage(filename, widthCm)` — вставка скриншотов
- `generateTitlePage()` — титульный лист
- `generateIntroduction()` — введение
- `generateChapter1()` — `generateChapter4()` — главы 1–4
- `generateConclusion()` — заключение
- `generateBibliography()` — библиографический список

### Структура диссертации (главы)
1. **Анализ подходов к оценке криптостойкости** — обзор 7 алгоритмов, существующие методы
2. **Разработка методики оценки на основе энтропийного анализа** — 4 энтропийные метрики, интегральная оценка
3. **Программная реализация платформы CryptoAnalyzer** — архитектура, Python/FastAPI + React
4. **Экспериментальная проверка** — 7 алгоритмов × 7 типов данных × 4 размера = 196 комбинаций

## Загрузка на Google Drive

Скрипт `upload_to_drive.js` загружает диссертацию и статьи на Google Drive через **rclone**.

### Первоначальная настройка (один раз)

```bash
rclone config
```

В интерактивном меню:
1. `n` — New remote
2. Имя: `gdrive`
3. Storage: выбрать `drive` (Google Drive)
4. Оставить client_id и client_secret пустыми (используются встроенные)
5. Scope: `1` (Full access)
6. Остальное по умолчанию (Enter)
7. Авторизоваться в открывшемся браузере
8. `y` — подтвердить, `q` — выйти

### Загрузка

```bash
cd docs/vkr
node upload_to_drive.js              # загрузить всё (диссертацию + обе статьи)
node upload_to_drive.js dissertation # только диссертацию
node upload_to_drive.js article1     # только статью 1
node upload_to_drive.js article2     # только статью 2
```

Файлы загружаются в папку `ВКР` на Google Drive. При повторной загрузке файлы перезаписываются.
После загрузки установи публичный доступ: ПКМ на папке ВКР → Поделиться → Все у кого есть ссылка.

## Зависимости

```bash
cd docs/vkr
npm install   # установит docx и puppeteer
```
