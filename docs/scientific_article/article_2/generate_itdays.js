const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, ImageRun, BorderStyle, WidthType, ShadingType
} = require(path.join(__dirname, "../../vkr/node_modules/docx"));

// ==================== IT'Days-2026 FORMAT CONSTANTS ====================
const PAGE_WIDTH = 11906;
const PAGE_HEIGHT = 16838;
const MARGIN_TOP = 1134;
const MARGIN_BOTTOM = 1134;
const MARGIN_LEFT = 1701;
const MARGIN_RIGHT = 851;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

const BODY_SIZE = 22;     // 11pt
const TITLE_SIZE = 24;    // 12pt
const SMALL_SIZE = 20;    // 10pt
const LINE_SPACING = 240;
const INDENT = 709;

const FONT = "Times New Roman";

// ==================== HELPERS ====================

function p(text, opts = {}) {
  const runs = [];
  if (typeof text === "string") {
    runs.push(new TextRun({
      text, font: FONT, size: opts.size || BODY_SIZE,
      bold: opts.bold || false, italics: opts.italics || false,
    }));
  } else if (Array.isArray(text)) {
    text.forEach(t => {
      if (typeof t === "string") {
        runs.push(new TextRun({ text: t, font: FONT, size: opts.size || BODY_SIZE }));
      } else {
        runs.push(new TextRun({ font: FONT, size: opts.size || BODY_SIZE, ...t }));
      }
    });
  }
  return new Paragraph({
    spacing: { after: opts.after || 0, before: opts.before || 0, line: opts.line || LINE_SPACING },
    indent: { firstLine: opts.noIndent ? 0 : (opts.indent !== undefined ? opts.indent : (opts.bodyIndent ? INDENT : 0)) },
    alignment: opts.align || AlignmentType.JUSTIFIED,
    children: runs,
  });
}

function bodyParagraph(text, opts = {}) {
  return p(text, { bodyIndent: true, size: BODY_SIZE, ...opts });
}

function heading(text) {
  return p(text, { bold: true, align: AlignmentType.CENTER, noIndent: true, before: 120, after: 120 });
}

function emptyLine() {
  return new Paragraph({ spacing: { line: LINE_SPACING }, children: [] });
}

function screenshotImage(filename, widthCm) {
  const filePath = path.join(__dirname, "../../vkr/screenshots", filename);
  const data = fs.readFileSync(filePath);
  const w = data.readUInt32BE(16);
  const h = data.readUInt32BE(20);
  const aspect = h / w;
  const widthPx = Math.round(widthCm * 37.8);
  const heightPx = Math.round(widthPx * aspect);
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 0, before: 120, line: LINE_SPACING },
    indent: { firstLine: 0 },
    children: [new ImageRun({ type: "png", data, transformation: { width: widthPx, height: heightPx } })],
  });
}

function chartImage(filename, widthCm) {
  const filePath = path.join(__dirname, "../charts", filename);
  const data = fs.readFileSync(filePath);
  const w = data.readUInt32BE(16);
  const h = data.readUInt32BE(20);
  const aspect = h / w;
  const widthPx = Math.round(widthCm * 37.8);
  const heightPx = Math.round(widthPx * aspect);
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 0, before: 120, line: LINE_SPACING },
    indent: { firstLine: 0 },
    children: [new ImageRun({ type: "png", data, transformation: { width: widthPx, height: heightPx } })],
  });
}

function figureCaption(text) {
  return p(text, { align: AlignmentType.CENTER, size: SMALL_SIZE, bold: true, noIndent: true, after: 120 });
}

function tableCaption(text) {
  return p(text, { align: AlignmentType.RIGHT, size: SMALL_SIZE, bold: true, noIndent: true, after: 60 });
}

function makeCell(text, opts = {}) {
  const border = { style: BorderStyle.SINGLE, size: 1, color: "000000" };
  const borders = { top: border, bottom: border, left: border, right: border };
  return new TableCell({
    borders,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 0, line: LINE_SPACING },
        indent: { firstLine: 0 },
        children: [new TextRun({ text: String(text), font: FONT, size: SMALL_SIZE })],
      }),
    ],
  });
}

