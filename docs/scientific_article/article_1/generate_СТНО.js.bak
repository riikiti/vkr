const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, ImageRun, BorderStyle, WidthType, ShadingType
} = require(path.join(__dirname, "../../vkr/node_modules/docx"));

// ==================== СТНО FORMAT CONSTANTS ====================
// A4, margins 2cm all sides
const PAGE_WIDTH = 11906;
const PAGE_HEIGHT = 16838;
const MARGIN = 1134; // 2cm
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2; // ~9638 DXA

// Font sizes in half-points
const BODY_SIZE = 24;     // 12pt — Liberation Serif body
const TITLE_SIZE = 26;    // 13pt — title
const SMALL_SIZE = 20;    // 10pt — UDK, authors, abstract, refs
const LINE_SPACING = 240; // single
const INDENT = 709;       // 1.25cm

const FONT = "Times New Roman"; // fallback for Liberation Serif

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
    children: [new ImageRun({
      type: "png",
      data,
      transformation: { width: widthPx, height: heightPx },
    })],
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
          size: SMALL_SIZE,
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
        children: headers.map(h => makeCell(h, { width: colWidth })),
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

  // --- УДК ---
  children.push(p("УДК 003.26; 519.72", { size: SMALL_SIZE, noIndent: true, align: AlignmentType.LEFT }));
  children.push(emptyLine());

  // --- Название RU ---
  children.push(p("Применение энтропийного анализа для оценки качества криптографических преобразований", {
    size: TITLE_SIZE, align: AlignmentType.CENTER, noIndent: true, after: 60,
  }));

  // --- Авторы RU ---
  children.push(p("К.В. Дергачев, Р.И. Курский", {
    size: SMALL_SIZE, bold: true, align: AlignmentType.CENTER, noIndent: true,
  }));

  // --- Организация RU ---
  children.push(p("Брянский государственный технический университет, г. Брянск, Россия", {
    size: SMALL_SIZE, italics: true, align: AlignmentType.CENTER, noIndent: true, after: 120,
  }));

  // --- Аннотация RU ---
  children.push(p([
    { text: "Аннотация. ", italics: true, size: SMALL_SIZE },
    { text: "В статье рассматривается применение энтропийных метрик для количественной оценки качества криптографических преобразований. Проанализированы существующие подходы к оценке криптостойкости алгоритмов шифрования: формальный криптоанализ, стандартизированные статистические тесты и энтропийный анализ. Систематизированы четыре ключевые метрики информационно-теоретического подхода: энтропия Шеннона, расхождение Кульбака–Лейблера, условная энтропия и взаимная информация. Предложена система критериев оценки качества криптографических преобразований, основанная на комплексном применении энтропийных метрик с нормализацией к единой шкале.", size: SMALL_SIZE },
  ], { noIndent: true, size: SMALL_SIZE }));

  // --- Ключевые слова RU ---
  children.push(p([
    { text: "Ключевые слова: ", italics: true, size: SMALL_SIZE },
    { text: "энтропия Шеннона, криптостойкость, энтропийный анализ, расхождение Кульбака–Лейблера, криптографические преобразования, симметричное шифрование, информационная безопасность.", size: SMALL_SIZE },
  ], { noIndent: true, size: SMALL_SIZE, after: 180 }));

  // --- Title EN ---
  children.push(p("APPLICATION OF ENTROPY ANALYSIS FOR EVALUATING THE QUALITY OF CRYPTOGRAPHIC TRANSFORMATIONS", {
    size: TITLE_SIZE, align: AlignmentType.CENTER, noIndent: true, after: 60,
  }));

  // --- Authors EN ---
  children.push(p("K.V. Dergachev, R.I. Kurskiy", {
    size: SMALL_SIZE, bold: true, align: AlignmentType.CENTER, noIndent: true,
  }));

  // --- Affiliation EN ---
  children.push(p("Bryansk State Technical University, Bryansk, Russia", {
    size: SMALL_SIZE, italics: true, align: AlignmentType.CENTER, noIndent: true, after: 120,
  }));

  // --- Abstract EN ---
  children.push(p([
    { text: "Abstract. ", italics: true, size: SMALL_SIZE },
    { text: "The paper considers the application of entropy metrics for quantitative evaluation of the quality of cryptographic transformations. Existing approaches to assessing cryptographic strength are analyzed: formal cryptanalysis, standardized statistical tests, and entropy analysis. Four key metrics of the information-theoretic approach are systematized: Shannon entropy, Kullback–Leibler divergence, conditional entropy, and mutual information. A system of criteria for evaluating the quality of cryptographic transformations is proposed, based on the comprehensive application of entropy metrics with normalization to a unified scale.", size: SMALL_SIZE },
  ], { noIndent: true, size: SMALL_SIZE }));

  // --- Keywords EN ---
  children.push(p([
    { text: "Keywords: ", italics: true, size: SMALL_SIZE },
    { text: "Shannon entropy, cryptographic strength, entropy analysis, Kullback–Leibler divergence, cryptographic transformations, symmetric encryption, information security.", size: SMALL_SIZE },
  ], { noIndent: true, size: SMALL_SIZE, after: 240 }));

  // ==================== ВВЕДЕНИЕ ====================
  children.push(p("Введение", { bold: true, bodyIndent: true }));

  children.push(bodyParagraph("Криптографические методы защиты информации являются одним из ключевых элементов обеспечения информационной безопасности в современных информационных системах. С ростом объёмов передаваемых данных и числа кибератак требования к надёжности алгоритмов шифрования существенно возрастают. По данным аналитических отчётов в области информационной безопасности, количество инцидентов, связанных с компрометацией зашифрованных данных, ежегодно увеличивается [1], что подчёркивает необходимость объективных методов оценки качества криптографических преобразований."));

  children.push(bodyParagraph("Дополнительную актуальность данной проблеме придаёт развитие квантовых вычислений, которые потенциально способны существенно снизить стойкость ряда широко используемых алгоритмов [2]. В этих условиях возникает потребность в универсальных количественных методах, позволяющих оценивать криптостойкость алгоритмов независимо от их внутренней структуры."));

  children.push(bodyParagraph("Традиционные подходы к оценке криптостойкости — формальный криптоанализ и экспертные оценки — обладают рядом ограничений: высокая трудоёмкость, зависимость от конкретной архитектуры алгоритма. Стандартизированные наборы тестов (например, NIST SP 800-22) обеспечивают статистическую проверку выходных последовательностей, однако не предоставляют интегральной оценки, основанной на фундаментальных принципах теории информации [3]."));

  children.push(bodyParagraph("Информационно-теоретический подход, основанный на энтропийном анализе, позволяет оценивать качество криптографических преобразований с позиции количественной меры неопределённости. Данный подход восходит к работам К. Шеннона [4]. Целью настоящей статьи является систематизация энтропийных методов оценки качества криптографических преобразований и обоснование их применимости в качестве универсального инструмента анализа."));

  // ==================== СУЩЕСТВУЮЩИЕ ПОДХОДЫ ====================
  children.push(p("Существующие подходы к оценке криптостойкости", { bold: true, bodyIndent: true, before: 120 }));

  children.push(bodyParagraph("Оценка криптостойкости алгоритмов шифрования может осуществляться с использованием трёх основных подходов: формального криптоанализа, статистического тестирования и энтропийного анализа."));

  children.push(bodyParagraph("Формальный криптоанализ включает методы дифференциального и линейного криптоанализа, направленные на выявление закономерностей в работе конкретных алгоритмов. Дифференциальный криптоанализ исследует распространение различий во входных данных через раунды шифрования [5]. Основными недостатками формальных методов являются высокая вычислительная сложность и невозможность применения единой методики к различным шифрам."));

  children.push(bodyParagraph("Статистическое тестирование представлено стандартизированными наборами тестов, наиболее известным из которых является NIST SP 800-22 [3]. Данный набор включает 15 статистических тестов, проверяющих случайность выходных последовательностей. Достоинством подхода является стандартизация, однако тесты оценивают лишь отдельные статистические свойства, не формируя целостной картины качества криптографического преобразования."));

  children.push(bodyParagraph("Энтропийный анализ опирается на фундаментальные положения теории информации и позволяет количественно оценить степень неопределённости, вносимую криптографическим преобразованием. В отличие от формального криптоанализа, энтропийный подход не требует знания внутренней структуры алгоритма [6]. Сравнительная характеристика подходов представлена в таблице 1."));

  // --- Таблица 1 ---
  children.push(emptyLine());
  children.push(p([
    { text: "Таблица 1. ", bold: true, size: SMALL_SIZE },
    { text: "Сравнение подходов к оценке криптостойкости", bold: true, size: SMALL_SIZE },
  ], { noIndent: true, after: 60, align: AlignmentType.RIGHT }));

  children.push(makeTable(
    ["Критерий", "Формальный криптоанализ", "Статистическое тестирование", "Энтропийный анализ"],
    [
      ["Универсальность", "Низкая", "Средняя", "Высокая"],
      ["Вычислительная сложность", "Высокая", "Средняя", "Низкая"],
      ["Алгоритмонезависимость", "Нет", "Частично", "Да"],
      ["Интерпретируемость", "Требует экспертизы", "Средняя", "Высокая"],
      ["Интегральная оценка", "Нет", "Нет", "Возможна"],
    ]
  ));
  children.push(emptyLine());

  children.push(bodyParagraph("Как следует из таблицы, энтропийный анализ обладает рядом преимуществ, делающих его перспективным инструментом для комплексной оценки криптографических преобразований."));

  // ==================== ЭНТРОПИЙНЫЕ МЕТРИКИ ====================
  children.push(p("Энтропийные метрики оценки криптографических преобразований", { bold: true, bodyIndent: true, before: 120 }));

  children.push(bodyParagraph("Рассмотрим четыре ключевые метрики, составляющие основу энтропийного подхода к оценке качества криптографических преобразований."));

  // --- Энтропия Шеннона ---
  children.push(p([
    { text: "Энтропия Шеннона.", italics: true },
    { text: " Энтропия Шеннона является фундаментальной мерой неопределённости случайной величины. Для дискретной случайной величины X с алфавитом из N символов энтропия определяется как [4]:" },
  ], { bodyIndent: true }));

  children.push(p("H(X) = −∑ p(xᵢ) log₂ p(xᵢ),", { align: AlignmentType.CENTER, noIndent: true, before: 60, after: 60 }));

  children.push(bodyParagraph("где p(xᵢ) — вероятность появления i-го символа. Максимальное значение энтропии H_max = log₂(N) достигается при равномерном распределении символов. Для побайтового анализа (N = 256) идеальное значение составляет H_max = 8,0 бит/байт. Близость энтропии шифртекста к максимальному значению свидетельствует о высокой степени рассеивания статистических закономерностей исходного текста."));

  // --- KL-дивергенция ---
  children.push(p([
    { text: "Расхождение Кульбака–Лейблера.", italics: true },
    { text: " KL-дивергенция количественно оценивает отличие распределения вероятностей P от эталонного распределения Q [7]:" },
  ], { bodyIndent: true }));

  children.push(p("D_KL(P‖Q) = ∑ P(xᵢ) log₂(P(xᵢ) / Q(xᵢ)).", { align: AlignmentType.CENTER, noIndent: true, before: 60, after: 60 }));

  children.push(bodyParagraph("При оценке криптографических преобразований в качестве эталонного принимается равномерное распределение Q(xᵢ) = 1/N, а P представляет собой эмпирическое распределение байтов шифртекста. Идеальное значение D_KL = 0 означает полное совпадение с равномерным распределением. В отличие от энтропии Шеннона, KL-дивергенция явно измеряет степень отклонения от идеала, что делает её более чувствительной к малым отклонениям [8]."));

  // --- Условная энтропия ---
  children.push(p([
    { text: "Условная энтропия.", italics: true },
    { text: " Условная энтропия H(Y|X) характеризует остаточную неопределённость шифртекста Y при известном открытом тексте X:" },
  ], { bodyIndent: true }));

  children.push(p("H(Y|X) = −∑ p(x, y) log₂ p(y|x).", { align: AlignmentType.CENTER, noIndent: true, before: 60, after: 60 }));

  children.push(bodyParagraph("Данная метрика непосредственно связана с понятием совершенной секретности, введённым К. Шенноном [4]. Система шифрования обладает совершенной секретностью тогда и только тогда, когда H(Y|X) = H(Y), то есть знание открытого текста не уменьшает неопределённость шифртекста. Близость H(Y|X) к H(Y) служит количественным показателем качества криптографического преобразования."));

  // --- Взаимная информация ---
  children.push(p([
    { text: "Взаимная информация.", italics: true },
    { text: " Взаимная информация I(X; Y) измеряет количество информации, которое шифртекст Y содержит об открытом тексте X:" },
  ], { bodyIndent: true }));

  children.push(p("I(X; Y) = H(X) + H(Y) − H(X, Y) = H(Y) − H(Y|X).", { align: AlignmentType.CENTER, noIndent: true, before: 60, after: 60 }));

  children.push(bodyParagraph("Идеальное значение I(X; Y) = 0 означает статистическую независимость открытого текста и шифртекста. Ненулевое значение указывает на наличие статистической связи, потенциально используемой для криптоанализа. Взаимная информация является прямым индикатором утечки информации через криптографическое преобразование [6]."));

  // --- Рисунок 1: скриншот энтропии ---
  children.push(emptyLine());
  children.push(screenshotImage("03_entropy.png", 16));
  children.push(figureCaption("Рис. 1. Пример визуализации энтропийного анализа в системе CryptoAnalyzer"));
  children.push(emptyLine());

  // ==================== СИСТЕМА КРИТЕРИЕВ ====================
  children.push(p("Система критериев оценки качества криптографических преобразований", { bold: true, bodyIndent: true, before: 120 }));

  children.push(bodyParagraph("На основе рассмотренных метрик предлагается система критериев комплексной оценки качества криптографических преобразований. Каждая метрика преобразуется в нормализованный показатель на шкале [0, 1], где 1 соответствует идеальному значению."));

  children.push(bodyParagraph("Нормализация осуществляется следующим образом: показатель энтропии s_H = H(X) / H_max; показатель KL-дивергенции s_KL = 1 / (1 + D_KL); показатель условной энтропии s_cond = H(Y|X) / H(Y); показатель взаимной информации s_MI = 1 − I(X;Y) / H(X). Интегральная оценка качества криптографического преобразования вычисляется как среднее арифметическое нормализованных показателей:"));

  children.push(p("S = (s_H + s_KL + s_cond + s_MI) / 4.", { align: AlignmentType.CENTER, noIndent: true, before: 60, after: 60 }));

  children.push(bodyParagraph("Значение S, близкое к 1, свидетельствует о высоком качестве криптографического преобразования по совокупности энтропийных критериев. Предложенная система обладает рядом преимуществ перед изолированным применением отдельных тестов: каждая метрика оценивает различный аспект качества преобразования, нормализация обеспечивает сопоставимость показателей, а интегральная оценка позволяет ранжировать алгоритмы [9]."));

  // --- Рисунок 2: скриншот сравнения ---
  children.push(emptyLine());
  children.push(screenshotImage("06_comparison.png", 16));
  children.push(figureCaption("Рис. 2. Радарная диаграмма комплексной оценки алгоритмов шифрования"));
  children.push(emptyLine());

  // ==================== ЗАКЛЮЧЕНИЕ ====================
  children.push(p("Заключение", { bold: true, bodyIndent: true, before: 120 }));

  children.push(bodyParagraph("В настоящей статье систематизированы четыре ключевые энтропийные метрики, применимые для оценки качества криптографических преобразований: энтропия Шеннона, расхождение Кульбака–Лейблера, условная энтропия и взаимная информация. Для каждой метрики определены идеальные значения в контексте криптографии и обоснована их интерпретация."));

  children.push(bodyParagraph("Проведён сравнительный анализ существующих подходов к оценке криптостойкости, показавший преимущества энтропийного анализа: универсальность, алгоритмонезависимость, низкая вычислительная сложность и высокая интерпретируемость результатов."));

  children.push(bodyParagraph("Предложена система критериев оценки качества криптографических преобразований, основанная на нормализации энтропийных метрик к единой шкале [0, 1] и формировании интегральной оценки. Перспективным направлением дальнейших исследований является экспериментальная проверка предложенной системы критериев на конкретных алгоритмах симметричного шифрования."));

  // ==================== БИБЛИОГРАФИЧЕСКИЙ СПИСОК ====================
  children.push(p("Библиографический список", { bold: true, bodyIndent: true, before: 240 }));

  const refs = [
    "1. Бабенко, Л.К. Современные алгоритмы блочного шифрования и методы их анализа / Л.К. Бабенко, Е.А. Ищукова. — М.: Гелиос АРВ, 2022. — 376 с.",
    "2. Бабаш, А.В. Криптографические методы защиты информации в условиях развития квантовых вычислений / А.В. Бабаш, Е.К. Баранова // Вопросы кибербезопасности. — 2021. — № 3(43). — С. 2–12.",
    "3. NIST SP 800-22 Rev.1a. A Statistical Test Suite for Random and Pseudorandom Number Generators for Cryptographic Applications. — National Institute of Standards and Technology, 2010.",
    "4. Шеннон, К. Теория связи в секретных системах / К. Шеннон // В мире математики. Пер. с англ. — М.: ИЛ, 1963. — С. 333–402.",
    "5. Панасенко, С.П. Алгоритмы шифрования: специальный справочник / С.П. Панасенко. — СПб.: БХВ-Петербург, 2019. — 576 с.",
    "6. Коржик, В.И. Основы криптографии: учебное пособие / В.И. Коржик, В.А. Яковлев. — 4-е изд. — СПб.: ИЦ «Интермедия», 2020. — 312 с.",
    "7. Кульбак, С. Теория информации и статистика / С. Кульбак; пер. с англ. — М.: Наука, 1967. — 408 с.",
    "8. Шнайер, Б. Прикладная криптография: протоколы, алгоритмы и исходные коды на языке Си / Б. Шнайер; пер. с англ. — М.: Вильямс, 2023. — 816 с.",
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
          margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
        },
      },
      children,
    }],
  });

  Packer.toBuffer(doc).then(buffer => {
    const outPath = path.join(__dirname, "Курский_статья_1_СТНО.docx");

    // --- Версионность ---
    if (fs.existsSync(outPath)) {
      const versionsDir = path.join(__dirname, "versions");
      if (!fs.existsSync(versionsDir)) fs.mkdirSync(versionsDir, { recursive: true });
      const d = fs.statSync(outPath).mtime;
      const ts = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}_${String(d.getHours()).padStart(2,"0")}-${String(d.getMinutes()).padStart(2,"0")}-${String(d.getSeconds()).padStart(2,"0")}`;
      const versionFile = path.join(versionsDir, `Курский_статья_1_СТНО_${ts}.docx`);
      fs.copyFileSync(outPath, versionFile);
      console.log("Previous version saved:", versionFile);
    }

    fs.writeFileSync(outPath, buffer);
    console.log("Article 1 generated:", outPath);

    // --- Автозагрузка на Google Drive ---
    const RCLONE = "C:/Users/Ruslan/AppData/Local/Microsoft/WinGet/Packages/Rclone.Rclone_Microsoft.Winget.Source_8wekyb3d8bbwe/rclone-v1.73.2-windows-amd64/rclone.exe";
    const remotePath = "gdrive:ВКР/Статья 1 — Энтропийный анализ — Курский Р.И.docx";
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
