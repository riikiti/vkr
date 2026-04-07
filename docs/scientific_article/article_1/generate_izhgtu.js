const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, ImageRun, BorderStyle, WidthType, ShadingType
} = require(path.join(__dirname, "../../vkr/node_modules/docx"));

// ==================== ИжГТУ FORMAT CONSTANTS ====================
// A5 paper, margins from example
const PAGE_WIDTH = 8391;
const PAGE_HEIGHT = 11907;
const MARGIN_TOP = 964;
const MARGIN_BOTTOM = 1304;
const MARGIN_LEFT = 1247;
const MARGIN_RIGHT = 1021;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

// Font sizes in half-points
const BODY_SIZE = 20;     // 10pt
const SMALL_SIZE = 18;    // 9pt (tables, captions, refs)
const LINE_SPACING = 240; // single
const INDENT = 283;       // 0.5cm

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

  // --- Авторы RU (italic, centered) ---
  children.push(p("К.В. Дергачев, кандидат технических наук, доцент", {
    size: BODY_SIZE, italics: true, align: AlignmentType.CENTER, noIndent: true,
  }));
  children.push(p("Р.И. Курский, магистрант", {
    size: BODY_SIZE, italics: true, align: AlignmentType.CENTER, noIndent: true,
  }));

  // --- Кафедра / Организация RU ---
  children.push(p("кафедра «Информатика и программное обеспечение»", {
    size: BODY_SIZE, align: AlignmentType.CENTER, noIndent: true,
  }));
  children.push(p("Брянский государственный технический университет", {
    size: BODY_SIZE, align: AlignmentType.CENTER, noIndent: true,
  }));

  children.push(emptyLine());

  // --- Authors EN (italic, centered) ---
  children.push(p("K.V. Dergachev, PhD in Engineering, Associate Professor", {
    size: BODY_SIZE, italics: true, align: AlignmentType.CENTER, noIndent: true,
  }));
  children.push(p("R.I. Kurskiy, Master's Degree Student", {
    size: BODY_SIZE, italics: true, align: AlignmentType.CENTER, noIndent: true,
  }));

  // --- Department / Organization EN ---
  children.push(p("Department of Computer Science and Software Engineering", {
    size: BODY_SIZE, align: AlignmentType.CENTER, noIndent: true,
  }));
  children.push(p("Bryansk State Technical University", {
    size: BODY_SIZE, align: AlignmentType.CENTER, noIndent: true,
  }));

  children.push(emptyLine());

  // --- Название RU ---
  children.push(p("Применение энтропийного анализа для оценки качества криптографических преобразований", {
    bold: true, align: AlignmentType.CENTER, noIndent: true,
  }));

  children.push(emptyLine());

  // --- Title EN ---
  children.push(p("Application of entropy analysis for evaluating the quality of cryptographic transformations", {
    bold: true, align: AlignmentType.CENTER, noIndent: true,
  }));

  children.push(emptyLine());

  // --- Аннотация RU ---
  children.push(p("В статье рассматривается применение энтропийных метрик для количественной оценки качества криптографических преобразований. Проанализированы существующие подходы к оценке криптостойкости алгоритмов шифрования: формальный криптоанализ, стандартизированные статистические тесты и энтропийный анализ. Систематизированы четыре ключевые метрики информационно-теоретического подхода: энтропия Шеннона, расхождение Кульбака–Лейблера, условная энтропия и взаимная информация. Для каждой метрики определены идеальные значения в контексте оценки шифртекста и обоснована криптографическая интерпретация. Предложена система критериев оценки качества криптографических преобразований, основанная на комплексном применении энтропийных метрик с нормализацией к единой шкале.", { noIndent: true }));

  children.push(emptyLine());

  // --- Abstract EN ---
  children.push(p("The paper considers the application of entropy metrics for quantitative evaluation of the quality of cryptographic transformations. Existing approaches to assessing cryptographic strength are analyzed: formal cryptanalysis, standardized statistical tests, and entropy analysis. Four key metrics of the information-theoretic approach are systematized: Shannon entropy, Kullback–Leibler divergence, conditional entropy, and mutual information. For each metric, ideal values in the context of ciphertext evaluation are determined and cryptographic interpretation is provided. A system of criteria for evaluating the quality of cryptographic transformations is proposed, based on the comprehensive application of entropy metrics with normalization to a unified scale.", { noIndent: true }));

  children.push(emptyLine());

  // --- Ключевые слова ---
  children.push(p([
    { text: "Ключевые слова: ", bold: true },
    { text: "энтропия Шеннона; криптостойкость; энтропийный анализ; расхождение Кульбака–Лейблера; криптографические преобразования; симметричное шифрование; информационная безопасность." },
  ], { noIndent: true }));

  children.push(emptyLine());

  children.push(p([
    { text: "Keywords: ", bold: true },
    { text: "Shannon entropy; cryptographic strength; entropy analysis; Kullback–Leibler divergence; cryptographic transformations; symmetric encryption; information security." },
  ], { noIndent: true }));

  children.push(emptyLine());

  // ==================== ВВЕДЕНИЕ ====================
  children.push(bodyParagraph("Криптографические методы защиты информации являются одним из ключевых элементов обеспечения информационной безопасности в современных информационных системах. С ростом объёмов передаваемых данных и числа кибератак требования к надёжности алгоритмов шифрования существенно возрастают. По данным аналитических отчётов в области информационной безопасности, количество инцидентов, связанных с компрометацией зашифрованных данных, ежегодно увеличивается [1], что подчёркивает необходимость объективных методов оценки качества криптографических преобразований."));

  children.push(bodyParagraph("Дополнительную актуальность данной проблеме придаёт развитие квантовых вычислений, которые потенциально способны существенно снизить стойкость ряда широко используемых алгоритмов [2]. В этих условиях возникает потребность в универсальных количественных методах, позволяющих оценивать криптостойкость алгоритмов независимо от их внутренней структуры."));

  children.push(bodyParagraph("Традиционные подходы к оценке криптостойкости — формальный криптоанализ и экспертные оценки — обладают рядом ограничений: высокая трудоёмкость, зависимость от конкретной архитектуры алгоритма. Стандартизированные наборы тестов (например, NIST SP 800-22) обеспечивают статистическую проверку выходных последовательностей, однако не предоставляют интегральной оценки, основанной на фундаментальных принципах теории информации [3]."));

  children.push(bodyParagraph("Информационно-теоретический подход, основанный на энтропийном анализе, позволяет оценивать качество криптографических преобразований с позиции количественной меры неопределённости. Данный подход восходит к работам К. Шеннона [4]. Целью настоящей статьи является систематизация энтропийных методов оценки качества криптографических преобразований и обоснование их применимости в качестве универсального инструмента анализа."));

  // ==================== СУЩЕСТВУЮЩИЕ ПОДХОДЫ ====================
  children.push(bodyParagraph("Оценка криптостойкости алгоритмов шифрования может осуществляться с использованием трёх основных подходов: формального криптоанализа, статистического тестирования и энтропийного анализа."));

  children.push(bodyParagraph("Формальный криптоанализ включает методы дифференциального и линейного криптоанализа, направленные на выявление закономерностей в работе конкретных алгоритмов. Дифференциальный криптоанализ исследует распространение различий во входных данных через раунды шифрования [5]. Основными недостатками формальных методов являются высокая вычислительная сложность и невозможность применения единой методики к различным шифрам."));

  children.push(bodyParagraph("Статистическое тестирование представлено стандартизированными наборами тестов, наиболее известным из которых является NIST SP 800-22 [3]. Данный набор включает 15 статистических тестов, проверяющих случайность выходных последовательностей. Достоинством подхода является стандартизация, однако тесты оценивают лишь отдельные статистические свойства, не формируя целостной картины качества криптографического преобразования."));

  children.push(bodyParagraph("Энтропийный анализ опирается на фундаментальные положения теории информации и позволяет количественно оценить степень неопределённости, вносимую криптографическим преобразованием. В отличие от формального криптоанализа, энтропийный подход не требует знания внутренней структуры алгоритма [6]. Сравнительная характеристика подходов представлена в таблице 1."));

  // --- Таблица 1 ---
  children.push(emptyLine());
  children.push(p([
    { text: "Таблица 1", bold: true, size: SMALL_SIZE },
    { text: ". Сравнение подходов к оценке криптостойкости", size: SMALL_SIZE },
  ], { noIndent: true, after: 60, align: AlignmentType.CENTER }));

  children.push(makeTable(
    ["Критерий", "Формальный криптоанализ", "Стат. тестирование", "Энтропийный анализ"],
    [
      ["Универсальность", "Низкая", "Средняя", "Высокая"],
      ["Выч. сложность", "Высокая", "Средняя", "Низкая"],
      ["Алг.-независимость", "Нет", "Частично", "Да"],
      ["Интерпретируемость", "Экспертиза", "Средняя", "Высокая"],
      ["Интегр. оценка", "Нет", "Нет", "Возможна"],
    ]
  ));
  children.push(emptyLine());

  children.push(bodyParagraph("Как следует из таблицы, энтропийный анализ обладает рядом преимуществ, делающих его перспективным инструментом для комплексной оценки криптографических преобразований."));

  // ==================== ЭНТРОПИЙНЫЕ МЕТРИКИ ====================
  children.push(bodyParagraph("Рассмотрим четыре ключевые метрики, составляющие основу энтропийного подхода к оценке качества криптографических преобразований."));

  children.push(p([
    { text: "Энтропия Шеннона.", italics: true },
    { text: " Энтропия Шеннона является фундаментальной мерой неопределённости случайной величины. Для дискретной случайной величины X с алфавитом из N символов энтропия определяется как [4]:" },
  ], { bodyIndent: true }));

  children.push(p("H(X) = −∑ p(xᵢ) log₂ p(xᵢ),", { align: AlignmentType.CENTER, noIndent: true, before: 60, after: 60 }));

  children.push(bodyParagraph("где p(xᵢ) — вероятность появления i-го символа. Максимальное значение энтропии H_max = log₂(N) достигается при равномерном распределении символов. Для побайтового анализа (N = 256) идеальное значение составляет H_max = 8,0 бит/байт."));

  children.push(p([
    { text: "Расхождение Кульбака–Лейблера.", italics: true },
    { text: " KL-дивергенция количественно оценивает отличие распределения P от эталонного Q [7]:" },
  ], { bodyIndent: true }));

  children.push(p("D_KL(P‖Q) = ∑ P(xᵢ) log₂(P(xᵢ) / Q(xᵢ)).", { align: AlignmentType.CENTER, noIndent: true, before: 60, after: 60 }));

  children.push(bodyParagraph("Идеальное значение D_KL = 0 означает полное совпадение с равномерным распределением. KL-дивергенция более чувствительна к малым отклонениям от равномерности [8]."));

  children.push(p([
    { text: "Условная энтропия.", italics: true },
    { text: " H(Y|X) характеризует остаточную неопределённость шифртекста Y при известном открытом тексте X:" },
  ], { bodyIndent: true }));

  children.push(p("H(Y|X) = −∑ p(x, y) log₂ p(y|x).", { align: AlignmentType.CENTER, noIndent: true, before: 60, after: 60 }));

  children.push(bodyParagraph("Система обладает совершенной секретностью, когда H(Y|X) = H(Y), то есть знание открытого текста не уменьшает неопределённость шифртекста [4]."));

  children.push(p([
    { text: "Взаимная информация.", italics: true },
    { text: " I(X; Y) измеряет количество информации, которое шифртекст содержит об открытом тексте:" },
  ], { bodyIndent: true }));

  children.push(p("I(X; Y) = H(X) + H(Y) − H(X, Y) = H(Y) − H(Y|X).", { align: AlignmentType.CENTER, noIndent: true, before: 60, after: 60 }));

  children.push(bodyParagraph("Идеальное значение I(X; Y) = 0 означает статистическую независимость открытого текста и шифртекста [6]."));

  // --- Рисунок 1 ---
  children.push(emptyLine());
  children.push(screenshotImage("03_entropy.png", 10));
  children.push(figureCaption("Рис. 1. Визуализация энтропийного анализа"));
  children.push(emptyLine());

  // ==================== СИСТЕМА КРИТЕРИЕВ ====================
  children.push(bodyParagraph("На основе рассмотренных метрик предлагается система критериев комплексной оценки. Каждая метрика преобразуется в нормализованный показатель на шкале [0, 1], где 1 — идеальное значение: s_H = H(X)/H_max; s_KL = 1/(1 + D_KL); s_cond = H(Y|X)/H(Y); s_MI = 1 − I(X;Y)/H(X). Интегральная оценка:"));

  children.push(p("S = (s_H + s_KL + s_cond + s_MI) / 4.", { align: AlignmentType.CENTER, noIndent: true, before: 60, after: 60 }));

  children.push(bodyParagraph("Значение S, близкое к 1, свидетельствует о высоком качестве криптографического преобразования. Предложенная система позволяет ранжировать алгоритмы и выявлять конкретные направления, по которым алгоритм демонстрирует слабости [9]."));

  // --- Рисунок 2 ---
  children.push(emptyLine());
  children.push(screenshotImage("06_comparison.png", 10));
  children.push(figureCaption("Рис. 2. Радарная диаграмма комплексной оценки"));
  children.push(emptyLine());

  // ==================== ЗАКЛЮЧЕНИЕ ====================
  children.push(bodyParagraph("В настоящей статье систематизированы четыре ключевые энтропийные метрики для оценки качества криптографических преобразований. Проведён сравнительный анализ подходов к оценке криптостойкости. Предложена система критериев на основе нормализации метрик к единой шкале [0, 1]. Перспективным направлением является экспериментальная проверка предложенной системы на конкретных алгоритмах симметричного шифрования."));

  // ==================== СПИСОК ЛИТЕРАТУРЫ ====================
  children.push(emptyLine());
  children.push(p("Список литературы", { bold: true, align: AlignmentType.CENTER, noIndent: true, after: 60 }));
  children.push(emptyLine());

  const refs = [
    "1. Бабенко, Л.К. Современные алгоритмы блочного шифрования и методы их анализа / Л.К. Бабенко, Е.А. Ищукова. — М.: Гелиос АРВ, 2022. — 376 с.",
    "2. Бабаш, А.В. Криптографические методы защиты информации в условиях развития квантовых вычислений / А.В. Бабаш, Е.К. Баранова // Вопросы кибербезопасности. — 2021. — № 3(43). — С. 2–12.",
    "3. NIST SP 800-22 Rev.1a. A Statistical Test Suite for Random and Pseudorandom Number Generators for Cryptographic Applications. — NIST, 2010.",
    "4. Шеннон, К. Теория связи в секретных системах / К. Шеннон // В мире математики. — М.: ИЛ, 1963. — С. 333–402.",
    "5. Панасенко, С.П. Алгоритмы шифрования: специальный справочник / С.П. Панасенко. — СПб.: БХВ-Петербург, 2019. — 576 с.",
    "6. Коржик, В.И. Основы криптографии / В.И. Коржик, В.А. Яковлев. — 4-е изд. — СПб.: ИЦ «Интермедия», 2020. — 312 с.",
    "7. Кульбак, С. Теория информации и статистика / С. Кульбак. — М.: Наука, 1967. — 408 с.",
    "8. Шнайер, Б. Прикладная криптография / Б. Шнайер. — М.: Вильямс, 2023. — 816 с.",
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
    const outPath = path.join(__dirname, "Курский_статья_1_ИжГТУ.docx");

    if (fs.existsSync(outPath)) {
      const versionsDir = path.join(__dirname, "versions");
      if (!fs.existsSync(versionsDir)) fs.mkdirSync(versionsDir, { recursive: true });
      const d = fs.statSync(outPath).mtime;
      const ts = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}_${String(d.getHours()).padStart(2,"0")}-${String(d.getMinutes()).padStart(2,"0")}-${String(d.getSeconds()).padStart(2,"0")}`;
      fs.copyFileSync(outPath, path.join(versionsDir, `Курский_статья_1_ИжГТУ_${ts}.docx`));
    }

    fs.writeFileSync(outPath, buffer);
    console.log("Article 1 (IzhGTU) generated:", outPath);

    const RCLONE = "C:/Users/Ruslan/AppData/Local/Microsoft/WinGet/Packages/Rclone.Rclone_Microsoft.Winget.Source_8wekyb3d8bbwe/rclone-v1.73.2-windows-amd64/rclone.exe";
    const remotePath = "gdrive:ВКР/Статья 1 — Конференция ИжГТУ — Курский Р.И.docx";
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