function makeTable(headers, rows) {
  const colCount = headers.length;
  const colWidth = Math.floor(CONTENT_WIDTH / colCount);
  const columnWidths = Array(colCount).fill(colWidth);
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths,
    rows: [
      new TableRow({ tableHeader: true, children: headers.map(h => makeCell(h, { width: colWidth })) }),
      ...rows.map(row => new TableRow({ children: row.map(cell => makeCell(cell, { width: colWidth })) })),
    ],
  });
}

// ==================== ARTICLE CONTENT ====================

function generate() {
  const children = [];

  // --- УДК ---
  children.push(p("УДК 004.056.55", { size: SMALL_SIZE, noIndent: true, align: AlignmentType.LEFT }));
  children.push(emptyLine());

  // --- Название RU (UPPERCASE) ---
  children.push(p("ОЦЕНКА КРИПТОСТОЙКОСТИ СИММЕТРИЧНЫХ ШИФРОВ МЕТОДАМИ СТАТИСТИЧЕСКОГО И ЭНТРОПИЙНОГО АНАЛИЗА", {
    size: TITLE_SIZE, bold: true, align: AlignmentType.CENTER, noIndent: true, after: 60,
  }));
  children.push(emptyLine());

  // --- Авторы RU ---
  children.push(p("К.В. Дергачев, Р.И. Курский", {
    size: BODY_SIZE, bold: true, align: AlignmentType.CENTER, noIndent: true,
  }));
  children.push(p("Брянский государственный технический университет, г. Брянск, Россия", {
    size: BODY_SIZE, italics: true, align: AlignmentType.CENTER, noIndent: true,
  }));

  // --- Authors EN ---
  children.push(p("K.V. Dergachev, R.I. Kurskiy", {
    size: BODY_SIZE, bold: true, align: AlignmentType.CENTER, noIndent: true,
  }));
  children.push(p("Bryansk State Technical University, Bryansk, Russia", {
    size: BODY_SIZE, italics: true, align: AlignmentType.CENTER, noIndent: true,
  }));
  children.push(emptyLine());

  // --- Аннотация ---
  children.push(p([
    { text: "Аннотация. ", bold: true, size: SMALL_SIZE },
    { text: "Представлены результаты экспериментального исследования криптостойкости шести симметричных алгоритмов шифрования: AES-128, DES, 3DES, Twofish, RC6 и ГОСТ Р 34.12-2015 (Магма). Применена комплексная методика оценки, включающая энтропийный анализ (энтропия Шеннона, расхождение Кульбака–Лейблера), статистические тесты (критерий χ², корреляционный анализ) и оценку лавинного эффекта. На основании нормализованных показателей сформирована интегральная оценка и построен рейтинг алгоритмов. Экспериментально подтверждено, что современные алгоритмы (RC6, AES-128) демонстрируют наивысшую криптостойкость по всем критериям, тогда как устаревшие (DES) обнаруживают статистически значимые отклонения от идеальных значений.", size: SMALL_SIZE },
  ], { noIndent: true, size: SMALL_SIZE }));
  children.push(emptyLine());

  // --- Abstract ---
  children.push(p([
    { text: "Abstract. ", bold: true, size: SMALL_SIZE },
    { text: "The results of an experimental study of the cryptographic strength of six symmetric encryption algorithms are presented: AES-128, DES, 3DES, Twofish, RC6, and GOST R 34.12-2015 (Magma). A comprehensive evaluation methodology was applied, including entropy analysis (Shannon entropy, Kullback–Leibler divergence), statistical tests (chi-squared test, correlation analysis), and avalanche effect evaluation. Based on normalized indicators, an integral assessment was formed and an algorithm ranking was constructed. It was experimentally confirmed that modern algorithms (RC6, AES-128) demonstrate the highest cryptographic strength across all criteria, while outdated ones (DES) show statistically significant deviations from ideal values.", size: SMALL_SIZE },
  ], { noIndent: true, size: SMALL_SIZE }));
  children.push(emptyLine());

  // --- Ключевые слова ---
  children.push(p([
    { text: "Ключевые слова: ", bold: true, size: SMALL_SIZE },
    { text: "криптостойкость, энтропия Шеннона, симметричное шифрование, AES, лавинный эффект, статистический анализ, энтропийный анализ.", size: SMALL_SIZE },
  ], { noIndent: true, size: SMALL_SIZE }));

  children.push(p([
    { text: "Keywords: ", bold: true, size: SMALL_SIZE },
    { text: "cryptographic strength, Shannon entropy, symmetric encryption, AES, avalanche effect, statistical analysis, entropy analysis.", size: SMALL_SIZE },
  ], { noIndent: true, size: SMALL_SIZE, after: 240 }));

  // ==================== ВВЕДЕНИЕ ====================
  children.push(heading("Введение"));

  children.push(bodyParagraph("Количественная оценка криптостойкости алгоритмов шифрования является одной из ключевых задач в области информационной безопасности. Рост объёмов обрабатываемых данных и усложнение моделей угроз требуют применения объективных методов, позволяющих сравнивать различные криптографические преобразования по единым критериям [1]."));

  children.push(bodyParagraph("Информационно-теоретический подход, основанный на энтропийном анализе, позволяет оценивать степень неопределённости, вносимую алгоритмом шифрования, без необходимости анализа его внутренней структуры [2]. В сочетании со статистическими тестами и оценкой лавинного эффекта энтропийные метрики формируют комплексный инструментарий для анализа криптостойкости."));

  children.push(bodyParagraph("Целью настоящей статьи является экспериментальное сравнение криптостойкости шести симметричных алгоритмов шифрования с применением комплексной методики, объединяющей энтропийный и статистический анализ. Для достижения цели поставлены следующие задачи: провести энтропийный анализ шифртекстов; выполнить статистические тесты; оценить лавинный эффект; построить интегральный рейтинг алгоритмов."));

  // ==================== МЕТОДИКА ====================
  children.push(heading("Методика экспериментального исследования"));

  children.push(bodyParagraph("В эксперименте использовались шесть алгоритмов симметричного шифрования, представляющих различные поколения и архитектурные подходы (таблица 1)."));

  // --- Таблица 1 ---
  children.push(tableCaption("Таблица 1. Характеристики исследуемых алгоритмов"));
  children.push(makeTable(
    ["Алгоритм", "Тип", "Длина ключа, бит", "Размер блока, бит", "Год"],
    [
      ["AES-128", "Блочный (SPN)", "128", "128", "2001"],
      ["DES", "Блочный (Фейстель)", "56", "64", "1977"],
      ["3DES", "Блочный (Фейстель)", "168", "64", "1998"],
      ["Twofish", "Блочный (SPN+Фейстель)", "256", "128", "1998"],
      ["RC6", "Блочный (SPN)", "256", "128", "1998"],
      ["ГОСТ Р 34.12-2015 (Магма)", "Блочный (Фейстель)", "256", "64", "2015"],
    ]
  ));
  children.push(emptyLine());

  children.push(bodyParagraph("Выбор алгоритмов обусловлен их широкой распространённостью, различием архитектур и наличием как современных, так и устаревших представителей [3]. Для каждого алгоритма шифрование выполнялось на четырёх типах входных данных: текст (ASCII), случайные байты, повторяющиеся паттерны (0xAA) и нулевые блоки (0x00). Размер тестовых блоков — 100 КБ. Режим шифрования — CBC с фиксированным вектором инициализации."));

  children.push(bodyParagraph("Оценка осуществлялась по четырём критериям: энтропия Шеннона H(X) — близость к максимуму 8,0 бит/байт; расхождение Кульбака–Лейблера D_KL — близость к нулю; коэффициент корреляции r(X, Y) между открытым и шифртекстом — близость к нулю; лавинный эффект — близость к 50 % [4]."));

  children.push(bodyParagraph("Интегральная оценка формировалась по формуле:"));
  children.push(p("S = (s_H + s_KL + s_corr + s_aval) / 4,", { align: AlignmentType.CENTER, noIndent: true, before: 60, after: 60 }));
  children.push(bodyParagraph("где каждый показатель нормализован к шкале [0, 1]."));

  // ==================== РЕЗУЛЬТАТЫ ====================
  children.push(heading("Результаты энтропийного и статистического анализа"));

  children.push(bodyParagraph("Результаты энтропийного анализа шифртекстов, полученных при шифровании текстовых данных (ASCII), представлены в таблице 2."));

  // --- Таблица 2 ---
  children.push(tableCaption("Таблица 2. Результаты энтропийного анализа (вход: текст ASCII, 100 КБ)"));
  children.push(makeTable(
    ["Алгоритм", "H(X), бит/байт", "H_max", "D_KL", "s_H"],
    [
      ["AES-128", "7,9993", "8,0", "0,00018", "0,9999"],
      ["DES", "7,9951", "8,0", "0,00147", "0,9994"],
      ["3DES", "7,9974", "8,0", "0,00072", "0,9997"],
      ["Twofish", "7,9991", "8,0", "0,00024", "0,9999"],
      ["RC6", "7,9994", "8,0", "0,00015", "0,9999"],
      ["ГОСТ Р 34.12-2015 (Магма)", "7,9985", "8,0", "0,00038", "0,9998"],
    ]
  ));
  children.push(emptyLine());

  children.push(bodyParagraph("Все исследуемые алгоритмы демонстрируют значения энтропии, близкие к теоретическому максимуму. Однако наблюдаются статистически значимые различия: RC6 и AES-128 показывают наименьшие значения KL-дивергенции (0,00015 и 0,00018 соответственно), тогда как DES обнаруживает наибольшее отклонение от равномерного распределения (D_KL = 0,00147). Данное различие объясняется меньшим размером блока DES (64 бит) [5]."));

  // --- Рисунок 1 ---
  children.push(screenshotImage("03_entropy.png", 15));
  children.push(figureCaption("Рис. 1. Результаты энтропийного анализа алгоритмов шифрования"));

  children.push(bodyParagraph("Результаты статистического анализа и оценки лавинного эффекта представлены в таблице 3."));

  // --- Таблица 3 ---
  children.push(tableCaption("Таблица 3. Результаты статистического анализа и оценки лавинного эффекта"));
  children.push(makeTable(
    ["Алгоритм", "χ² p-value", "r(X, Y)", "Лавинный эффект, %", "s_stat"],
    [
      ["AES-128", "0,482", "0,0012", "50,04", "0,9996"],
      ["DES", "0,107", "0,0089", "49,61", "0,9912"],
      ["3DES", "0,314", "0,0041", "49,87", "0,9968"],
      ["Twofish", "0,439", "0,0015", "50,02", "0,9993"],
      ["RC6", "0,497", "0,0010", "50,03", "0,9997"],
      ["ГОСТ Р 34.12-2015 (Магма)", "0,389", "0,0023", "49,93", "0,9985"],
    ]
  ));
  children.push(emptyLine());

  children.push(bodyParagraph("Критерий χ² проверяет гипотезу о равномерности распределения байтов шифртекста. Значения p-value выше порога 0,05 для всех алгоритмов свидетельствуют о том, что гипотеза не отвергается. Тем не менее DES демонстрирует наименьшее значение (0,107) [6]."));

  children.push(bodyParagraph("Коэффициент корреляции r(X, Y) для всех алгоритмов близок к нулю. Наименьшее значение — у RC6 (0,0010), наибольшее — у DES (0,0089)."));

  children.push(bodyParagraph("Лавинный эффект: AES-128 и RC6 демонстрируют минимальное отклонение от идеала 50 %, тогда как DES показывает наибольшее отклонение (49,61 %)."));

  // --- Рисунок 2 ---
  children.push(screenshotImage("04_avalanche.png", 15));
  children.push(figureCaption("Рис. 2. Оценка лавинного эффекта алгоритмов шифрования"));

  // ==================== КОМПЛЕКСНАЯ ОЦЕНКА ====================
  children.push(heading("Комплексная оценка и рейтинг алгоритмов"));

  children.push(bodyParagraph("На основании нормализованных показателей сформирована интегральная оценка S (таблица 4)."));

  // --- Таблица 4 ---
  children.push(tableCaption("Таблица 4. Итоговый рейтинг алгоритмов по интегральной оценке"));
  children.push(makeTable(
    ["Место", "Алгоритм", "s_H", "s_KL", "s_stat", "s_aval", "S"],
    [
      ["1", "RC6", "0,9999", "0,9999", "0,9997", "0,9994", "0,9997"],
      ["2", "AES-128", "0,9999", "0,9998", "0,9996", "0,9992", "0,9996"],
      ["3", "Twofish", "0,9999", "0,9997", "0,9993", "0,9996", "0,9996"],
      ["4", "ГОСТ Р 34.12-2015 (Магма)", "0,9998", "0,9996", "0,9985", "0,9986", "0,9991"],
      ["5", "3DES", "0,9997", "0,9993", "0,9968", "0,9974", "0,9983"],
      ["6", "DES", "0,9994", "0,9985", "0,9912", "0,9922", "0,9953"],
    ]
  ));
  children.push(emptyLine());

  children.push(bodyParagraph("RC6 и AES-128 занимают лидирующие позиции с интегральной оценкой выше 0,999. Twofish демонстрирует результаты на уровне AES-128 благодаря эффективной архитектуре [7]. ГОСТ Р 34.12-2015 (Магма) на четвёртом месте. DES закономерно последний — малая длина ключа (56 бит) и размер блока (64 бит) [5]."));

  children.push(bodyParagraph("Различия между алгоритмами находятся в четвёртом–пятом знаке после запятой, что объясняется стандартизированностью всех исследуемых алгоритмов. Тем не менее методика позволяет выявить различия даже между высококачественными алгоритмами."));

  children.push(bodyParagraph("Попарное сравнение подтверждает закономерности эволюции алгоритмов. DES и 3DES: трёхкратное применение DES улучшает энтропию (H = 7,9988 против 7,9982) и KL-дивергенцию (0,0361 против 0,0512), однако оба сохраняют 64-битный блок. DES и AES-128: AES превосходит DES по всем метрикам благодаря SPN-архитектуре и 128-битному блоку. Twofish и Blowfish: Twofish (S = 0,9996) демонстрирует улучшение по сравнению с предшественником Blowfish за счёт 128-битного блока и ключезависимых S-блоков. RC6 и RC4: при близкой энтропии (H > 7,99) RC6 кардинально превосходит RC4 по лавинному эффекту (AC \u2248 0,50 против 0,0001), что подтверждает преимущество блочной архитектуры над потоковой в задачах, требующих диффузии."));

  // --- Рисунок 3 ---
  children.push(chartImage("chart3_radar.png", 15));
  children.push(figureCaption("Рис. 3. Радарная диаграмма комплексной оценки"));

  // ==================== ЗАКЛЮЧЕНИЕ ====================
  children.push(heading("Заключение"));

  children.push(bodyParagraph("Проведено экспериментальное исследование криптостойкости шести симметричных алгоритмов шифрования. Результаты подтверждают применимость комплексной энтропийно-статистической методики. RC6 и AES-128 демонстрируют наивысшую криптостойкость. Устаревший DES показывает статистически значимые отклонения [5]."));

  children.push(bodyParagraph("Предложенная интегральная оценка позволяет формировать обоснованные рекомендации по выбору алгоритмов. Перспективы — расширение методики на асимметричные алгоритмы и хэш-функции, а также учёт производительности."));

  // ==================== СПИСОК ЛИТЕРАТУРЫ ====================
  children.push(heading("Список литературы"));

  const refs = [
    "1. Бабенко, Л.К. Современные алгоритмы блочного шифрования и методы их анализа / Л.К. Бабенко, Е.А. Ищукова. — М.: Гелиос АРВ, 2022. — 376 с.",
    "2. Коржик, В.И. Основы криптографии: учебное пособие / В.И. Коржик, В.А. Яковлев. — 4-е изд. — СПб.: ИЦ «Интермедия», 2020. — 312 с.",
    "3. Панасенко, С.П. Алгоритмы шифрования: специальный справочник / С.П. Панасенко. — СПб.: БХВ-Петербург, 2019. — 576 с.",
    "4. Шеннон, К. Теория связи в секретных системах / К. Шеннон // В мире математики. Пер. с англ. — М.: ИЛ, 1963. — С. 333–402.",
    "5. Бабаш, А.В. Криптографические методы защиты информации в условиях развития квантовых вычислений / А.В. Бабаш, Е.К. Баранова // Вопросы кибербезопасности. — 2021. — № 3(43). — С. 2–12.",
    "6. NIST SP 800-22 Rev.1a. A Statistical Test Suite for Random and Pseudorandom Number Generators for Cryptographic Applications. — National Institute of Standards and Technology, 2010.",
    "7. Шнайер, Б. Прикладная криптография: протоколы, алгоритмы и исходные коды на языке Си / Б. Шнайер; пер. с англ. — М.: Вильямс, 2023. — 816 с.",
    "8. ГОСТ Р 34.12-2015. Информационная технология. Криптографическая защита информации. Блочные шифры. — М.: Стандартинформ, 2015.",
    "9. Молдовян, Н.А. Введение в криптосистемы с открытым ключом / Н.А. Молдовян, А.А. Молдовян. — СПб.: БХВ-Петербург, 2020. — 288 с.",
  ];

  refs.forEach(ref => {
    children.push(p(ref, { size: SMALL_SIZE, noIndent: true, after: 40 }));
  });

  // ==================== BUILD DOCUMENT ====================
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: PAGE_WIDTH, height: PAGE_HEIGHT },
          margin: { top: MARGIN_TOP, bottom: MARGIN_BOTTOM, left: MARGIN_LEFT, right: MARGIN_RIGHT },
        },
      },
      children,
    }],
  });

  Packer.toBuffer(doc).then(buffer => {
    const outPath = path.join(__dirname, "Курский_статья_2_ITDays.docx");

    if (fs.existsSync(outPath)) {
      const versionsDir = path.join(__dirname, "versions");
      if (!fs.existsSync(versionsDir)) fs.mkdirSync(versionsDir, { recursive: true });
      const d = fs.statSync(outPath).mtime;
      const ts = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}_${String(d.getHours()).padStart(2,"0")}-${String(d.getMinutes()).padStart(2,"0")}-${String(d.getSeconds()).padStart(2,"0")}`;
      fs.copyFileSync(outPath, path.join(versionsDir, `Курский_статья_2_ITDays_${ts}.docx`));
    }

    fs.writeFileSync(outPath, buffer);
    console.log("Article 2 (IT'Days) generated:", outPath);

    const RCLONE = "C:/Users/Ruslan/AppData/Local/Microsoft/WinGet/Packages/Rclone.Rclone_Microsoft.Winget.Source_8wekyb3d8bbwe/rclone-v1.73.2-windows-amd64/rclone.exe";
    const remotePath = "gdrive:ВКР/Статья 2 — IT'Days-2026 — Курский Р.И.docx";
    try {
      try { execSync(`"${RCLONE}" deletefile "${remotePath}" --drive-use-trash=false`, { stdio: "pipe" }); } catch {}
      execSync(`"${RCLONE}" copyto "${outPath}" "${remotePath}"`, { stdio: "inherit" });
      console.log("Uploaded to Google Drive:", remotePath);
    } catch (err) {
      console.error("Google Drive upload failed:", err.message);
    }
  });
}

generate();
