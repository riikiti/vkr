const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, ImageRun, BorderStyle, WidthType, ShadingType
} = require(path.join(__dirname, "../../vkr/node_modules/docx"));

// ==================== AMPU FORMAT CONSTANTS ====================
// A4, margins: left=3cm, right=1.5cm, top=bottom=2cm
const PAGE_WIDTH = 11906;
const PAGE_HEIGHT = 16838;
const MARGIN_TOP = 1134;    // 2cm
const MARGIN_BOTTOM = 1134; // 2cm
const MARGIN_LEFT = 1701;   // 3cm
const MARGIN_RIGHT = 851;   // 1.5cm
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT; // ~9354 DXA

// Font sizes in half-points — AMPU uses 14pt throughout
const BODY_SIZE = 28;       // 14pt
const LINE_SPACING = 240;   // single
const INDENT = 709;         // 1.25cm

const FONT = "Times New Roman";

// ==================== HELPERS ====================

function p(text, opts = {}) {
  const runs = [];
  if (typeof text === "string") {
    runs.push(new TextRun({
      text,
      font: FONT,
      size: opts.size || BODY_SIZE,
      bold: opts.bold || false,
      italics: opts.italics || false,
      superScript: opts.superScript || false,
    }));
  } else if (Array.isArray(text)) {
    text.forEach(t => {
      if (typeof t === "string") {
        runs.push(new TextRun({ text: t, font: FONT, size: opts.size || BODY_SIZE }));
      } else {
        runs.push(new TextRun({
          font: FONT,
          size: opts.size || BODY_SIZE,
          ...t,
        }));
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
  return p(text, { bodyIndent: true, ...opts });
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
    children: [new ImageRun({
      type: "png",
      data,
      transformation: { width: widthPx, height: heightPx },
    })],
  });
}

function figureCaption(text) {
  return p(text, { align: AlignmentType.CENTER, bold: true, noIndent: true, after: 120 });
}

function tableCaption(text) {
  return p(text, { align: AlignmentType.RIGHT, bold: true, noIndent: true, after: 60 });
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
        children: [new TextRun({
          text: String(text),
          font: FONT,
          size: BODY_SIZE,
        })],
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
      new TableRow({
        tableHeader: true,
        children: headers.map(h => makeCell(h, { header: true, width: colWidth })),
      }),
      ...rows.map(row =>
        new TableRow({
          children: row.map(cell => makeCell(cell, { width: colWidth })),
        })
      ),
    ],
  });
}

// ==================== ARTICLE CONTENT ====================

