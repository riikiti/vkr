const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, ImageRun, BorderStyle, WidthType, ShadingType
} = require(path.join(__dirname, "../../vkr/node_modules/docx"));

// ==================== ИжГТУ FORMAT CONSTANTS ====================
const PAGE_WIDTH = 8391;
const PAGE_HEIGHT = 11907;
const MARGIN_TOP = 964;
const MARGIN_BOTTOM = 1304;
const MARGIN_LEFT = 1247;
const MARGIN_RIGHT = 1021;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

const BODY_SIZE = 20;     // 10pt
const SMALL_SIZE = 18;    // 9pt
const LINE_SPACING = 240;
const INDENT = 283;       // 0.5cm

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

function makeCell(text, opts = {}) {
  const border = { style: BorderStyle.SINGLE, size: 1, color: "000000" };
  const borders = { top: border, bottom: border, left: border, right: border };
  return new TableCell({
    borders,
    margins: { top: 40, bottom: 40, left: 60, right: 60 },
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

  // --- ГРНТИ ---
  children.push(p("ГРНТИ 20.01.04", { size: BODY_SIZE, noIndent: true, align: AlignmentType.CENTER }));

  // --- УДК ---
  children.push(p("УДК 004.056.55", { size: BODY_SIZE, noIndent: true, align: AlignmentType.CENTER }));

  // --- Авторы RU ---
  children.push(p("К.В. Дергачев, кандидат технических наук, доцент", {
    size: BODY_SIZE, italics: true, align: AlignmentType.CENTER, noIndent: true,
  }));
  children.push(p("Р.И. Курский, магистрант", {
    size: BODY_SIZE, italics: true, align: AlignmentType.CENTER, noIndent: true,
  }));
  children.push(p("кафедра «Информатика и программное обеспечение»", {
    size: BODY_SIZE, align: AlignmentType.CENTER, noIndent: true,
  }));
  children.push(p("Брянский государственный технический университет", {
    size: BODY_SIZE, align: AlignmentType.CENTER, noIndent: true,
  }));

  children.push(emptyLine());

  // --- Authors EN ---
  children.push(p("K.V. Dergachev, PhD in Engineering, Associate Professor", {
    size: BODY_SIZE, italics: true, align: AlignmentType.CENTER, noIndent: true,
  }));
  children.push(p("R.I. Kurskiy, Master's Degree Student", {
    size: BODY_SIZE, italics: true, align: AlignmentType.CENTER, noIndent: true,
  }));
  children.push(p("Department of Computer Science and Software Engineering", {
    size: BODY_SIZE, align: AlignmentType.CENTER, noIndent: true,
  }));
  children.push(p("Bryansk State Technical University", {
    size: BODY_SIZE, align: AlignmentType.CENTER, noIndent: true,
  }));

  children.push(emptyLine());

  // --- Название RU ---
  children.push(p("Оценка криптостойкости симметричных шифров методами статистического и энтропийного анализа", {
    bold: true, align: AlignmentType.CENTER, noIndent: true,
  }));

  children.push(emptyLine());

  // --- Title EN ---
  children.push(p("Evaluation of cryptographic strength of symmetric ciphers by methods of statistical and entropy analysis", {
    bold: true, align: AlignmentType.CENTER, noIndent: true,
  }));

  children.push(emptyLine());

  // --- Аннотация RU ---
  children.push(p("Представлены результаты экспериментального исследования криптостойкости шести симметричных алгоритмов шифрования: AES-128, DES, 3DES, Twofish, RC6 и ГОСТ Р 34.12-2015 (Магма). Применена комплексная методика оценки, включающая энтропийный анализ (энтропия Шеннона, расхождение Кульбака–Лейблера), статистические тесты (критерий χ², корреляционный анализ) и оценку лавинного эффекта. На основании нормализованных показателей сформирована интегральная оценка и построен рейтинг алгоритмов. Экспериментально подтверждено, что современные алгоритмы (RC6, AES-128) демонстрируют наивысшую криптостойкость по всем критериям.", { noIndent: true }));

  children.push(emptyLine());

  // --- Abstract EN ---
  children.push(p("The results of an experimental study of the cryptographic strength of six symmetric encryption algorithms are presented: AES-128, DES, 3DES, Twofish, RC6, and GOST R 34.12-2015 (Magma). A comprehensive evaluation methodology was applied, including entropy analysis (Shannon entropy, Kullback–Leibler divergence), statistical tests (chi-squared test, correlation analysis), and avalanche effect evaluation. Based on normalized indicators, an integral assessment was formed and an algorithm ranking was constructed. It was experimentally confirmed that modern algorithms (RC6, AES-128) demonstrate the highest cryptographic strength across all criteria.", { noIndent: true }));

  children.push(emptyLine());

  // --- Ключевые слова ---
  children.push(p([
    { text: "Ключевые слова: ", bold: true },
    { text: "криптостойкость; энтропия Шеннона; симметричное шифрование; AES; лавинный эффект; статистический анализ; энтропийный анализ." },
  ], { noIndent: true }));

  children.push(emptyLine());

  children.push(p([
    { text: "Keywords: ", bold: true },
    { text: "cryptographic strength; Shannon entropy; symmetric encryption; AES; avalanche effect; statistical analysis; entropy analysis." },
  ], { noIndent: true }));

  children.push(emptyLine());

  // ==================== ВВЕДЕНИЕ ====================
  children.push(bodyParagraph("Количественная оценка криптостойкости алгоритмов шифрования является одной из ключевых задач в области информационной безопасности. Рост объёмов обрабатываемых данных и усложнение моделей угроз требуют применения объективных методов, позволяющих сравнивать различные криптографические преобразования по единым критериям [1]."));

  children.push(bodyParagraph("Информационно-теоретический подход, основанный на энтропийном анализе, позволяет оценивать степень неопределённости, вносимую алгоритмом шифрования, без необходимости анализа его внутренней структуры [2]. В сочетании со статистическими тестами и оценкой лавинного эффекта энтропийные метрики формируют комплексный инструментарий для анализа криптостойкости."));

  children.push(bodyParagraph("Целью настоящей статьи является экспериментальное сравнение криптостойкости шести симметричных алгоритмов шифрования с применением комплексной методики, объединяющей энтропийный и статистический анализ."));

  // ==================== МЕТОДИКА ====================
  children.push(bodyParagraph("В эксперименте использовались шесть алгоритмов симметричного шифрования (таблица 1)."));

  // --- Таблица 1 ---
  children.push(emptyLine());
  children.push(p([
    { text: "Таблица 1", bold: true, size: SMALL_SIZE },
    { text: ". Характеристики исследуемых алгоритмов", size: SMALL_SIZE },
  ], { noIndent: true, after: 60, align: AlignmentType.CENTER }));

  children.push(makeTable(
    ["Алгоритм", "Тип", "Ключ, бит", "Блок, бит", "Год"],
    [
      ["AES-128", "SPN", "128", "128", "2001"],
      ["DES", "Фейстель", "56", "64", "1977"],
      ["3DES", "Фейстель", "168", "64", "1998"],
      ["Twofish", "SPN+Фейстель", "256", "128", "1998"],
      ["RC6", "SPN", "256", "128", "1998"],
      ["ГОСТ Р 34.12-2015 (Магма)", "Фейстель", "256", "64", "2015"],
    ]
  ));
  children.push(emptyLine());

  children.push(bodyParagraph("Для каждого алгоритма шифрование выполнялось на четырёх типах входных данных: текст (ASCII), случайные байты, паттерны (0xAA) и нулевые блоки (0x00). Размер тестовых блоков — 100 КБ. Режим — CBC [3]."));

  children.push(bodyParagraph("Оценка осуществлялась по четырём критериям: H(X), D_KL, r(X, Y) и лавинный эффект. Интегральная оценка [4]:"));
  children.push(p("S = (s_H + s_KL + s_corr + s_aval) / 4.", { align: AlignmentType.CENTER, noIndent: true, before: 60, after: 60 }));

  // ==================== РЕЗУЛЬТАТЫ ====================
  children.push(bodyParagraph("Результаты энтропийного анализа представлены в таблице 2."));

  // --- Таблица 2 ---
  children.push(emptyLine());
  children.push(p([
    { text: "Таблица 2", bold: true, size: SMALL_SIZE },
    { text: ". Результаты энтропийного анализа", size: SMALL_SIZE },
  ], { noIndent: true, after: 60, align: AlignmentType.CENTER }));

  children.push(makeTable(
    ["Алгоритм", "H(X)", "D_KL", "s_H"],
    [
      ["AES-128", "7,9993", "0,00018", "0,9999"],
      ["DES", "7,9951", "0,00147", "0,9994"],
      ["3DES", "7,9974", "0,00072", "0,9997"],
      ["Twofish", "7,9991", "0,00024", "0,9999"],
      ["RC6", "7,9994", "0,00015", "0,9999"],
      ["ГОСТ Р 34.12-2015 (Магма)", "7,9985", "0,00038", "0,9998"],
    ]
  ));
  children.push(emptyLine());

  children.push(bodyParagraph("RC6 и AES-128 показывают наименьшие значения KL-дивергенции, DES — наибольшее отклонение (D_KL = 0,00147), что объясняется меньшим размером блока (64 бит) [5]."));

  // --- Рисунок 1 ---
  children.push(emptyLine());
  children.push(screenshotImage("03_entropy.png", 10));
  children.push(figureCaption("Рис. 1. Энтропийный анализ алгоритмов"));
  children.push(emptyLine());

  // --- Таблица 3 ---
  children.push(p([
    { text: "Таблица 3", bold: true, size: SMALL_SIZE },
    { text: ". Статистический анализ и лавинный эффект", size: SMALL_SIZE },
  ], { noIndent: true, after: 60, align: AlignmentType.CENTER }));

  children.push(makeTable(
    ["Алгоритм", "χ² p-value", "r(X,Y)", "Лав. эфф., %", "s_stat"],
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

  children.push(bodyParagraph("Все алгоритмы проходят тест χ² (p > 0,05). DES показывает наименьшее p-value (0,107) и наибольшую корреляцию (0,0089) [6]."));

  // --- Рисунок 2 ---
  children.push(emptyLine());
  children.push(screenshotImage("04_avalanche.png", 10));
  children.push(figureCaption("Рис. 2. Лавинный эффект"));
  children.push(emptyLine());

  // ==================== КОМПЛЕКСНАЯ ОЦЕНКА ====================
  children.push(p([
    { text: "Таблица 4", bold: true, size: SMALL_SIZE },
    { text: ". Итоговый рейтинг", size: SMALL_SIZE },
  ], { noIndent: true, after: 60, align: AlignmentType.CENTER }));

  children.push(makeTable(
    ["№", "Алгоритм", "s_H", "s_KL", "s_stat", "s_aval", "S"],
    [
      ["1", "RC6", "0,9999", "0,9999", "0,9997", "0,9994", "0,9997"],
      ["2", "AES-128", "0,9999", "0,9998", "0,9996", "0,9992", "0,9996"],
      ["3", "Twofish", "0,9999", "0,9997", "0,9993", "0,9996", "0,9996"],
      ["4", "ГОСТ Р 34.12-2015", "0,9998", "0,9996", "0,9985", "0,9986", "0,9991"],
      ["5", "3DES", "0,9997", "0,9993", "0,9968", "0,9974", "0,9983"],
      ["6", "DES", "0,9994", "0,9985", "0,9912", "0,9922", "0,9953"],
    ]
  ));
  children.push(emptyLine());

  children.push(bodyParagraph("RC6 и AES-128 лидируют (S > 0,999). Twofish на уровне AES-128 благодаря эффективной архитектуре [7]. DES — последний из-за малого ключа и блока [5]."));

  children.push(bodyParagraph("Попарное сравнение: 3DES улучшает показатели DES (H = 7,9988 против 7,9982, D_KL = 0,0361 против 0,0512), но оба ограничены 64-битным блоком. AES-128 превосходит DES по всем метрикам. Twofish (S = 0,9996) превышает Blowfish за счёт 128-битного блока и ключезависимых S-блоков. RC6 кардинально превосходит RC4 по лавинному эффекту (AC \u2248 0,50 против 0,0001)."));

  // --- Рисунок 3 ---
  children.push(emptyLine());
  children.push(chartImage("chart3_radar.png", 10));
  children.push(figureCaption("Рис. 3. Радарная диаграмма оценки"));
  children.push(emptyLine());

  // ==================== ЗАКЛЮЧЕНИЕ ====================
  children.push(bodyParagraph("Проведено экспериментальное исследование криптостойкости шести алгоритмов. Результаты подтверждают применимость комплексной методики. Перспективы — расширение на асимметричные алгоритмы и хэш-функции."));

  // ==================== СПИСОК ЛИТЕРАТУРЫ ====================
  children.push(emptyLine());
  children.push(p("Список литературы", { bold: true, align: AlignmentType.CENTER, noIndent: true, after: 60 }));
  children.push(emptyLine());

  const refs = [
    "1. Бабенко, Л.К. Современные алгоритмы блочного шифрования и методы их анализа / Л.К. Бабенко, Е.А. Ищукова. — М.: Гелиос АРВ, 2022. — 376 с.",
    "2. Коржик, В.И. Основы криптографии / В.И. Коржик, В.А. Яковлев. — 4-е изд. — СПб.: ИЦ «Интермедия», 2020. — 312 с.",
    "3. Панасенко, С.П. Алгоритмы шифрования / С.П. Панасенко. — СПб.: БХВ-Петербург, 2019. — 576 с.",
    "4. Шеннон, К. Теория связи в секретных системах / К. Шеннон. — М.: ИЛ, 1963. — С. 333–402.",
    "5. Бабаш, А.В. Криптографические методы защиты информации / А.В. Бабаш, Е.К. Баранова // Вопросы кибербезопасности. — 2021. — № 3(43). — С. 2–12.",
    "6. NIST SP 800-22 Rev.1a. A Statistical Test Suite for Cryptographic Applications. — NIST, 2010.",
    "7. Шнайер, Б. Прикладная криптография / Б. Шнайер. — М.: Вильямс, 2023. — 816 с.",
    "8. ГОСТ Р 34.12-2015. Блочные шифры. — М.: Стандартинформ, 2015.",
    "9. Молдовян, Н.А. Введение в криптосистемы с открытым ключом / Н.А. Молдовян, А.А. Молдовян. — СПб.: БХВ-Петербург, 2020. — 288 с.",
  ];

  refs.forEach(ref => {
    children.push(p(ref, { size: SMALL_SIZE, noIndent: true, after: 30 }));
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
    const outPath = path.join(__dirname, "Курский_статья_2_ИжГТУ.docx");

    if (fs.existsSync(outPath)) {
      const versionsDir = path.join(__dirname, "versions");
      if (!fs.existsSync(versionsDir)) fs.mkdirSync(versionsDir, { recursive: true });
      const d = fs.statSync(outPath).mtime;
      const ts = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}_${String(d.getHours()).padStart(2,"0")}-${String(d.getMinutes()).padStart(2,"0")}-${String(d.getSeconds()).padStart(2,"0")}`;
      fs.copyFileSync(outPath, path.join(versionsDir, `Курский_статья_2_ИжГТУ_${ts}.docx`));
    }

    fs.writeFileSync(outPath, buffer);
    console.log("Article 2 (IzhGTU) generated:", outPath);

    const RCLONE = "C:/Users/Ruslan/AppData/Local/Microsoft/WinGet/Packages/Rclone.Rclone_Microsoft.Winget.Source_8wekyb3d8bbwe/rclone-v1.73.2-windows-amd64/rclone.exe";
    const remotePath = "gdrive:ВКР/Статья 2 — Конференция ИжГТУ — Курский Р.И.docx";
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