function generate() {
  const children = [];

  // --- Научная статья ---
  children.push(p("Научная статья", { noIndent: true }));

  // --- УДК ---
  children.push(p("УДК 003.26; 519.72", { noIndent: true }));
  children.push(emptyLine());

  // --- Название ---
  children.push(p("Оценка криптостойкости симметричных шифров методами статистического и энтропийного анализа", {
    bold: true, align: AlignmentType.CENTER, noIndent: true, after: 120,
  }));

  // --- Авторы ---
  children.push(p([
    { text: "Константин Владимирович Дергачев", bold: true },
    { text: "1", superScript: true },
    { text: ", Руслан Игоревич Курский", bold: true },
    { text: "1", superScript: true },
  ], { noIndent: true }));

  // --- Организация ---
  children.push(p([
    { text: "1", superScript: true },
    { text: " Брянский государственный технический университет, г. Брянск, Россия" },
  ], { noIndent: true, after: 120 }));

  // --- Аннотация ---
  children.push(p([
    { text: "Аннотация. ", bold: true, italics: true },
    { text: "Представлены результаты экспериментального исследования криптостойкости шести симметричных алгоритмов шифрования: AES-128, DES, 3DES, Blowfish, ChaCha20 и ГОСТ 28147-89 (Магма). Применена комплексная методика оценки, включающая энтропийный анализ (энтропия Шеннона, расхождение Кульбака–Лейблера), статистические тесты (критерий χ², корреляционный анализ) и оценку лавинного эффекта. На основании нормализованных показателей сформирована интегральная оценка и построен рейтинг алгоритмов. Экспериментально подтверждено, что современные алгоритмы (AES-128, ChaCha20) демонстрируют наивысшую криптостойкость по всем критериям.", bold: true, italics: true },
  ], { bodyIndent: true }));

  // --- Ключевые слова ---
  children.push(p([
    { text: "Ключевые слова: ", bold: true, italics: true },
    { text: "криптостойкость, энтропия Шеннона, симметричное шифрование, AES, лавинный эффект, статистический анализ, энтропийный анализ.", bold: true, italics: true },
  ], { bodyIndent: true, after: 240 }));

  // ==================== ВВЕДЕНИЕ ====================
  children.push(heading("Введение"));

  children.push(bodyParagraph("Количественная оценка криптостойкости алгоритмов шифрования является одной из ключевых задач в области информационной безопасности. Рост объёмов обрабатываемых данных и усложнение моделей угроз требуют применения объективных методов, позволяющих сравнивать различные криптографические преобразования по единым критериям [1]."));

  children.push(bodyParagraph("Информационно-теоретический подход, основанный на энтропийном анализе, позволяет оценивать степень неопределённости, вносимую алгоритмом шифрования, без необходимости анализа его внутренней структуры [2]. В сочетании со статистическими тестами и оценкой лавинного эффекта энтропийные метрики формируют комплексный инструментарий для анализа криптостойкости."));

  children.push(bodyParagraph("Целью настоящей статьи является экспериментальное сравнение криптостойкости шести симметричных алгоритмов шифрования с применением комплексной методики, объединяющей энтропийный и статистический анализ. Для достижения цели поставлены следующие задачи: провести энтропийный анализ шифртекстов; выполнить статистические тесты; оценить лавинный эффект; построить интегральный рейтинг алгоритмов."));

  // ==================== МЕТОДИКА ====================
  children.push(heading("Методика экспериментального исследования"));

  children.push(bodyParagraph("В эксперименте использовались шесть алгоритмов симметричного шифрования, представляющих различные поколения и архитектурные подходы. Характеристики алгоритмов представлены в таблице 1."));

  // --- Таблица 1 ---
  children.push(tableCaption("Таблица 1. Характеристики исследуемых алгоритмов"));
  children.push(makeTable(
    ["Алгоритм", "Тип", "Длина ключа, бит", "Размер блока, бит", "Год"],
    [
      ["AES-128", "Блочный (SPN)", "128", "128", "2001"],
      ["DES", "Блочный (Фейстель)", "56", "64", "1977"],
      ["3DES", "Блочный (Фейстель)", "168", "64", "1998"],
      ["Blowfish", "Блочный (Фейстель)", "128", "64", "1993"],
      ["ChaCha20", "Потоковый", "256", "—", "2008"],
      ["ГОСТ 28147-89", "Блочный (Фейстель)", "256", "64", "1989"],
    ]
  ));
  children.push(emptyLine());

  children.push(bodyParagraph("Выбор алгоритмов обусловлен их широкой распространённостью, различием архитектур и наличием как современных, так и устаревших представителей [3]. Для каждого алгоритма шифрование выполнялось на четырёх типах входных данных: текст (ASCII), случайные байты, повторяющиеся паттерны (0xAA) и нулевые блоки (0x00). Размер тестовых блоков — 100 КБ. Режим шифрования — CBC с фиксированным вектором инициализации."));

  children.push(bodyParagraph("Оценка осуществлялась по четырём критериям: энтропия Шеннона H(X) — близость к максимуму 8,0 бит/байт; расхождение Кульбака–Лейблера D_KL — близость к нулю; коэффициент корреляции r(X, Y) между открытым и шифртекстом — близость к нулю; лавинный эффект — близость к 50 % изменённых бит при изменении одного бита открытого текста [4]."));

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
      ["Blowfish", "7,9989", "8,0", "0,00029", "0,9999"],
      ["ChaCha20", "7,9996", "8,0", "0,00011", "1,0000"],
      ["ГОСТ 28147-89", "7,9985", "8,0", "0,00038", "0,9998"],
    ]
  ));
  children.push(emptyLine());

  children.push(bodyParagraph("Все исследуемые алгоритмы демонстрируют значения энтропии, близкие к теоретическому максимуму. Однако наблюдаются статистически значимые различия: ChaCha20 и AES-128 показывают наименьшие значения KL-дивергенции (0,00011 и 0,00018 соответственно), тогда как DES обнаруживает наибольшее отклонение от равномерного распределения (D_KL = 0,00147). Данное различие объясняется меньшим размером блока DES (64 бит), что ограничивает эффективность рассеивания статистических закономерностей [5]."));

  // --- Рисунок 1: энтропия ---
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
      ["Blowfish", "0,421", "0,0019", "50,01", "0,9991"],
      ["ChaCha20", "0,517", "0,0008", "50,02", "0,9998"],
      ["ГОСТ 28147-89", "0,389", "0,0023", "49,93", "0,9985"],
    ]
  ));
  children.push(emptyLine());

  children.push(bodyParagraph("Критерий χ² проверяет гипотезу о равномерности распределения байтов шифртекста. Значения p-value выше порога 0,05 для всех алгоритмов свидетельствуют о том, что гипотеза не отвергается. Тем не менее DES демонстрирует наименьшее значение (0,107), что указывает на менее равномерное распределение [6]."));

  children.push(bodyParagraph("Коэффициент корреляции r(X, Y) между открытым и шифртекстом для всех алгоритмов близок к нулю, что подтверждает отсутствие линейной статистической связи. Наименьшее значение наблюдается у ChaCha20 (0,0008), наибольшее — у DES (0,0089)."));

  children.push(bodyParagraph("Лавинный эффект характеризует чувствительность шифртекста к изменению одного бита открытого текста. Идеальное значение составляет 50 %. AES-128 и ChaCha20 демонстрируют минимальное отклонение от идеала, тогда как DES показывает наибольшее отклонение (49,61 %)."));

  // --- Рисунок 2: лавинный эффект ---
  children.push(screenshotImage("04_avalanche.png", 15));
  children.push(figureCaption("Рис. 2. Оценка лавинного эффекта алгоритмов шифрования"));

  // ==================== КОМПЛЕКСНАЯ ОЦЕНКА ====================
  children.push(heading("Комплексная оценка и рейтинг алгоритмов"));

  children.push(bodyParagraph("На основании нормализованных показателей энтропийного анализа, KL-дивергенции, статистических тестов и лавинного эффекта сформирована интегральная оценка S для каждого алгоритма (таблица 4)."));

  // --- Таблица 4 ---
  children.push(tableCaption("Таблица 4. Итоговый рейтинг алгоритмов по интегральной оценке"));
  children.push(makeTable(
    ["Место", "Алгоритм", "s_H", "s_KL", "s_stat", "s_aval", "S"],
    [
      ["1", "ChaCha20", "1,0000", "0,9999", "0,9998", "0,9996", "0,9998"],
      ["2", "AES-128", "0,9999", "0,9998", "0,9996", "0,9992", "0,9996"],
      ["3", "Blowfish", "0,9999", "0,9997", "0,9991", "0,9998", "0,9996"],
      ["4", "ГОСТ 28147-89", "0,9998", "0,9996", "0,9985", "0,9986", "0,9991"],
      ["5", "3DES", "0,9997", "0,9993", "0,9968", "0,9974", "0,9983"],
      ["6", "DES", "0,9994", "0,9985", "0,9912", "0,9922", "0,9953"],
    ]
  ));
  children.push(emptyLine());

  children.push(bodyParagraph("Результаты подтверждают ожидаемые закономерности. Современные алгоритмы — ChaCha20 и AES-128 — занимают лидирующие позиции с интегральной оценкой, превышающей 0,999. Blowfish, несмотря на сравнительную давность разработки (1993 г.), демонстрирует результаты на уровне AES-128, что объясняется эффективной архитектурой сети Фейстеля с 16 раундами и ключезависимыми S-блоками [7]."));

  children.push(bodyParagraph("ГОСТ 28147-89 занимает четвёртое место, показывая результаты, сопоставимые с Blowfish, что свидетельствует о достаточной криптостойкости при использовании качественных узлов замены. DES закономерно занимает последнее место — основными факторами являются малая длина ключа (56 бит) и размер блока (64 бит) [5]."));

  children.push(bodyParagraph("Следует отметить, что различия между алгоритмами находятся в четвёртом–пятом знаке после запятой. Это объясняется тем, что все исследуемые алгоритмы являются стандартизированными и прошли многолетнюю проверку. Тем не менее энтропийный анализ позволяет выявить различия даже между алгоритмами с высокой криптостойкостью, что подтверждает чувствительность предложенной методики."));

  // --- Рисунок 3: сравнение ---
  children.push(screenshotImage("06_comparison.png", 15));
  children.push(figureCaption("Рис. 3. Радарная диаграмма комплексной оценки и рейтинг алгоритмов"));

  // ==================== ЗАКЛЮЧЕНИЕ ====================
  children.push(heading("Заключение"));

  children.push(bodyParagraph("Проведено экспериментальное исследование криптостойкости шести симметричных алгоритмов шифрования с применением комплексной методики, включающей энтропийный анализ, статистические тесты и оценку лавинного эффекта."));

  children.push(bodyParagraph("Результаты подтверждают применимость комплексной энтропийно-статистической методики для сравнительной оценки алгоритмов шифрования. ChaCha20 и AES-128 демонстрируют наивысшую криптостойкость по всем критериям. Устаревший алгоритм DES показывает статистически значимые отклонения от идеальных значений, обусловленные ограничениями архитектуры [5]."));

  children.push(bodyParagraph("Предложенная интегральная оценка позволяет формировать обоснованные рекомендации по выбору алгоритмов шифрования для конкретных задач защиты информации. Перспективами дальнейших исследований являются расширение методики на асимметричные алгоритмы и хэш-функции, а также учёт производительности наряду с криптостойкостью."));

  // ==================== СПИСОК ИСТОЧНИКОВ ====================
  children.push(heading("Список источников"));

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
    children.push(p(ref, { noIndent: true, after: 40 }));
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
    const outPath = path.join(__dirname, "Курский_статья_2_AMPU.docx");

    // --- Версионность ---
    if (fs.existsSync(outPath)) {
      const versionsDir = path.join(__dirname, "versions");
      if (!fs.existsSync(versionsDir)) fs.mkdirSync(versionsDir, { recursive: true });
      const d = fs.statSync(outPath).mtime;
      const ts = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}_${String(d.getHours()).padStart(2,"0")}-${String(d.getMinutes()).padStart(2,"0")}-${String(d.getSeconds()).padStart(2,"0")}`;
      const versionFile = path.join(versionsDir, `Курский_статья_2_AMPU_${ts}.docx`);
      fs.copyFileSync(outPath, versionFile);
      console.log("Previous version saved:", versionFile);
    }

    fs.writeFileSync(outPath, buffer);
    console.log("Article 2 generated:", outPath);

    // --- Автозагрузка на Google Drive ---
    const RCLONE = "C:/Users/Ruslan/AppData/Local/Microsoft/WinGet/Packages/Rclone.Rclone_Microsoft.Winget.Source_8wekyb3d8bbwe/rclone-v1.73.2-windows-amd64/rclone.exe";
    const remotePath = "gdrive:ВКР/Статья 2 — Криптостойкость шифров — Курский Р.И.docx";
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
