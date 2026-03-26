const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, ImageRun,
  HeadingLevel, BorderStyle, WidthType, ShadingType,
  PageNumber, PageBreak, TabStopType, TabStopPosition,
  TableOfContents, Math: OfficeMath, MathRun, SectionType,
  PageOrientation
} = require("docx");

// ==================== FORMATTING CONSTANTS ====================
// A4 page in DXA (1440 DXA = 1 inch, 1 cm = 567 DXA)
const PAGE_WIDTH = 11906;   // A4 width
const PAGE_HEIGHT = 16838;  // A4 height
const MARGIN_TOP = 1134;    // 2cm
const MARGIN_BOTTOM = 1134; // 2cm
const MARGIN_LEFT = 1701;   // 3cm
const MARGIN_RIGHT = 851;   // 1.5cm
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT; // ~9354
const LANDSCAPE_CONTENT_WIDTH = PAGE_HEIGHT - MARGIN_LEFT - MARGIN_RIGHT; // ~14286 (landscape)

// Font sizes in half-points
const FONT_SIZE = 28;       // 14pt
const FONT_SIZE_SMALL = 24; // 12pt

// Line spacing
const LINE_SPACING = 360;   // 1.5 line spacing (240 = single, 360 = 1.5, 480 = double)
const FIRST_LINE_INDENT = 720; // 1.27cm paragraph indent

// ==================== LIST NUMBERING ====================
// Each distinct block of listItem() calls gets its own numbering reference
// so that numbering restarts between separate list blocks.
let bulletListCounter = 0;
let numberedListCounter = 0;

function newBulletList() {
  bulletListCounter++;
  return `bulletList_${bulletListCounter}`;
}

function newNumberedList() {
  numberedListCounter++;
  return `numberedList_${numberedListCounter}`;
}

function generateNumberingConfigs() {
  const configs = [];
  for (let i = 1; i <= bulletListCounter; i++) {
    configs.push({
      reference: `bulletList_${i}`,
      levels: [{
        level: 0, format: LevelFormat.BULLET, text: "\u2013", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 1080, hanging: 360 } } },
      }],
    });
  }
  for (let i = 1; i <= numberedListCounter; i++) {
    configs.push({
      reference: `numberedList_${i}`,
      levels: [{
        level: 0, format: LevelFormat.DECIMAL, text: "%1)", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 1080, hanging: 360 } } },
      }],
    });
  }
  return configs;
}

// ==================== LANDSCAPE SECTION MARKER ====================
// Marker object to wrap content in landscape sections
const LANDSCAPE_START = { __landscapeMarker: "start" };
const LANDSCAPE_END = { __landscapeMarker: "end" };

function isLandscapeMarker(item) {
  return item && item.__landscapeMarker;
}

// ==================== HELPER FUNCTIONS ====================

function normalParagraph(text, options = {}) {
  const runs = [];
  if (typeof text === "string") {
    runs.push(new TextRun({
      text: text,
      font: "Times New Roman",
      size: options.fontSize || FONT_SIZE,
      bold: options.bold || false,
      italics: options.italics || false,
    }));
  } else if (Array.isArray(text)) {
    text.forEach(t => {
      if (t instanceof TextRun) {
        runs.push(t);
      } else if (typeof t === "string") {
        runs.push(new TextRun({ text: t, font: "Times New Roman", size: options.fontSize || FONT_SIZE }));
      } else {
        runs.push(new TextRun({ ...t, font: t.font || "Times New Roman", size: t.size || options.fontSize || FONT_SIZE }));
      }
    });
  }
  return new Paragraph({
    spacing: { after: options.spacingAfter || 0, before: options.spacingBefore || 0, line: options.lineSpacing || LINE_SPACING },
    indent: { firstLine: options.noIndent ? 0 : (options.firstLine !== undefined ? options.firstLine : FIRST_LINE_INDENT) },
    alignment: options.alignment || AlignmentType.JUSTIFIED,
    children: runs,
  });
}

function heading1(text) {
  return new Paragraph({
    spacing: { after: 240, before: 0, line: LINE_SPACING },
    alignment: AlignmentType.CENTER,
    indent: { firstLine: 0 },
    pageBreakBefore: true,
    keepNext: true,
    keepLines: true,
    children: [new TextRun({
      text: text.toUpperCase(),
      font: "Times New Roman",
      size: FONT_SIZE,
      bold: true,
    })],
    heading: HeadingLevel.HEADING_1,
  });
}

function heading2(number, text) {
  return new Paragraph({
    spacing: { after: 240, before: 240, line: LINE_SPACING },
    alignment: AlignmentType.CENTER,
    indent: { firstLine: 0 },
    keepNext: true,
    keepLines: true,
    children: [new TextRun({
      text: `${number} ${text}`,
      font: "Times New Roman",
      size: FONT_SIZE,
      bold: true,
    })],
    heading: HeadingLevel.HEADING_2,
  });
}

function heading3(number, text) {
  return new Paragraph({
    spacing: { after: 240, before: 240, line: LINE_SPACING },
    indent: { firstLine: 0 },
    keepNext: true,
    keepLines: true,
    children: [new TextRun({
      text: `${number} ${text}`,
      font: "Times New Roman",
      size: FONT_SIZE,
      italics: true,
    })],
    heading: HeadingLevel.HEADING_3,
  });
}

function listItem(text, options = {}) {
  if (typeof options === "string") {
    options = options === "numbered" ? { numbered: true } : {};
  }
  const runs = [];
  if (typeof text === "string") {
    runs.push(new TextRun({ text, font: "Times New Roman", size: FONT_SIZE }));
  } else if (Array.isArray(text)) {
    text.forEach(t => {
      if (t instanceof TextRun) {
        runs.push(t);
      } else if (typeof t === "string") {
        runs.push(new TextRun({ text: t, font: "Times New Roman", size: FONT_SIZE }));
      } else {
        runs.push(new TextRun({ ...t, font: t.font || "Times New Roman", size: t.size || FONT_SIZE }));
      }
    });
  }
  const ref = options.listRef || (options.numbered ? "numberedList" : "bulletList");
  return new Paragraph({
    numbering: { reference: ref, level: options.level || 0 },
    spacing: { after: 0, line: LINE_SPACING },
    children: runs,
  });
}

function emptyLine() {
  return new Paragraph({
    spacing: { after: 0, line: LINE_SPACING },
    children: [],
  });
}

function diagramImage(filename, widthCm) {
  const filePath = path.join(__dirname, "diagrams", filename);
  const data = fs.readFileSync(filePath);
  // Calculate dimensions from PNG header
  const w = data.readUInt32BE(16);
  const h = data.readUInt32BE(20);
  const aspect = h / w;
  const widthPx = Math.round(widthCm * 37.8); // 1cm ≈ 37.8px at 96dpi
  const heightPx = Math.round(widthPx * aspect);
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 0, before: 120, line: LINE_SPACING },
    indent: { firstLine: 0 },
    keepNext: true,
    children: [new ImageRun({
      type: "png",
      data: data,
      transformation: { width: widthPx, height: heightPx },
      altText: { title: filename, description: filename, name: filename },
    })],
  });
}

function screenshotImage(filename, widthCm) {
  const filePath = path.join(__dirname, "screenshots", filename);
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
      data: data,
      transformation: { width: widthPx, height: heightPx },
      altText: { title: filename, description: filename, name: filename },
    })],
  });
}

let currentChapter = 0;
let figureCounterInChapter = 0;
let tableCounter = 0;

function setChapter(num) {
  currentChapter = num;
  figureCounterInChapter = 0;
}

function figureCaption(text, isTable = false) {
  if (isTable) {
    tableCounter++;
    return new Paragraph({
      spacing: { after: 240, before: 120, line: LINE_SPACING },
      alignment: AlignmentType.RIGHT,
      indent: { firstLine: 0 },
      keepNext: true,
      children: [
        new TextRun({ text: `Таблица ${tableCounter}. ${text}`, font: "Times New Roman", size: FONT_SIZE, bold: true }),
      ],
    });
  } else {
    figureCounterInChapter++;
    return new Paragraph({
      spacing: { after: 240, before: 120, line: LINE_SPACING },
      alignment: AlignmentType.CENTER,
      indent: { firstLine: 0 },
      children: [
        new TextRun({ text: `Рис. ${currentChapter}.${figureCounterInChapter}. ${text}`, font: "Times New Roman", size: FONT_SIZE, bold: true }),
      ],
    });
  }
}

function ref(num) {
  return [
    new TextRun({ text: " [", font: "Times New Roman", size: FONT_SIZE }),
    new TextRun({ text: `${num}`, font: "Times New Roman", size: FONT_SIZE }),
    new TextRun({ text: "]", font: "Times New Roman", size: FONT_SIZE }),
  ];
}

// ==================== CHAPTER 1 CONTENT ====================

function generateChapter1() {
  setChapter(1);
  const children = [];

  // CHAPTER TITLE
  children.push(heading1("1. Анализ подходов к оценке криптостойкости алгоритмов шифрования"));

  // === 1.1 ===
  children.push(heading2("1.1.", "Основные понятия криптографии и криптоанализа"));

  children.push(normalParagraph([
    { text: "Криптография", bold: true },
    { text: " \u2013 наука о методах обеспечения конфиденциальности, целостности и аутентичности информации" },
    ...ref(8),
    { text: ". В основе криптографии лежит процесс " },
    { text: "шифрования", italics: true },
    { text: " \u2013 преобразование открытого текста (plaintext) в шифртекст (ciphertext) с помощью определенного алгоритма и секретного ключа. Обратный процесс \u2013 " },
    { text: "дешифрование", italics: true },
    { text: " \u2013 восстановление исходного сообщения из шифртекста с использованием соответствующего ключа." },
  ]));

  children.push(normalParagraph([
    { text: "Алгоритмы шифрования классифицируются по нескольким признакам" },
    ...ref(2),
    { text: ". По типу используемых ключей выделяют симметричные и асимметричные алгоритмы. В симметричных алгоритмах для шифрования и дешифрования используется один и тот же секретный ключ, что обеспечивает высокую скорость обработки данных. Асимметричные алгоритмы используют пару ключей \u2013 открытый для шифрования и закрытый для дешифрования" },
    ...ref(9),
    { text: "." },
  ]));

  children.push(normalParagraph([
    { text: "Симметричные алгоритмы, в свою очередь, подразделяются на блочные и потоковые" },
    ...ref(10),
    { text: ". Блочные шифры обрабатывают данные фиксированными блоками (обычно 64 или 128 бит), применяя к каждому блоку серию криптографических преобразований. Потоковые шифры обрабатывают данные побитово или побайтово, генерируя псевдослучайный ключевой поток (keystream) и комбинируя его с открытым текстом операцией XOR." },
  ]));

  children.push(normalParagraph([
    { text: "Криптостойкость", bold: true },
    { text: " \u2013 свойство криптографического алгоритма, характеризующее его способность противостоять различным методам криптоанализа, то есть попыткам раскрытия зашифрованной информации без знания секретного ключа" },
    ...ref(1),
    { text: ". Различают несколько видов криптоанализа:" },
  ]));

  const list1 = newBulletList();
  children.push(listItem([
    { text: "силовой перебор (brute-force)", italics: true },
    { text: " \u2013 полный перебор всех возможных ключей; сложность определяется длиной ключа;" },
  ], { listRef: list1 }));
  children.push(listItem([
    { text: "дифференциальный криптоанализ", italics: true },
    { text: " \u2013 анализ влияния различий в открытых текстах на различия в шифртекстах;" },
  ], { listRef: list1 }));
  children.push(listItem([
    { text: "линейный криптоанализ", italics: true },
    { text: " \u2013 поиск линейных соотношений между битами открытого текста, шифртекста и ключа;" },
  ], { listRef: list1 }));
  children.push(listItem([
    { text: "алгебраический криптоанализ", italics: true },
    { text: " \u2013 представление шифра в виде системы алгебраических уравнений и их решение." },
  ], { listRef: list1 }));

  children.push(normalParagraph([
    { text: "Понятие вычислительной стойкости предполагает, что алгоритм является стойким, если для его взлома требуются вычислительные ресурсы, превышающие практически доступные" },
    ...ref(11),
    { text: ". В отличие от теоретико-информационной стойкости, где секретность гарантируется математически (как в случае одноразового блокнота), вычислительная стойкость основана на сложности решения определенных математических задач" },
    ...ref(12),
    { text: "." },
  ]));

  children.push(normalParagraph([
    { text: "Стандартизация криптографических алгоритмов осуществляется рядом организаций. Национальный институт стандартов и технологий (NIST, США) определяет стандарты AES" },
    ...ref(13),
    { text: ", DES" },
    ...ref(14),
    { text: " и публикует рекомендации по оценке случайности (SP 800-22)" },
    ...ref(4),
    { text: ". В Российской Федерации действуют стандарты ГОСТ 28147-89" },
    ...ref(15),
    { text: " и ГОСТ Р 34.12-2018 (алгоритмы \u00ABМагма\u00BB и \u00ABКузнечик\u00BB)" },
    ...ref(16),
    { text: "." },
  ]));

  // === 1.2 ===
  children.push(heading2("1.2.", "Обзор исследуемых алгоритмов шифрования"));

  children.push(normalParagraph("В рамках данного исследования рассматриваются семь алгоритмов симметричного шифрования, представляющих различные поколения и подходы к построению шифров. Выбор алгоритмов обусловлен необходимостью охвата как исторически значимых (DES), так и современных (AES, ChaCha20) решений, а также включения российского стандарта (ГОСТ 28147-89)."));

  // AES
  children.push(heading3("1.2.1.", "AES (Advanced Encryption Standard)"));

  children.push(normalParagraph([
    { text: "AES (Advanced Encryption Standard) \u2013 симметричный блочный шифр, принятый в качестве стандарта шифрования правительством США в 2001 году по результатам открытого конкурса NIST" },
    ...ref(13),
    { text: ". Победителем конкурса стал алгоритм Rijndael, разработанный бельгийскими криптографами Й. Дайменом и В. Рэйменом" },
    ...ref(17),
    { text: "." },
  ]));

  children.push(normalParagraph("AES основан на архитектуре SPN (Substitution-Permutation Network \u2013 сеть подстановок и перестановок). Алгоритм оперирует блоками данных размером 128 бит и поддерживает три длины ключа: 128, 192 и 256 бит, определяющие количество раундов преобразования (10, 12 и 14 соответственно). Каждый раунд включает четыре операции: SubBytes (нелинейная побайтовая подстановка с использованием S-блока), ShiftRows (циклический сдвиг строк матрицы состояния), MixColumns (линейное преобразование столбцов) и AddRoundKey (наложение раундового ключа операцией XOR)."));

  children.push(normalParagraph("В данной работе используется AES-256 в режиме CBC (Cipher Block Chaining) с паддингом PKCS7. AES-256 обеспечивает наивысший уровень безопасности среди вариантов AES и рекомендуется для защиты информации, составляющей государственную тайну (уровень TOP SECRET по классификации NSA)."));

  // DES
  children.push(heading3("1.2.2.", "DES (Data Encryption Standard)"));

  children.push(normalParagraph([
    { text: "DES (Data Encryption Standard) \u2013 симметричный блочный шифр, принятый в качестве федерального стандарта США в 1977 году" },
    ...ref(14),
    { text: ". Алгоритм основан на сети Фейстеля и оперирует блоками размером 64 бита с эффективной длиной ключа 56 бит (8 байт, из которых по одному биту в каждом байте используется для контроля четности)." },
  ]));

  children.push(normalParagraph([
    { text: "DES выполняет 16 раундов преобразований, каждый из которых включает расширение правой половины блока (с 32 до 48 бит), наложение раундового ключа, нелинейную подстановку через S-блоки и перестановку" },
    ...ref(18),
    { text: ". Несмотря на элегантность конструкции, DES считается устаревшим и небезопасным: эффективная длина ключа в 56 бит допускает полный перебор на современном оборудовании. В 1999 году машина Deep Crack взломала DES менее чем за 24 часа." },
  ]));

  children.push(normalParagraph("DES включен в исследование как эталон \u00ABслабого\u00BB алгоритма для сравнительного анализа с современными шифрами. Используется в режиме CBC с паддингом PKCS7."));

  // 3DES
  children.push(heading3("1.2.3.", "3DES (Triple DES)"));

  children.push(normalParagraph("3DES (Triple DES, TDEA) \u2013 симметричный блочный шифр, представляющий собой трёхкратное применение алгоритма DES по схеме EDE (Encrypt-Decrypt-Encrypt). Алгоритм использует три независимых ключа общей длиной 168 бит (эффективная стойкость \u2013 112 бит из-за атаки \u00ABвстреча посередине\u00BB) и оперирует блоками размером 64 бита."));

  children.push(normalParagraph("3DES был разработан как временное решение для замены DES и обеспечивает значительно более высокий уровень безопасности. Однако малый размер блока (64 бита) делает его уязвимым к атакам на основе дня рождения (birthday attacks) при шифровании больших объемов данных. NIST рекомендовал прекратить использование 3DES после 2023 года. В данной работе используется режим CBC с паддингом PKCS7."));

  // Blowfish
  children.push(heading3("1.2.4.", "Blowfish"));

  children.push(normalParagraph([
    { text: "Blowfish \u2013 симметричный блочный шифр, разработанный Б. Шнайером в 1993 году как свободная альтернатива существующим алгоритмам" },
    ...ref(19),
    { text: ". Алгоритм основан на сети Фейстеля, выполняет 16 раундов, оперирует блоками размером 64 бита и поддерживает переменную длину ключа от 32 до 448 бит." },
  ]));

  children.push(normalParagraph("Отличительной особенностью Blowfish является использование ключезависимых S-блоков, которые генерируются в процессе расширения ключа. Это обеспечивает высокую стойкость к криптоанализу, однако делает процедуру инициализации относительно медленной. Blowfish не запатентован и свободно доступен для использования. В данной работе используется ключ длиной 128 бит в режиме CBC с паддингом PKCS7."));

  // RC4
  children.push(heading3("1.2.5.", "RC4"));

  children.push(normalParagraph([
    { text: "RC4 (Rivest Cipher 4) \u2013 потоковый шифр, разработанный Р. Ривестом в 1987 году для компании RSA Security. Алгоритм генерирует псевдослучайный ключевой поток на основе перестановки массива из 256 байт (S-блока), инициализированного секретным ключом" },
    ...ref(10),
    { text: "." },
  ]));

  children.push(normalParagraph([
    { text: "RC4 отличается простотой реализации и высокой скоростью работы, что обеспечило его широкое распространение в протоколах SSL/TLS и WEP/WPA. Однако были обнаружены серьезные уязвимости: статистическое смещение (bias) в начальных байтах ключевого потока, уязвимости в протоколе WEP, а также атаки на RC4 в контексте TLS" },
    ...ref(20),
    { text: ". В 2015 году IETF запретил использование RC4 в TLS (RFC 7465)." },
  ]));

  children.push(normalParagraph("RC4 включен в исследование как представитель устаревших потоковых шифров с известными уязвимостями, что позволяет продемонстрировать способность энтропийного анализа выявлять слабости алгоритмов. Используется с ключом длиной 128 бит."));

  // ChaCha20
  children.push(heading3("1.2.6.", "ChaCha20"));

  children.push(normalParagraph([
    { text: "ChaCha20 \u2013 современный потоковый шифр, разработанный Д. Бернстайном в 2008 году как модификация алгоритма Salsa20" },
    ...ref(21),
    { text: ". ChaCha20 использует 256-битный ключ, 96-битный одноразовый вектор инициализации (nonce) и 32-битный счетчик блоков." },
  ]));

  children.push(normalParagraph("Алгоритм основан на ARX-операциях (сложение, циклический сдвиг, исключающее ИЛИ), которые эффективно реализуются на современных процессорах без использования специализированных инструкций. ChaCha20 выполняет 20 раундов преобразований над матрицей состояния размером 4\u00D74 слов (512 бит), генерируя 64 байта ключевого потока за каждый цикл."));

  children.push(normalParagraph("ChaCha20 стандартизирован в RFC 7539 и широко используется в протоколе TLS 1.3, системе Android, а также в VPN-решениях (WireGuard). В данной работе ChaCha20 представляет современное поколение потоковых шифров."));

  // GOST
  children.push(heading3("1.2.7.", "\u0413\u041E\u0421\u0422 28147-89"));

  children.push(normalParagraph([
    { text: "\u0413\u041E\u0421\u0422 28147-89 \u2013 отечественный стандарт симметричного блочного шифрования, принятый в 1989 году" },
    ...ref(15),
    { text: ". Алгоритм основан на сети Фейстеля, оперирует блоками размером 64 бита и использует ключ длиной 256 бит. В отличие от DES, ГОСТ 28147-89 выполняет 32 раунда преобразований (вдвое больше), что обеспечивает высокую стойкость к дифференциальному и линейному криптоанализу" },
    ...ref(22),
    { text: "." },
  ]));

  children.push(normalParagraph("Раундовая функция включает сложение с раундовым ключом по модулю 2\u00B3\u00B2, нелинейную подстановку через 8 параллельных S-блоков размером 4\u00D74 бита и циклический сдвиг на 11 бит. S-блоки не фиксированы стандартом и могут быть выбраны пользователем, что является как преимуществом (дополнительный секретный параметр), так и потенциальным недостатком (возможность выбора слабых S-блоков)."));

  children.push(normalParagraph([
    { text: "В 2018 году был принят ГОСТ Р 34.12-2018, определяющий два алгоритма: \u00ABМагма\u00BB (усовершенствованная версия ГОСТ 28147-89 с фиксированными S-блоками) и \u00ABКузнечик\u00BB (новый 128-битный блочный шифр)" },
    ...ref(16),
    { text: ". В данной работе используется классический ГОСТ 28147-89 в режиме CBC. Включение российского стандарта позволяет оценить его криптостойкость в сравнении с международными аналогами." },
  ]));

  // Сравнительная таблица
  children.push(normalParagraph("В таблице 1.1 представлены основные характеристики исследуемых алгоритмов шифрования.", { spacingBefore: 120 }));

  // Table 1.1
  const border = { style: BorderStyle.SINGLE, size: 1, color: "000000" };
  const borders = { top: border, bottom: border, left: border, right: border };
  const cellMargins = { top: 40, bottom: 40, left: 80, right: 80 };

  const headerRow = (cells) => new TableRow({
    children: cells.map((text, i) => new TableCell({
      borders,
      margins: cellMargins,
      width: { size: [2750, 1830, 1830, 1830, 1830, 1830, 2386][i], type: WidthType.DXA },
      children: [new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { after: 0, line: 240 },
        indent: { firstLine: 0 },
        children: [new TextRun({ text, font: "Times New Roman", size: FONT_SIZE_SMALL, bold: true })],
      })],
    })),
  });

  const dataRow = (cells) => new TableRow({
    children: cells.map((text, i) => new TableCell({
      borders,
      margins: cellMargins,
      width: { size: [2750, 1830, 1830, 1830, 1830, 1830, 2386][i], type: WidthType.DXA },
      children: [new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { after: 0, line: 240 },
        indent: { firstLine: 0 },
        children: [new TextRun({ text, font: "Times New Roman", size: FONT_SIZE_SMALL })],
      })],
    })),
  });

  children.push(LANDSCAPE_START);
  children.push(figureCaption("Характеристики исследуемых алгоритмов шифрования", true));

  children.push(new Table({
    width: { size: LANDSCAPE_CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [2750, 1830, 1830, 1830, 1830, 1830, 2386],
    rows: [
      headerRow(["Алгоритм", "Тип", "Размер ключа, бит", "Размер блока, бит", "Число раундов", "Архитектура", "Год"]),
      dataRow(["AES-256", "Блочный", "256", "128", "14", "SPN", "2001"]),
      dataRow(["DES", "Блочный", "56", "64", "16", "Фейстель", "1977"]),
      dataRow(["3DES", "Блочный", "168", "64", "48", "Фейстель", "1998"]),
      dataRow(["Blowfish", "Блочный", "128", "64", "16", "Фейстель", "1993"]),
      dataRow(["RC4", "Потоковый", "128", "\u2013", "\u2013", "KSA+PRGA", "1987"]),
      dataRow(["ChaCha20", "Потоковый", "256", "\u2013", "20", "ARX", "2008"]),
      dataRow(["\u0413\u041E\u0421\u0422", "Блочный", "256", "64", "32", "Фейстель", "1989"]),
    ],
  }));
  children.push(LANDSCAPE_END);

  // === 1.3 ===
  children.push(heading2("1.3.", "Существующие подходы к оценке криптостойкости"));

  children.push(normalParagraph("Оценка криптостойкости алгоритмов шифрования является одной из центральных задач криптографии. Существующие подходы к оценке можно разделить на несколько категорий: формальные методы (доказуемая безопасность), статистические тесты случайности, информационно-теоретический анализ и тесты на соответствие криптографическим критериям."));

  // 1.3.1
  children.push(heading3("1.3.1.", "Формальные методы оценки криптостойкости"));

  children.push(normalParagraph([
    { text: "Формальные методы основаны на сведении задачи взлома шифра к решению вычислительно сложной задачи" },
    ...ref(9),
    { text: ". В рамках моделей безопасности IND-CPA (неразличимость шифртекстов при атаке с выбранным открытым текстом) и IND-CCA (неразличимость при атаке с выбранным шифртекстом) доказывается, что вероятность отличить шифртекст от случайной последовательности пренебрежимо мала" },
    ...ref(23),
    { text: "." },
  ]));

  children.push(normalParagraph("Ограничения формальных методов заключаются в сложности построения строгих доказательств для реальных алгоритмов, зависимости от выбранной модели (атаки, не учтенные в модели, могут быть успешными) и невозможности количественного сравнения алгоритмов между собой \u2013 результат является бинарным: алгоритм либо доказано безопасен в данной модели, либо нет."));

  // 1.3.2
  children.push(heading3("1.3.2.", "Статистические тесты случайности"));

  children.push(normalParagraph([
    { text: "Статистические тесты оценивают, насколько выходные данные криптографического алгоритма соответствуют свойствам истинно случайной последовательности. Наиболее авторитетным набором является NIST SP 800-22" },
    ...ref(4),
    { text: ", включающий 15 тестов: частотный тест (Frequency Test), тест на серии (Runs Test), тест на ранг бинарных матриц, тест дискретного преобразования Фурье и другие" },
    ...ref(6),
    { text: "." },
  ]));

  children.push(normalParagraph("Набор тестов Diehard, разработанный Дж. Марсалья, и его расширение TestU01 также широко применяются для оценки качества генераторов псевдослучайных чисел. Основным ограничением статистических тестов является бинарный характер результата (pass/fail): тест либо пройден, либо не пройден, что не позволяет ранжировать алгоритмы по степени криптостойкости."));

  // 1.3.3
  children.push(heading3("1.3.3.", "Энтропийный анализ"));

  children.push(normalParagraph([
    { text: "Информационно-теоретический подход к оценке криптостойкости берет начало в работе К. Шеннона \u00ABCommunication Theory of Secrecy Systems\u00BB (1949)" },
    ...ref(3),
    { text: ", в которой были заложены основы математической криптографии. Шеннон показал, что идеальный шифр должен обеспечивать максимальную энтропию шифртекста и полную статистическую независимость между открытым текстом и шифртекстом" },
    ...ref(24),
    { text: "." },
  ]));

  children.push(normalParagraph("Энтропия Шеннона H(X) позволяет количественно оценить степень неопределенности (случайности) последовательности байтов. Для идеального шифра энтропия шифртекста должна быть максимальной и составлять 8 бит на байт, что соответствует равномерному распределению всех 256 возможных значений байта."));

  children.push(normalParagraph([
    { text: "Преимущества энтропийного анализа по сравнению с другими подходами заключаются в количественном характере результатов (не бинарный pass/fail, а числовая оценка), возможности сравнения и ранжирования алгоритмов, а также в наличии теоретического обоснования связи между энтропией и криптостойкостью" },
    ...ref(25),
    { text: ". Кроме того, энтропийный анализ может быть дополнен рядом связанных метрик \u2013 расхождением Кульбака-Лейблера, условной энтропией и взаимной информацией, что обеспечивает всестороннюю оценку" },
    ...ref(5),
    { text: "." },
  ]));

  // 1.3.4
  children.push(heading3("1.3.4.", "Тест лавинного эффекта"));

  children.push(normalParagraph([
    { text: "Лавинный эффект (Avalanche Effect) \u2013 свойство криптографического алгоритма, при котором изменение одного бита входных данных приводит к изменению приблизительно половины битов выходных данных. Строгий лавинный критерий (SAC \u2013 Strict Avalanche Criterion), предложенный А. Вебстером и С. Тавалесом в 1986 году" },
    ...ref(7),
    { text: ", требует, чтобы при инвертировании любого бита входных данных каждый бит выходных данных изменялся с вероятностью 0.5" },
    ...ref(26),
    { text: "." },
  ]));

  children.push(normalParagraph([
    { text: "Тест лавинного эффекта является важным инструментом оценки диффузии \u2013 одного из двух основных свойств стойкого шифра (наряду с конфузией), определенных Шенноном" },
    ...ref(3),
    { text: ". Хорошие значения лавинного коэффициента свидетельствуют о том, что алгоритм обеспечивает достаточное \u00ABперемешивание\u00BB данных и устойчив к дифференциальному криптоанализу" },
    ...ref(18),
    { text: "." },
  ]));

  // 1.3.5
  children.push(heading3("1.3.5.", "Анализ программных решений-аналогов"));

  children.push(normalParagraph("Существует ряд программных средств, предоставляющих возможности для анализа криптографических алгоритмов:"));

  const list2 = newBulletList();
  children.push(listItem([
    { text: "CrypTool", bold: true },
    { text: " \u2013 образовательная платформа для изучения криптографии и криптоанализа, поддерживающая визуализацию работы алгоритмов и базовый статистический анализ;" },
  ], { listRef: list2 }));

  children.push(listItem([
    { text: "SageMath", bold: true },
    { text: " \u2013 открытая математическая система с модулями для криптографии, позволяющая реализовывать и анализировать алгоритмы на уровне математических примитивов;" },
  ], { listRef: list2 }));

  children.push(listItem([
    { text: "NIST Statistical Test Suite", bold: true },
    { text: " \u2013 набор из 15 тестов для проверки случайности последовательностей, являющийся отраслевым стандартом, но ограниченный бинарными результатами." },
  ], { listRef: list2 }));

  children.push(normalParagraph("Анализ существующих решений показывает, что ни одно из них не предоставляет комплексного инструмента для оценки криптостойкости, объединяющего энтропийные метрики (энтропия Шеннона, KL-дивергенция, условная энтропия, взаимная информация), статистические тесты (частотный анализ, корреляционный анализ, метрики распределения) и тест лавинного эффекта в единой среде с возможностью ранжирования алгоритмов и визуализацией результатов. Это определяет необходимость разработки специализированной программной платформы."));

  // === 1.4 ===
  children.push(heading2("1.4.", "Постановка задачи исследования"));

  children.push(normalParagraph("На основе проведенного анализа можно сформулировать следующие выводы, определяющие направление исследования:"));

  const nlist1 = newNumberedList();
  children.push(listItem("существующие формальные методы оценки криптостойкости дают бинарный результат и не позволяют ранжировать алгоритмы;", { numbered: true, listRef: nlist1 }));
  children.push(listItem("стандартные статистические тесты (NIST SP 800-22) также имеют бинарный характер результатов;", { numbered: true, listRef: nlist1 }));
  children.push(listItem("энтропийный анализ обеспечивает количественную оценку, имеет теоретическое обоснование в работах Шеннона, но не используется комплексно;", { numbered: true, listRef: nlist1 }));
  children.push(listItem("отсутствует интегрированный инструмент, объединяющий энтропийные метрики, статистические тесты и тест лавинного эффекта.", { numbered: true, listRef: nlist1 }));

  children.push(normalParagraph("Данные выводы обосновывают актуальность разработки комплексной методики оценки криптостойкости на основе энтропийного анализа и создания соответствующего программного инструмента."));

  children.push(normalParagraph("Для разрабатываемой программной платформы определены следующие ключевые требования:"));

  const list3 = newBulletList();
  children.push(listItem("поддержка множества алгоритмов шифрования (блочных и потоковых);", { listRef: list3 }));
  children.push(listItem("использование различных типов входных данных для всестороннего анализа;", { listRef: list3 }));
  children.push(listItem("расчет комплекса энтропийных и статистических метрик;", { listRef: list3 }));
  children.push(listItem("проведение теста лавинного эффекта;", { listRef: list3 }));
  children.push(listItem("агрегация результатов и ранжирование алгоритмов;", { listRef: list3 }));
  children.push(listItem("визуализация результатов и генерация отчетов.", { listRef: list3 }));

  // === 1.5 ===
  children.push(heading2("1.5.", "Выводы по главе"));

  children.push(normalParagraph("В ходе анализа предметной области были рассмотрены основные понятия криптографии, классификация алгоритмов шифрования и методы оценки криптостойкости. Проведен обзор семи алгоритмов симметричного шифрования, включающих как исторические (DES, RC4), так и современные (AES, ChaCha20) решения, а также российский стандарт ГОСТ 28147-89."));

  children.push(normalParagraph("Анализ существующих подходов к оценке криптостойкости выявил ограничения формальных методов (бинарный результат, сложность построения доказательств) и стандартных статистических тестов (бинарный результат pass/fail). Обосновано преимущество энтропийного подхода, обеспечивающего количественную оценку и возможность ранжирования. Установлено отсутствие интегрированного инструмента для комплексного анализа."));

  children.push(normalParagraph([
    { text: "Объект исследования", bold: true },
    { text: " \u2013 алгоритмы симметричного шифрования (AES, DES, 3DES, Blowfish, RC4, ChaCha20, ГОСТ 28147-89)." },
  ]));

  children.push(normalParagraph([
    { text: "Предмет исследования", bold: true },
    { text: " \u2013 методы оценки криптостойкости алгоритмов шифрования на основе энтропийного анализа." },
  ]));

  children.push(normalParagraph([
    { text: "Цель исследования", bold: true },
    { text: " \u2013 исследование и сравнительная оценка криптостойкости алгоритмов симметричного шифрования с применением комплексного энтропийного анализа." },
  ]));

  children.push(normalParagraph([
    { text: "Для достижения поставленной цели необходимо решить следующие " },
    { text: "задачи", bold: true },
    { text: ":" },
  ]));

  const list4 = newBulletList();
  children.push(listItem("анализ существующих подходов к оценке криптостойкости алгоритмов шифрования и выявление их ограничений;", { listRef: list4 }));
  children.push(listItem("исследование и систематизация энтропийных метрик, применимых для оценки криптостойкости;", { listRef: list4 }));
  children.push(listItem("разработка комплексной методики оценки криптостойкости, объединяющей энтропийные метрики со статистическими тестами и тестом лавинного эффекта;", { listRef: list4 }));
  children.push(listItem("проектирование и разработка программной платформы CryptoAnalyzer для автоматизированного анализа криптостойкости;", { listRef: list4 }));
  children.push(listItem("экспериментальная проверка разработанной методики на семи алгоритмах шифрования с различными типами входных данных;", { listRef: list4 }));
  children.push(listItem("сравнительный анализ результатов и формулирование рекомендаций по выбору алгоритмов шифрования.", { listRef: list4 }));

  return children;
}

// ==================== CHAPTER 2 CONTENT ====================

function formula(text) {
  return new Paragraph({
    spacing: { before: 120, after: 120, line: LINE_SPACING },
    alignment: AlignmentType.CENTER,
    indent: { firstLine: 0 },
    children: [
      new OfficeMath({
        children: [new MathRun(text)],
      }),
    ],
  });
}

function formulaNumbered(text, number) {
  return new Paragraph({
    spacing: { before: 120, after: 120, line: LINE_SPACING },
    alignment: AlignmentType.CENTER,
    indent: { firstLine: 0 },
    children: [
      new OfficeMath({
        children: [new MathRun(text)],
      }),
    ],
  });
}

function generateChapter2() {
  setChapter(2);
  const children = [];

  children.push(heading1("2. Разработка комплексной методики оценки криптостойкости на основе энтропийного анализа"));

  // === 2.1 ===
  children.push(heading2("2.1.", "Информационно-теоретические основы оценки криптостойкости"));

  children.push(normalParagraph([
    { text: "Связь между теорией информации и криптографией была установлена К. Шенноном в фундаментальной работе \u00ABCommunication Theory of Secrecy Systems\u00BB (1949)" },
    ...ref(3),
    { text: ". Шеннон показал, что задача шифрования может быть формализована в терминах теории информации, а криптостойкость алгоритма может быть оценена через информационно-теоретические характеристики шифртекста." },
  ]));

  children.push(normalParagraph([
    { text: "Центральным понятием теории информации является " },
    { text: "энтропия", bold: true },
    { text: " \u2013 мера неопределенности (количества информации) случайной величины" },
    ...ref(5),
    { text: ". Шеннон определил энтропию дискретной случайной величины X, принимающей значения x\u2081, x\u2082, ..., x\u2099 с вероятностями p(x\u2081), p(x\u2082), ..., p(x\u2099), формулой:" },
  ]));

  children.push(formulaNumbered("H(X) = -\u2211 p(xi) \u00B7 log2(p(xi))", "2.1"));

  children.push(normalParagraph("Энтропия обладает следующими свойствами:"));

  const list5 = newBulletList();
  children.push(listItem("неотрицательность: H(X) \u2265 0;", { listRef: list5 }));
  children.push(listItem("H(X) = 0 тогда и только тогда, когда одно из значений имеет вероятность 1 (полная определенность);", { listRef: list5 }));
  children.push(listItem("максимум достигается при равномерном распределении: H(X) \u2264 log\u2082(n), причем равенство выполняется при p(x\u1d62) = 1/n для всех i.", { listRef: list5 }));

  children.push(normalParagraph("Для байтовой последовательности (n = 256 возможных значений) максимальная энтропия составляет:"));

  children.push(formulaNumbered("Hmax = log2(256) = 8 бит/байт", "2.2"));

  children.push(normalParagraph([
    { text: "Шеннон ввел понятие " },
    { text: "совершенной секретности", bold: true },
    { text: " (perfect secrecy): система шифрования обладает совершенной секретностью, если шифртекст не содержит никакой информации об открытом тексте. Формально это означает, что апостериорное распределение открытого текста при известном шифртексте совпадает с априорным распределением:" },
  ]));

  children.push(formulaNumbered("P(M = m | C = c) = P(M = m)", "2.3"));

  children.push(normalParagraph("для всех возможных сообщений m и шифртекстов c. Шеннон доказал, что необходимым условием совершенной секретности является H(K) \u2265 H(M) \u2013 энтропия ключа должна быть не меньше энтропии сообщения. Единственной практической реализацией является одноразовый блокнот (one-time pad), что делает совершенную секретность практически недостижимой."));

  children.push(normalParagraph("В реальных криптосистемах используется понятие вычислительной стойкости: алгоритм считается стойким, если не существует полиномиального алгоритма, способного отличить шифртекст от случайной последовательности с вероятностью, существенно превышающей 1/2. Это приводит к следующим информационно-теоретическим критериям качественного шифра:"));

  const nlist2 = newNumberedList();
  children.push(listItem([
    { text: "равномерность распределения шифртекста", bold: true },
    { text: ": распределение байтов шифртекста должно быть максимально близко к равномерному, что соответствует максимальной энтропии H(C) \u2192 H\u2098\u2090\u2093 = 8 бит/байт;" },
  ], { numbered: true, listRef: nlist2 }));
  children.push(listItem([
    { text: "статистическая независимость от открытого текста", bold: true },
    { text: ": знание открытого текста не должно давать информации о шифртексте \u2013 взаимная информация I(M; C) должна стремиться к нулю;" },
  ], { numbered: true, listRef: nlist2 }));
  children.push(listItem([
    { text: "отсутствие автокорреляции", bold: true },
    { text: ": последовательные байты шифртекста не должны быть статистически зависимы." },
  ], { numbered: true, listRef: nlist2 }));

  children.push(normalParagraph("Эти критерии, сформулированные на языке теории информации, ложатся в основу разрабатываемой методики оценки криптостойкости."));

  // === 2.2 ===
  children.push(heading2("2.2.", "Энтропийные метрики для оценки криптостойкости"));

  children.push(normalParagraph("В рамках разрабатываемой методики используются четыре взаимодополняющие энтропийные метрики, каждая из которых оценивает определенный аспект качества шифрования."));

  // 2.2.1
  children.push(heading3("2.2.1.", "Энтропия Шеннона"));

  children.push(normalParagraph([
    { text: "Энтропия Шеннона является основной метрикой оценки случайности шифртекста" },
    ...ref(27),
    { text: ". Для последовательности байтов C = {c\u2081, c\u2082, ..., c\u2099} энтропия вычисляется как:" },
  ]));

  children.push(formulaNumbered("H(C) = -\u2211 p(i) \u00B7 log2(p(i)), i = 0..255", "2.4"));

  children.push(normalParagraph("где p(i) = freq(i) / N \u2013 относительная частота байта i в последовательности, freq(i) \u2013 количество вхождений байта i, N \u2013 общая длина последовательности."));

  children.push(normalParagraph("Для оценки качества шифрования вводится нормализованный энтропийный балл:"));

  children.push(formulaNumbered("S_entropy = H(C) / Hmax = H(C) / 8", "2.5"));

  children.push(normalParagraph("принимающий значения в диапазоне [0, 1]. Значение S\u2091\u2099\u209c\u2063\u2099\u2092\u209a\u2099 = 1 соответствует идеальному равномерному распределению."));

  children.push(normalParagraph("Интерпретация результатов:"));
  const list6 = newBulletList();
  children.push(listItem("H(C) \u2265 7.9 бит/байт \u2013 хороший шифр, распределение близко к равномерному;", { listRef: list6 }));
  children.push(listItem("H(C) < 7.0 бит/байт \u2013 слабый шифр, в шифртексте присутствуют статистические закономерности;", { listRef: list6 }));
  children.push(listItem("H(C) = 8.0 \u2013 идеальный случай, теоретически недостижимый для конечных последовательностей.", { listRef: list6 }));

  children.push(normalParagraph("Дополнительно проводится анализ энтропии по блокам: входная последовательность разбивается на блоки фиксированного размера (по умолчанию 256 байт), и для каждого блока вычисляется энтропия. Равномерность значений энтропии по блокам свидетельствует об однородности шифрования по всей длине данных."));

  // 2.2.2
  children.push(heading3("2.2.2.", "Расхождение Кульбака-Лейблера (KL-дивергенция)"));

  children.push(normalParagraph([
    { text: "KL-дивергенция количественно оценивает отличие эмпирического распределения байтов шифртекста от идеального равномерного распределения" },
    ...ref(25),
    { text: ". Для распределения P шифртекста и равномерного распределения Q = U(0, 255) KL-дивергенция определяется как:" },
  ]));

  children.push(formulaNumbered("D_KL(P || Q) = \u2211 p(i) \u00B7 log2(p(i) / q(i)), i = 0..255", "2.6"));

  children.push(normalParagraph("где q(i) = 1/256 для всех i. Для предотвращения неопределенности при p(i) = 0 применяется сглаживание Лапласа:"));

  children.push(formulaNumbered("p'(i) = (freq(i) + 1) / (N + 256)", "2.7"));

  children.push(normalParagraph("KL-дивергенция обладает следующими свойствами: D\u2096\u2097 \u2265 0 (неотрицательность, неравенство Гиббса); D\u2096\u2097 = 0 тогда и только тогда, когда P = Q; D\u2096\u2097 не является метрикой в математическом смысле (не симметрична). Связь с энтропией Шеннона при Q = U(0, 255):"));

  children.push(formulaNumbered("D_KL(P || U) = log2(256) - H(P) = 8 - H(P)", "2.8"));

  children.push(normalParagraph("Интерпретация: D\u2096\u2097 \u2248 0 (< 0.01) \u2013 шифртекст практически неотличим от случайной последовательности; D\u2096\u2097 > 0.1 \u2013 значимые отклонения от равномерности."));

  // 2.2.3
  children.push(heading3("2.2.3.", "Условная энтропия"));

  children.push(normalParagraph("Условная энтропия H(Y|X) оценивает остаточную неопределенность шифртекста Y при известном открытом тексте X. Для вычисления совместного распределения p(x, y) непрерывные значения байтов квантуются в n бинов (по умолчанию n = 16):"));

  children.push(formulaNumbered("H(Y|X) = -\u2211x \u2211y p(x, y) \u00B7 log2(p(y|x))", "2.9"));

  children.push(normalParagraph("где p(y|x) = p(x, y) / p(x) \u2013 условная вероятность. Интерпретация: H(Y|X) \u2248 H(Y) \u2013 знание открытого текста практически не снижает неопределенность шифртекста (идеальный шифр); H(Y|X) \u226A H(Y) \u2013 открытый текст содержит значимую информацию о шифртексте (уязвимость)."));

  // 2.2.4
  children.push(heading3("2.2.4.", "Взаимная информация"));

  children.push(normalParagraph("Взаимная информация I(X; Y) количественно оценивает статистическую зависимость между открытым текстом X и шифртекстом Y:"));

  children.push(formulaNumbered("I(X; Y) = H(Y) - H(Y|X) = H(X) + H(Y) - H(X, Y)", "2.10"));

  children.push(normalParagraph("Взаимная информация обладает свойствами: I(X; Y) \u2265 0; I(X; Y) = 0 тогда и только тогда, когда X и Y статистически независимы; I(X; Y) = I(Y; X) (симметричность). Для удобства сравнения вводится нормализованная взаимная информация:"));

  children.push(formulaNumbered("NMI = I(X; Y) / H(Y), NMI \u2208 [0, 1]", "2.11"));

  children.push(normalParagraph("Интерпретация: I(X; Y) \u2248 0 (NMI \u2248 0) \u2013 полная статистическая независимость, идеальный шифр; I(X; Y) > 0 \u2013 наличие утечки информации. Взаимная информация является наиболее строгой метрикой, так как учитывает не только линейные, но и нелинейные статистические связи."));

  // === 2.3 ===
  children.push(heading2("2.3.", "Статистические тесты криптостойкости"));

  children.push(normalParagraph([
    { text: "Энтропийные метрики дополняются набором статистических тестов" },
    ...ref(4),
    ...ref(6),
    { text: ", оценивающих различные аспекты распределения байтов шифртекста." },
  ]));

  // 2.3.1
  children.push(heading3("2.3.1.", "Частотный анализ (критерий хи-квадрат)"));

  children.push(normalParagraph("Критерий хи-квадрат (\u03C7\u00B2) используется для проверки гипотезы H\u2080 о равномерности распределения байтов шифртекста:"));

  children.push(formulaNumbered("\u03C7\u00B2 = \u2211 (Oi - Ei)\u00B2 / Ei, i = 0..255", "2.12"));

  children.push(normalParagraph("где O\u1d62 \u2013 наблюдаемая частота байта i, E\u1d62 = N / 256 \u2013 ожидаемая частота при равномерном распределении. При справедливости гипотезы H\u2080 статистика \u03C7\u00B2 имеет распределение хи-квадрат с k = 255 степенями свободы. Гипотеза не отвергается при p-value > 0.05."));

  children.push(normalParagraph("Дополнительно вычисляется среднее отклонение частоты:"));

  children.push(formulaNumbered("\u03B4 = (1/256) \u00B7 \u2211 |Oi/N - 1/256|, i = 0..255", "2.13"));

  // 2.3.2
  children.push(heading3("2.3.2.", "Корреляционный анализ"));

  children.push(normalParagraph("Коэффициент корреляции Пирсона между байтами открытого текста X и шифртекста Y:"));

  children.push(formulaNumbered("r = \u2211(xi - x\u0305)(yi - y\u0305) / \u221A(\u2211(xi - x\u0305)\u00B2 \u00B7 \u2211(yi - y\u0305)\u00B2)", "2.14"));

  children.push(normalParagraph("Для идеального шифра r \u2248 0. Коэффициент ранговой корреляции Спирмена вычисляется аналогично по рангам, что обеспечивает робастность к нелинейным монотонным зависимостям. Автокорреляция шифртекста r(lag) = corr(c\u1d62, c\u1d62\u208a\u2097\u2090\u2091) строится для lag = 1, ..., 10. Для ранжирования вводится балл:"));

  children.push(formulaNumbered("S_corr = 1 - |r_Pearson|", "2.15"));

  // 2.3.3
  children.push(heading3("2.3.3.", "Метрики распределения"));

  children.push(normalParagraph("Дополнительные статистические характеристики распределения байтов шифртекста включают:"));

  const list7 = newBulletList();
  children.push(listItem("математическое ожидание \u03BC = (1/N) \u00B7 \u2211c\u1d62 (идеал: 127.5);", { listRef: list7 }));
  children.push(listItem("дисперсия \u03C3\u00B2 (идеал для U(0,255): 5461.25);", { listRef: list7 }));
  children.push(listItem("коэффициент асимметрии (skewness) \u03B3\u2081 (идеал: 0);", { listRef: list7 }));
  children.push(listItem("эксцесс (kurtosis) \u03B3\u2082 (идеал для равномерного: \u22121.2);", { listRef: list7 }));
  children.push(listItem("индекс совпадения IC \u2248 1/256 \u2248 0.00390 для случайных данных.", { listRef: list7 }));

  // === 2.4 ===
  children.push(heading2("2.4.", "Тест лавинного эффекта"));

  children.push(normalParagraph([
    { text: "Лавинный эффект является одним из ключевых свойств стойкого шифра, обеспечивающим диффузию \u2013 равномерное распространение влияния каждого бита открытого текста на все биты шифртекста. Строгий лавинный критерий (SAC), предложенный Вебстером и Тавалесом (1986)" },
    ...ref(7),
    { text: ", требует, чтобы при инвертировании любого одного бита входных данных каждый бит выходных данных изменялся с вероятностью 1/2" },
    ...ref(26),
    { text: "." },
  ]));

  children.push(normalParagraph("Расстояние Хэмминга между двумя двоичными последовательностями \u2013 количество позиций, в которых соответствующие биты различаются:"));

  children.push(formulaNumbered("d(c1, c2) = \u2211 (c1j \u2295 c2j), j = 1..L", "2.16"));

  children.push(normalParagraph("Лавинный коэффициент определяется как:"));

  children.push(formulaNumbered("AC = d(c1, c2) / L", "2.17"));

  children.push(normalParagraph("где L \u2013 длина последовательности в битах. Методика тестирования включает: шифрование исходного сообщения, инвертирование случайного бита, повторное шифрование, вычисление AC. Процедура повторяется N = 100 раз."));

  children.push(normalParagraph("Интерпретация: AC \u2248 0.5 \u2013 идеальный лавинный эффект; AC < 0.4 \u2013 слабый эффект, уязвимость к дифференциальному криптоанализу; AC \u2248 0 \u2013 критическая уязвимость. Для ранжирования:"));

  children.push(formulaNumbered("S_avalanche = 1 - |AC_mean - 0.5| \u00B7 2", "2.18"));

  // === 2.5 ===
  children.push(heading2("2.5.", "Комплексная методика оценки криптостойкости"));

  children.push(normalParagraph([
    { text: "Каждая из рассмотренных метрик оценивает определенный аспект криптостойкости, однако по отдельности они не дают полной картины. Энтропия Шеннона" },
    ...ref(3),
    { text: " характеризует равномерность распределения, но не учитывает зависимость от открытого текста. KL-дивергенция" },
    ...ref(5),
    { text: " оценивает отклонение от равномерности, но не измеряет диффузию. Лавинный эффект" },
    ...ref(7),
    { text: " характеризует диффузию, но не информационную утечку. Поэтому для всесторонней оценки необходим комплексный подход." },
  ]));

  children.push(normalParagraph("Предлагаемая комплексная методика включает шесть этапов:"));

  const nlist3 = newNumberedList();
  children.push(listItem([
    { text: "Этап 1. Генерация тестовых данных. ", bold: true },
    { text: "Для каждого алгоритма генерируются 7 типов входных данных, покрывающих весь спектр энтропии: нулевые байты (H = 0), повторяющийся паттерн (H \u2248 2.0), структурированные данные (H \u2248 3.5), текст (H \u2248 4.5), изображение (H \u2248 5.5), счетчик (H = 8.0) и криптографически случайные данные (H \u2248 8.0)." },
  ], { numbered: true, listRef: nlist3 }));

  children.push(listItem([
    { text: "Этап 2. Шифрование. ", bold: true },
    { text: "Каждый набор данных шифруется каждым алгоритмом с фиксацией времени." },
  ], { numbered: true, listRef: nlist3 }));

  children.push(listItem([
    { text: "Этап 3. Расчет энтропийных метрик: ", bold: true },
    { text: "H(C), D\u2096\u2097(P\u2016U), H(C|M), I(M;C)." },
  ], { numbered: true, listRef: nlist3 }));

  children.push(listItem([
    { text: "Этап 4. Расчет статистических метрик: ", bold: true },
    { text: "\u03C7\u00B2, корреляции, метрики распределения." },
  ], { numbered: true, listRef: nlist3 }));

  children.push(listItem([
    { text: "Этап 5. Тест лавинного эффекта ", bold: true },
    { text: "(100 итераций для каждого алгоритма)." },
  ], { numbered: true, listRef: nlist3 }));

  children.push(listItem([
    { text: "Этап 6. Агрегация и ранжирование ", bold: true },
    { text: "по комплексному показателю." },
  ], { numbered: true, listRef: nlist3 }));

  children.push(normalParagraph("Комплексный показатель криптостойкости вычисляется как среднее арифметическое четырех нормализованных частных баллов:"));

  children.push(formulaNumbered("S_total = (S_entropy + S_KL + S_avalanche + S_corr) / 4", "2.19"));

  children.push(normalParagraph("где каждый балл принимает значения в диапазоне [0, 1]: 1 соответствует идеальному результату по данному критерию. Алгоритмы ранжируются по убыванию S\u209c\u2092\u209c\u2090\u2097. Выбор равных весов обусловлен отсутствием априорных оснований для предпочтения одного критерия над другим."));

  // === 2.6 ===
  children.push(heading2("2.6.", "Выводы по главе"));

  children.push(normalParagraph("В данной главе были рассмотрены информационно-теоретические основы оценки криптостойкости, берущие начало в работах К. Шеннона. Установлена связь между энтропией шифртекста и качеством шифрования: идеальный шифр должен обеспечивать максимальную энтропию (8 бит/байт) и полную статистическую независимость между открытым текстом и шифртекстом."));

  children.push(normalParagraph("Систематизированы и описаны четыре энтропийные метрики: энтропия Шеннона (оценка равномерности распределения), расхождение Кульбака-Лейблера (отклонение от равномерного распределения), условная энтропия (остаточная неопределенность при известном открытом тексте) и взаимная информация (степень статистической зависимости). Для каждой метрики приведены формулы, свойства, пороговые значения и интерпретация результатов."));

  children.push(normalParagraph("Рассмотрены статистические тесты: критерий хи-квадрат для проверки равномерности, корреляционный анализ и метрики распределения. Описан тест лавинного эффекта как инструмент оценки диффузионных свойств шифра."));

  children.push(normalParagraph("Разработана комплексная методика оценки криптостойкости, объединяющая энтропийные метрики, статистические тесты и тест лавинного эффекта. Предложен агрегированный показатель криптостойкости S\u209c\u2092\u209c\u2090\u2097, вычисляемый как среднее четырех нормализованных частных баллов, позволяющий ранжировать алгоритмы по единой шкале."));

  return children;
}

// ==================== CHAPTER 3 ====================

function generateChapter3() {
  setChapter(3);
  const children = [];

  children.push(heading1("ГЛАВА 3. ПРОГРАММНАЯ РЕАЛИЗАЦИЯ ПЛАТФОРМЫ CRYPTOANALYZER"));

  // 3.1
  children.push(heading2("3.1.", "Функциональные требования к программному продукту"));

  children.push(normalParagraph("На основе проведенного анализа существующих подходов и разработанной комплексной методики оценки криптостойкости были сформулированы требования к программному средству CryptoAnalyzer."));

  children.push(normalParagraph("К разрабатываемой системе предъявляются следующие функциональные требования:", { bold: true }));

  const nlist4 = newNumberedList();
  children.push(listItem("Поддержка шести алгоритмов шифрования: AES-256, DES, 3DES, Blowfish, RC4, ГОСТ 28147-89. Система должна обеспечивать шифрование и дешифрование данных каждым из перечисленных алгоритмов с корректной генерацией ключей.", { numbered: true, listRef: nlist4 }));

  children.push(listItem("Генерация семи типов тестовых данных различной энтропии: нулевые байты (H = 0), бинарный паттерн (H \u2248 2.0), структурированные данные (H \u2248 3.5\u20134.0), естественный текст (H \u2248 4.0\u20134.5), изображение (H \u2248 5.0\u20136.0), инкрементальная последовательность (H = 8.0), криптографически случайные данные (H \u2248 8.0). Тестовые данные генерируются в размерах 1 КБ, 10 КБ и 100 КБ.", { numbered: true, listRef: nlist4 }));

  children.push(listItem("Расчет четырех энтропийных метрик: энтропия Шеннона, расхождение Кульбака-Лейблера, условная энтропия и взаимная информация.", { numbered: true, listRef: nlist4 }));

  children.push(listItem("Расчет статистических показателей: частотный анализ (критерий хи-квадрат), корреляционный анализ (коэффициенты Пирсона и Спирмена), профиль автокорреляции, метрики распределения (среднее, дисперсия, асимметрия, эксцесс, индекс совпадения).", { numbered: true, listRef: nlist4 }));

  children.push(listItem("Проведение теста лавинного эффекта с настраиваемым количеством итераций (по умолчанию 100).", { numbered: true, listRef: nlist4 }));

  children.push(listItem("Ранжирование алгоритмов по комплексному показателю криптостойкости S\u209c\u2092\u209c\u2090\u2097.", { numbered: true, listRef: nlist4 }));

  children.push(listItem("Визуализация результатов в виде интерактивных графиков и таблиц.", { numbered: true, listRef: nlist4 }));

  children.push(listItem("Экспорт отчетов в форматах Markdown, CSV и JSON.", { numbered: true, listRef: nlist4 }));

  children.push(listItem("Пошаговая трассировка процесса шифрования с отображением промежуточных состояний данных на каждом этапе.", { numbered: true, listRef: nlist4 }));

  children.push(normalParagraph("К нефункциональным требованиям относятся:", { bold: true }));

  const nlist5 = newNumberedList();
  children.push(listItem("Веб-доступность \u2014 система должна быть доступна через браузерный интерфейс без установки дополнительного программного обеспечения.", { numbered: true, listRef: nlist5 }));

  children.push(listItem("Контейнеризация \u2014 развертывание системы должно осуществляться с помощью Docker Compose, обеспечивая воспроизводимость окружения.", { numbered: true, listRef: nlist5 }));

  children.push(listItem("Расширяемость \u2014 архитектура должна допускать добавление новых алгоритмов шифрования без изменения существующего кода.", { numbered: true, listRef: nlist5 }));

  children.push(listItem("Кроссплатформенность \u2014 система должна функционировать в операционных системах Windows, Linux и macOS.", { numbered: true, listRef: nlist5 }));

  // 3.2
  children.push(heading2("3.2.", "Архитектура системы и выбор средств разработки"));

  children.push(heading3("3.2.1.", "Обоснование клиент-серверной архитектуры"));

  children.push(normalParagraph("Для реализации платформы CryptoAnalyzer была выбрана клиент-серверная архитектура с разделением на серверную часть (backend) и клиентскую часть (frontend). Данное решение обусловлено следующими факторами:"));

  const list8 = newBulletList();
  children.push(listItem("вычислительно интенсивные криптографические операции и статистические расчеты выполняются на сервере, что не предъявляет требований к производительности клиентского устройства;", { listRef: list8 }));
  children.push(listItem("визуализация результатов и взаимодействие с пользователем реализуются на стороне клиента, обеспечивая отзывчивый интерфейс;", { listRef: list8 }));
  children.push(listItem("REST API сервера может быть использовано другими клиентами (скрипты, другие приложения), что обеспечивает переиспользование вычислительной логики;", { listRef: list8 }));
  children.push(listItem("независимое масштабирование серверной и клиентской частей.", { listRef: list8 }));

  children.push(normalParagraph("Взаимодействие между компонентами осуществляется по протоколу HTTP через REST API. Веб-сервер Nginx выполняет роль обратного прокси, маршрутизируя запросы к статическим файлам фронтенда или к API бэкенда."));

  children.push(heading3("3.2.2.", "Архитектурная схема"));

  children.push(normalParagraph("Система развертывается с использованием Docker Compose и включает два контейнера:"));

  const list9 = newBulletList();
  children.push(listItem("Frontend (Nginx, порт 80) \u2014 обслуживает статические файлы React-приложения и проксирует API-запросы;", { listRef: list9 }));
  children.push(listItem("Backend (Uvicorn, порт 8000) \u2014 обрабатывает REST API запросы, выполняет криптографические вычисления.", { listRef: list9 }));

  children.push(normalParagraph("Пользователь взаимодействует с системой через веб-браузер, отправляя запросы к Nginx, который перенаправляет API-запросы (с префиксом /api) к серверу Uvicorn. Схема развертывания представлена на рис. 3.1."));

  // Рисунок — схема развертывания (landscape)
  children.push(LANDSCAPE_START);
  children.push(diagramImage("deployment_diagram.png", 23));
  children.push(figureCaption("Диаграмма развертывания системы CryptoAnalyzer"));
  children.push(LANDSCAPE_END);

  children.push(heading3("3.2.3.", "Выбор и обоснование технологий"));

  children.push(normalParagraph([
    { text: "Python 3.12 ", bold: true },
    { text: "выбран в качестве основного языка программирования серверной части. Python обладает богатой экосистемой библиотек для криптографии, математических вычислений и статистического анализа. Динамическая типизация и высокоуровневые абстракции ускоряют разработку прототипов" },
    ...ref(28),
    { text: "." },
  ]));

  children.push(normalParagraph([
    { text: "FastAPI ", bold: true },
    { text: "\u2014 современный веб-фреймворк для построения REST API" },
    ...ref(29),
    { text: ". Обеспечивает автоматическую генерацию документации OpenAPI (Swagger), валидацию входных данных через Pydantic, асинхронную обработку запросов и высокую производительность благодаря использованию ASGI-сервера Uvicorn." },
  ]));

  children.push(normalParagraph([
    { text: "PyCryptodome ", bold: true },
    { text: "\u2014 криптографическая библиотека, предоставляющая реализации стандартных алгоритмов шифрования (AES, DES, 3DES, Blowfish, RC4)" },
    ...ref(30),
    { text: ". Поддерживает различные режимы шифрования (ECB, CBC, CTR) и является FIPS-совместимой. Алгоритм ГОСТ 28147-89 реализован вручную на основе спецификации стандарта" },
    ...ref(15),
    { text: "." },
  ]));

  children.push(normalParagraph([
    { text: "NumPy, SciPy, Pandas ", bold: true },
    { text: "\u2014 библиотеки научных вычислений" },
    ...ref(28),
    { text: ". NumPy используется для побайтового анализа данных и вычисления частотных распределений. SciPy \u2014 для статистических тестов (критерий хи-квадрат)" },
    ...ref(31),
    { text: ". Pandas \u2014 для агрегации результатов экспериментов и ранжирования алгоритмов." },
  ]));

  children.push(normalParagraph([
    { text: "React 19 ", bold: true },
    { text: "\u2014 JavaScript-библиотека для построения пользовательских интерфейсов" },
    ...ref(32),
    { text: ". Компонентный подход обеспечивает переиспользование элементов интерфейса, а реактивная модель данных \u2014 автоматическое обновление визуализации при получении результатов." },
  ]));

  children.push(normalParagraph([
    { text: "Recharts ", bold: true },
    { text: "\u2014 библиотека визуализации данных на основе React и D3.js" },
    ...ref(33),
    { text: ". Используется для построения столбчатых диаграмм, линейных графиков и других визуализаций результатов экспериментов." },
  ]));

  children.push(normalParagraph([
    { text: "Docker и Docker Compose ", bold: true },
    { text: "\u2014 обеспечивают контейнеризацию каждого компонента системы и оркестрацию многоконтейнерного приложения, гарантируя идентичность окружения на машине разработчика и на сервере" },
    ...ref(34),
    { text: "." },
  ]));

  // Таблица технологий
  const techBorder = { style: BorderStyle.SINGLE, size: 1, color: "000000" };
  const techBorders = { top: techBorder, bottom: techBorder, left: techBorder, right: techBorder };
  const techCellMargins = { top: 40, bottom: 40, left: 80, right: 80 };

  function techHeaderCell(text, width) {
    return new TableCell({
      borders: techBorders,
      width: { size: width, type: WidthType.DXA },
      margins: techCellMargins,
      children: [new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { after: 0, line: 240 },
        indent: { firstLine: 0 },
        children: [new TextRun({ text, font: "Times New Roman", size: FONT_SIZE_SMALL, bold: true })],
      })],
    });
  }

  function techCell(text, width) {
    return new TableCell({
      borders: techBorders,
      width: { size: width, type: WidthType.DXA },
      margins: techCellMargins,
      children: [new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { after: 0, line: 240 },
        indent: { firstLine: 0 },
        children: [new TextRun({ text, font: "Times New Roman", size: FONT_SIZE_SMALL })],
      })],
    });
  }

  children.push(figureCaption("Используемые технологии и их назначение", true));

  children.push(new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [2800, 2400, 4154],
    rows: [
      new TableRow({ children: [
        techHeaderCell("Компонент", 2800),
        techHeaderCell("Технология", 2400),
        techHeaderCell("Назначение", 4154),
      ]}),
      new TableRow({ children: [
        techCell("Backend", 2800),
        techCell("Python 3.12, FastAPI", 2400),
        techCell("REST API, вычисления", 4154),
      ]}),
      new TableRow({ children: [
        techCell("Криптография", 2800),
        techCell("PyCryptodome", 2400),
        techCell("Реализация алгоритмов шифрования", 4154),
      ]}),
      new TableRow({ children: [
        techCell("Вычисления", 2800),
        techCell("NumPy, SciPy, Pandas", 2400),
        techCell("Статистический анализ, агрегация", 4154),
      ]}),
      new TableRow({ children: [
        techCell("Frontend", 2800),
        techCell("React 19, Vite", 2400),
        techCell("Пользовательский интерфейс", 4154),
      ]}),
      new TableRow({ children: [
        techCell("Визуализация", 2800),
        techCell("Recharts", 2400),
        techCell("Интерактивные графики", 4154),
      ]}),
      new TableRow({ children: [
        techCell("Стилизация", 2800),
        techCell("Tailwind CSS", 2400),
        techCell("Адаптивная верстка", 4154),
      ]}),
      new TableRow({ children: [
        techCell("Развертывание", 2800),
        techCell("Docker, Docker Compose", 2400),
        techCell("Контейнеризация и оркестрация", 4154),
      ]}),
    ],
  }));

  children.push(heading3("3.2.4.", "Паттерны проектирования"));

  children.push(normalParagraph("В проекте применены следующие паттерны проектирования:"));

  children.push(normalParagraph([
    { text: "Стратегия (Strategy) ", bold: true },
    { text: "\u2014 абстрактный базовый класс BaseCipher определяет интерфейс шифрования (методы encrypt, decrypt, generate_key), а конкретные реализации (AESCipher, DESCipher и др.) предоставляют алгоритм-специфичную логику." },
  ]));

  children.push(normalParagraph([
    { text: "Фабрика (Factory) ", bold: true },
    { text: "\u2014 функция get_cipher(name) возвращает экземпляр нужного класса шифра по его имени, инкапсулируя логику создания объектов." },
  ]));

  children.push(normalParagraph([
    { text: "Реестр (Registry) ", bold: true },
    { text: "\u2014 словарь CIPHER_REGISTRY отображает строковые идентификаторы алгоритмов на соответствующие классы, обеспечивая расширяемость (добавление нового алгоритма сводится к добавлению записи в реестр)." },
  ]));

  children.push(normalParagraph([
    { text: "Шаблонный метод (Template Method) ", bold: true },
    { text: "\u2014 функция analyze_all объединяет вызовы всех энтропийных метрик в единый конвейер анализа." },
  ]));

  // Таблица модулей
  children.push(figureCaption("Модульная структура проекта", true));

  children.push(new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [3500, 5854],
    rows: [
      new TableRow({ children: [
        techHeaderCell("Модуль", 3500),
        techHeaderCell("Назначение", 5854),
      ]}),
      new TableRow({ children: [
        techCell("core/encryption", 3500),
        techCell("Реализации алгоритмов шифрования", 5854),
      ]}),
      new TableRow({ children: [
        techCell("core/entropy", 3500),
        techCell("Энтропийные метрики", 5854),
      ]}),
      new TableRow({ children: [
        techCell("core/statistics", 3500),
        techCell("Статистические тесты", 5854),
      ]}),
      new TableRow({ children: [
        techCell("core/avalanche", 3500),
        techCell("Тест лавинного эффекта", 5854),
      ]}),
      new TableRow({ children: [
        techCell("data_generation", 3500),
        techCell("Генерация тестовых данных", 5854),
      ]}),
      new TableRow({ children: [
        techCell("analytics", 3500),
        techCell("Агрегация результатов и отчеты", 5854),
      ]}),
      new TableRow({ children: [
        techCell("backend", 3500),
        techCell("REST API (FastAPI)", 5854),
      ]}),
      new TableRow({ children: [
        techCell("frontend", 3500),
        techCell("Веб-интерфейс (React)", 5854),
      ]}),
    ],
  }));

  // 3.3
  children.push(heading2("3.3.", "Модель данных"));

  children.push(normalParagraph("Взаимодействие клиента и сервера осуществляется через REST API с обменом данными в формате JSON. Схемы данных описаны с использованием библиотеки Pydantic, обеспечивающей автоматическую валидацию на уровне runtime."));

  children.push(heading3("3.3.1.", "Схема запроса эксперимента"));

  children.push(normalParagraph("Запрос на проведение эксперимента (ExperimentRequest) содержит список алгоритмов, типы данных, размеры, количество итераций лавинного теста и опционально пользовательские данные в формате Base64."));

  // Таблица ExperimentRequest
  children.push(figureCaption("Структура запроса эксперимента (ExperimentRequest)", true));

  children.push(new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [2500, 2000, 4854],
    rows: [
      new TableRow({ children: [
        techHeaderCell("Поле", 2500),
        techHeaderCell("Тип", 2000),
        techHeaderCell("Описание", 4854),
      ]}),
      new TableRow({ children: [
        techCell("algorithms", 2500),
        techCell("list[str]", 2000),
        techCell("Список алгоритмов шифрования", 4854),
      ]}),
      new TableRow({ children: [
        techCell("data_types", 2500),
        techCell("list[str]", 2000),
        techCell("Список типов тестовых данных", 4854),
      ]}),
      new TableRow({ children: [
        techCell("data_sizes", 2500),
        techCell("list[int]", 2000),
        techCell("Список размеров данных (байт)", 4854),
      ]}),
      new TableRow({ children: [
        techCell("avalanche_iterations", 2500),
        techCell("int", 2000),
        techCell("Количество итераций (по умолчанию 100)", 4854),
      ]}),
      new TableRow({ children: [
        techCell("custom_data", 2500),
        techCell("str | null", 2000),
        techCell("Пользовательские данные (Base64)", 4854),
      ]}),
    ],
  }));

  children.push(heading3("3.3.2.", "Структура результатов"));

  children.push(normalParagraph("Ответ ExperimentResponse содержит пять массивов: entropy_results (энтропийный анализ), avalanche_results (лавинный эффект), distribution_results (статистические метрики), summary (сводка по алгоритмам) и ranking (ранжирование)."));

  // Таблица EntropyResult
  children.push(figureCaption("Структура результата энтропийного анализа (EntropyResult)", true));

  children.push(new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [3200, 1600, 4554],
    rows: [
      new TableRow({ children: [
        techHeaderCell("Поле", 3200),
        techHeaderCell("Тип", 1600),
        techHeaderCell("Описание", 4554),
      ]}),
      new TableRow({ children: [
        techCell("algorithm", 3200),
        techCell("str", 1600),
        techCell("Название алгоритма", 4554),
      ]}),
      new TableRow({ children: [
        techCell("data_type", 3200),
        techCell("str", 1600),
        techCell("Тип тестовых данных", 4554),
      ]}),
      new TableRow({ children: [
        techCell("data_size", 3200),
        techCell("int", 1600),
        techCell("Размер данных (байт)", 4554),
      ]}),
      new TableRow({ children: [
        techCell("shannon_entropy_cipher", 3200),
        techCell("float", 1600),
        techCell("Энтропия шифртекста", 4554),
      ]}),
      new TableRow({ children: [
        techCell("kl_divergence", 3200),
        techCell("float", 1600),
        techCell("Расхождение Кульбака-Лейблера", 4554),
      ]}),
      new TableRow({ children: [
        techCell("conditional_entropy", 3200),
        techCell("float", 1600),
        techCell("Условная энтропия", 4554),
      ]}),
      new TableRow({ children: [
        techCell("mutual_information", 3200),
        techCell("float", 1600),
        techCell("Взаимная информация", 4554),
      ]}),
      new TableRow({ children: [
        techCell("entropy_score", 3200),
        techCell("float", 1600),
        techCell("Нормализованный балл [0, 1]", 4554),
      ]}),
    ],
  }));

  // Таблица AvalancheResult
  children.push(figureCaption("Структура результата теста лавинного эффекта (AvalancheResult)", true));

  children.push(new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [3200, 1600, 4554],
    rows: [
      new TableRow({ children: [
        techHeaderCell("Поле", 3200),
        techHeaderCell("Тип", 1600),
        techHeaderCell("Описание", 4554),
      ]}),
      new TableRow({ children: [
        techCell("algorithm", 3200),
        techCell("str", 1600),
        techCell("Название алгоритма", 4554),
      ]}),
      new TableRow({ children: [
        techCell("avalanche_mean", 3200),
        techCell("float", 1600),
        techCell("Среднее значение AC", 4554),
      ]}),
      new TableRow({ children: [
        techCell("avalanche_std", 3200),
        techCell("float", 1600),
        techCell("Стандартное отклонение", 4554),
      ]}),
      new TableRow({ children: [
        techCell("is_good", 3200),
        techCell("bool", 1600),
        techCell("Соответствие критерию", 4554),
      ]}),
    ],
  }));

  children.push(heading3("3.3.3.", "Формат API-взаимодействия"));

  children.push(normalParagraph("API предоставляет четыре конечные точки:"));

  children.push(figureCaption("Конечные точки REST API", true));

  children.push(new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [1200, 3500, 4654],
    rows: [
      new TableRow({ children: [
        techHeaderCell("Метод", 1200),
        techHeaderCell("URL", 3500),
        techHeaderCell("Описание", 4654),
      ]}),
      new TableRow({ children: [
        techCell("GET", 1200),
        techCell("/api/config", 3500),
        techCell("Получение конфигурации системы", 4654),
      ]}),
      new TableRow({ children: [
        techCell("POST", 1200),
        techCell("/api/experiments/run", 3500),
        techCell("Запуск эксперимента", 4654),
      ]}),
      new TableRow({ children: [
        techCell("POST", 1200),
        techCell("/api/experiments/trace", 3500),
        techCell("Пошаговая трассировка шифрования", 4654),
      ]}),
      new TableRow({ children: [
        techCell("POST", 1200),
        techCell("/api/reports/generate", 3500),
        techCell("Генерация отчета", 4654),
      ]}),
    ],
  }));

  // 3.4
  children.push(heading2("3.4.", "Низкоуровневое проектирование"));

  children.push(heading3("3.4.1.", "Иерархия классов модуля шифрования"));

  children.push(normalParagraph("Центральным элементом архитектуры является иерархия классов шифрования, построенная на основе паттерна «Стратегия». Абстрактный базовый класс BaseCipher определяет интерфейс:"));

  const list10 = newBulletList();
  children.push(listItem("name (property) \u2014 название алгоритма;", { listRef: list10 }));
  children.push(listItem("generate_key() \u2014 генерация криптографического ключа;", { listRef: list10 }));
  children.push(listItem("encrypt(data, key) \u2014 шифрование данных;", { listRef: list10 }));
  children.push(listItem("decrypt(data, key) \u2014 дешифрование данных;", { listRef: list10 }));
  children.push(listItem("encrypt_deterministic(data, key, iv) \u2014 детерминированное шифрование с заданным IV;", { listRef: list10 }));
  children.push(listItem("encrypt_timed(data, key) \u2014 шифрование с замером времени.", { listRef: list10 }));

  children.push(normalParagraph("От BaseCipher наследуются шесть конкретных классов:"));

  children.push(normalParagraph([
    { text: "AESCipher ", bold: true },
    { text: "\u2014 AES-256 в режиме CBC, размер ключа 32 байта, блок 16 байт, паддинг PKCS7, IV (16 байт) препендится к шифртексту." },
  ]));

  children.push(normalParagraph([
    { text: "DESCipher ", bold: true },
    { text: "\u2014 DES в режиме CBC, размер ключа 8 байт (56 бит эффективных), блок 8 байт." },
  ]));

  children.push(normalParagraph([
    { text: "TripleDESCipher ", bold: true },
    { text: "\u2014 3DES в режиме CBC, размер ключа 24 байта, блок 8 байт, корректировка четности ключа." },
  ]));

  children.push(normalParagraph([
    { text: "BlowfishCipher ", bold: true },
    { text: "\u2014 Blowfish в режиме CBC, размер ключа 16 байт, блок 8 байт." },
  ]));

  children.push(normalParagraph([
    { text: "RC4Cipher ", bold: true },
    { text: "\u2014 потоковый шифр, размер ключа 16 байт, без IV и паддинга. Шифрование выполняется операцией XOR с ключевым потоком." },
  ]));

  children.push(normalParagraph([
    { text: "GostCipher ", bold: true },
    { text: "\u2014 ГОСТ 28147-89 в режиме CBC, размер ключа 32 байта, блок 8 байт. Реализация включает 8 S-блоков подстановки и 32 раунда сети Фейстеля." },
  ]));

  children.push(normalParagraph("Иерархия классов модуля шифрования представлена на рис. 3.2."));

  // Рисунок — диаграмма классов (landscape)
  children.push(LANDSCAPE_START);
  children.push(diagramImage("class_diagram.png", 25));
  children.push(figureCaption("Диаграмма классов модуля шифрования"));
  children.push(LANDSCAPE_END);

  children.push(normalParagraph("Функция-фабрика get_cipher(name) принимает строковое имя алгоритма и возвращает экземпляр соответствующего класса из реестра CIPHER_REGISTRY."));

  children.push(heading3("3.4.2.", "Диаграмма компонентов"));

  children.push(normalParagraph("Система состоит из следующих компонентов: Frontend (React), Nginx (обратный прокси), Backend API (FastAPI), Data Generation (генерация тестовых данных), Encryption (шифрование), Entropy Analysis (энтропийные метрики), Statistical Analysis (статистические тесты), Avalanche Test (лавинный эффект) и Analytics (агрегация и отчеты). Диаграмма компонентов представлена на рис. 3.3."));

  // Рисунок — диаграмма компонентов (landscape)
  children.push(LANDSCAPE_START);
  children.push(diagramImage("component_diagram.png", 25));
  children.push(figureCaption("Диаграмма компонентов системы CryptoAnalyzer"));
  children.push(LANDSCAPE_END);

  children.push(heading3("3.4.3.", "Диаграмма последовательности проведения эксперимента"));

  children.push(normalParagraph("Процесс проведения эксперимента включает следующие взаимодействия (рис. 3.4):"));

  const nlist6 = newNumberedList();
  children.push(listItem("Пользователь настраивает параметры в интерфейсе и нажимает «Запустить».", { numbered: true, listRef: nlist6 }));
  children.push(listItem("Frontend отправляет POST-запрос к /api/experiments/run с параметрами.", { numbered: true, listRef: nlist6 }));
  children.push(listItem("Backend валидирует входные данные.", { numbered: true, listRef: nlist6 }));
  children.push(listItem("Для каждой комбинации (алгоритм \u00d7 тип данных \u00d7 размер): Data Generation генерирует данные, Encryption шифрует с замером времени, Entropy Analysis и Statistical Analysis вычисляют метрики.", { numbered: true, listRef: nlist6 }));
  children.push(listItem("Для каждой комбинации (алгоритм \u00d7 размер): Avalanche Test проводит серию тестов.", { numbered: true, listRef: nlist6 }));
  children.push(listItem("Analytics агрегирует результаты и ранжирует алгоритмы.", { numbered: true, listRef: nlist6 }));
  children.push(listItem("Backend возвращает ExperimentResponse клиенту.", { numbered: true, listRef: nlist6 }));
  children.push(listItem("Frontend отображает результаты на вкладках интерфейса.", { numbered: true, listRef: nlist6 }));

  // Рисунок — диаграмма последовательности (landscape)
  children.push(LANDSCAPE_START);
  children.push(diagramImage("sequence_diagram.png", 20));
  children.push(figureCaption("Диаграмма последовательности проведения эксперимента"));
  children.push(LANDSCAPE_END);

  children.push(heading3("3.4.4.", "Диаграмма деятельности комплексной оценки"));

  children.push(normalParagraph("Алгоритм комплексной оценки криптостойкости (рис. 3.5) включает следующие этапы: получение параметров, генерация тестовых данных (7 типов \u00d7 3 размера), для каждого алгоритма \u2014 шифрование, расчет энтропии и статистик, проведение теста лавинного эффекта, объединение результатов в DataFrame, расчет средних значений, вычисление частных баллов S_entropy, S_KL, S_avalanche, S_corr, вычисление S_total и ранжирование по убыванию."));

  // Рисунок — диаграмма деятельности
  children.push(diagramImage("activity_diagram.png", 12));
  children.push(figureCaption("Диаграмма деятельности комплексной оценки криптостойкости"));

  children.push(heading3("3.4.5.", "Реализация ключевых алгоритмов"));

  children.push(normalParagraph([
    { text: "Алгоритм расчета энтропии Шеннона. ", bold: true },
    { text: "Функция calculate_shannon_entropy(data) подсчитывает частоту каждого байта (0\u2013255), вычисляет вероятности p\u1d62 = count\u1d62 / N, для каждого p\u1d62 > 0 вычисляет вклад \u2212p\u1d62 \u00b7 log\u2082(p\u1d62), суммирует все вклады и возвращает значение H \u2208 [0, 8.0] бит/байт." },
  ]));

  children.push(normalParagraph([
    { text: "Алгоритм теста лавинного эффекта. ", bold: true },
    { text: "Функция run_avalanche_test(cipher, data, key, n_tests) шифрует исходные данные, затем n_tests раз инвертирует случайный бит, шифрует модифицированные данные тем же ключом и IV, вычисляет расстояние Хэмминга и лавинный коэффициент AC = d / (len \u00b7 8). По результатам рассчитываются mean, std, min, max." },
  ]));

  children.push(normalParagraph([
    { text: "Алгоритм ранжирования. ", bold: true },
    { text: "Функция rank_algorithms(summary_df) для каждого алгоритма вычисляет четыре частных балла: S_entropy = entropy_score, S_KL = 1 \u2212 (kl / max_kl), S_avalanche = 1 \u2212 |AC_mean \u2212 0.5| \u00b7 2, S_corr = 1 \u2212 |r_Pearson|. Комплексный показатель S_total = (S_entropy + S_KL + S_avalanche + S_corr) / 4. Алгоритмы сортируются по убыванию S_total и получают ранги от 1 до N." },
  ]));

  // 3.5
  children.push(heading2("3.5.", "Проектирование пользовательского интерфейса"));

  children.push(normalParagraph("Пользовательский интерфейс CryptoAnalyzer реализован как одностраничное веб-приложение (SPA) на основе React 19 с адаптивной версткой Tailwind CSS."));

  children.push(heading3("3.5.1.", "Структура интерфейса"));

  children.push(normalParagraph("Интерфейс состоит из двух основных областей:"));

  children.push(normalParagraph([
    { text: "Боковая панель (Sidebar) ", bold: true },
    { text: "\u2014 расположена слева, содержит элементы управления для настройки параметров эксперимента: мультиселект алгоритмов шифрования с информационными кнопками, выбор типов тестовых данных (генерируемые или пользовательские), выбор размеров данных (1 КБ, 10 КБ, 100 КБ, 1 МБ), ползунок количества итераций теста лавинного эффекта (10\u2013500), поле ввода пользовательских данных (текст или загрузка файла), предустановленные конфигурации тестов и кнопка запуска эксперимента." },
  ]));

  children.push(normalParagraph([
    { text: "Основная область ", bold: true },
    { text: "\u2014 занимает правую часть экрана, содержит семь вкладок с результатами:" },
  ]));

  const list11 = newBulletList();
  children.push(listItem("Обзор \u2014 сводные карточки (лучший алгоритм, средняя энтропия, средний лавинный коэффициент) и таблица рейтинга;", { listRef: list11 }));
  children.push(listItem("Энтропия \u2014 столбчатая диаграмма средней энтропии по алгоритмам и линейный график зависимости энтропии от размера данных;", { listRef: list11 }));
  children.push(listItem("Лавинный эффект \u2014 столбчатая диаграмма с планками ошибок и референсной линией на уровне 0.5;", { listRef: list11 }));
  children.push(listItem("Распределение \u2014 визуализация статистических метрик распределения байтов;", { listRef: list11 }));
  children.push(listItem("Сравнение \u2014 сравнительный анализ алгоритмов по различным метрикам;", { listRef: list11 }));
  children.push(listItem("Трассировка \u2014 пошаговая визуализация процесса шифрования с отображением данных на каждом этапе;", { listRef: list11 }));
  children.push(listItem("Отчет \u2014 предпросмотр и скачивание отчета в форматах Markdown, CSV, JSON.", { listRef: list11 }));

  children.push(normalParagraph("Внешний вид интерфейса представлен на рис. 3.6\u20133.11."));

  // Скриншоты интерфейса
  children.push(screenshotImage("01_main_interface.png", 16));
  children.push(figureCaption("Главный экран платформы CryptoAnalyzer"));

  children.push(screenshotImage("02_overview_results.png", 16));
  children.push(figureCaption("Вкладка «Обзор» с результатами эксперимента"));

  children.push(screenshotImage("03_entropy.png", 16));
  children.push(figureCaption("Вкладка «Энтропия» — анализ энтропии Шеннона"));

  children.push(screenshotImage("04_avalanche.png", 16));
  children.push(figureCaption("Вкладка «Лавинный эффект»"));

  children.push(screenshotImage("05_distribution.png", 16));
  children.push(figureCaption("Вкладка «Распределение» — статистические метрики"));

  children.push(screenshotImage("06_comparison.png", 16));
  children.push(figureCaption("Вкладка «Сравнение» — радарная диаграмма и рейтинг"));

  children.push(heading3("3.5.2.", "Интерфейсные решения"));

  children.push(normalParagraph("Графики построены с использованием библиотеки Recharts, поддерживают всплывающие подсказки (tooltips) при наведении курсора, легенды и адаптивное масштабирование."));

  children.push(normalParagraph("Для каждого алгоритма и каждой метрики доступны информационные модальные окна с описанием, формулами и интерпретацией значений."));

  children.push(normalParagraph("Интерфейс адаптивен и корректно отображается на экранах различных размеров. Боковая панель на мобильных устройствах скрывается и вызывается кнопкой меню. При выполнении эксперимента отображается индикатор прогресса, блокирующий повторный запуск. При ошибках API отображается уведомление с описанием проблемы."));

  // 3.6
  children.push(heading2("3.6.", "Выводы по главе"));

  children.push(normalParagraph("В данной главе описана программная реализация платформы CryptoAnalyzer для комплексной оценки криптостойкости алгоритмов шифрования."));

  children.push(normalParagraph("Сформулированы функциональные и нефункциональные требования к системе, включая поддержку шести алгоритмов шифрования, расчет энтропийных и статистических метрик, проведение теста лавинного эффекта и ранжирование алгоритмов по комплексному показателю."));

  children.push(normalParagraph("Обоснован выбор клиент-серверной архитектуры с использованием Python 3.12 и FastAPI на серверной стороне, React 19 на клиентской стороне и Docker Compose для контейнеризации. Описаны применённые паттерны проектирования: Стратегия, Фабрика, Реестр и Шаблонный метод."));

  children.push(normalParagraph("Представлена модель данных с описанием схем запросов и ответов API, структур результатов анализа. Описано низкоуровневое проектирование с представлением иерархии классов, диаграмм компонентов, последовательности и деятельности."));

  children.push(normalParagraph("Спроектирован пользовательский интерфейс с семью вкладками для визуализации различных аспектов анализа. Разработанная система полностью реализует комплексную методику оценки криптостойкости, описанную в главе 2, и готова к проведению экспериментальных исследований."));

  return children;
}

// ==================== CHAPTER 4 ====================

function generateChapter4() {
  setChapter(4);
  const children = [];

  children.push(heading1("ГЛАВА 4. ЭКСПЕРИМЕНТАЛЬНАЯ ПРОВЕРКА РЕЗУЛЬТАТОВ И ОЦЕНКА ЭФФЕКТИВНОСТИ"));

  // 4.1
  children.push(heading2("4.1.", "Методика проведения экспериментов"));

  children.push(normalParagraph([
    { text: "Экспериментальные исследования проводились на платформе CryptoAnalyzer, развернутой на виртуальном сервере (VPS) с операционной системой Linux. Развертывание выполнено с использованием Docker Compose" },
    ...ref(34),
    { text: ", что обеспечивает воспроизводимость окружения." },
  ]));

  children.push(normalParagraph([
    { text: "В экспериментах исследовались шесть алгоритмов шифрования: AES-256" },
    ...ref(13),
    { text: ", DES" },
    ...ref(14),
    { text: ", 3DES, Blowfish, RC4 и ГОСТ 28147-89" },
    ...ref(15),
    { text: ". Для каждого алгоритма использовались семь типов тестовых данных: нулевые байты (zeros), бинарный паттерн (binary), структурированные данные (structured), естественный текст (text), изображение (image), инкрементальная последовательность (incremental) и криптографически случайные данные (random). Данные генерировались в трёх размерах: 1 КБ (1024 байта), 10 КБ (10240 байт) и 100 КБ (102400 байт). Количество итераций теста лавинного эффекта \u2014 100." },
  ]));

  children.push(normalParagraph("Общее количество комбинаций для энтропийного и статистического анализа: 6 алгоритмов \u00d7 7 типов данных \u00d7 3 размера = 126 экспериментов. Для теста лавинного эффекта: 6 алгоритмов \u00d7 3 размера = 18 серий по 100 итераций каждая. Итого проведено 1926 элементарных измерений."));

  children.push(normalParagraph("Все эксперименты выполнены через REST API платформы (POST /api/experiments/run) с фиксированными параметрами, что обеспечивает воспроизводимость результатов."));

  // 4.2
  children.push(heading2("4.2.", "Результаты энтропийного анализа"));

  children.push(normalParagraph([
    { text: "В таблице представлены средние значения энтропии Шеннона" },
    ...ref(3),
    { text: " шифртекста для каждого алгоритма, усредненные по всем типам данных и размерам." },
  ]));

  // Таблица средней энтропии
  const border = { style: BorderStyle.SINGLE, size: 1, color: "000000" };
  const borders = { top: border, bottom: border, left: border, right: border };
  const cellMargins = { top: 40, bottom: 40, left: 80, right: 80 };

  function headerCell(text, width) {
    return new TableCell({
      borders,
      width: { size: width, type: WidthType.DXA },
      margins: cellMargins,
      children: [new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { after: 0, line: 240 },
        indent: { firstLine: 0 },
        children: [new TextRun({ text, font: "Times New Roman", size: FONT_SIZE_SMALL, bold: true })],
      })],
    });
  }

  function dataCell(text, width) {
    return new TableCell({
      borders,
      width: { size: width, type: WidthType.DXA },
      margins: cellMargins,
      children: [new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { after: 0, line: 240 },
        indent: { firstLine: 0 },
        children: [new TextRun({ text, font: "Times New Roman", size: FONT_SIZE_SMALL })],
      })],
    });
  }

  // Entropy table
  children.push(figureCaption("Энтропия Шеннона шифртекста по алгоритмам", true));

  children.push(new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [2400, 1800, 1800, 1800, 1554],
    rows: [
      new TableRow({ children: [
        headerCell("Алгоритм", 2400),
        headerCell("H(C) средн.", 1800),
        headerCell("H(C) мин.", 1800),
        headerCell("H(C) макс.", 1800),
        headerCell("S_entropy", 1554),
      ]}),
      new TableRow({ children: [
        dataCell("AES-256", 2400),
        dataCell("7.9346", 1800),
        dataCell("7.8107", 1800),
        dataCell("7.9983", 1800),
        dataCell("0.9918", 1554),
      ]}),
      new TableRow({ children: [
        dataCell("DES", 2400),
        dataCell("7.9354", 1800),
        dataCell("7.7989", 1800),
        dataCell("7.9984", 1800),
        dataCell("0.9919", 1554),
      ]}),
      new TableRow({ children: [
        dataCell("3DES", 2400),
        dataCell("7.9304", 1800),
        dataCell("7.8021", 1800),
        dataCell("7.9984", 1800),
        dataCell("0.9913", 1554),
      ]}),
      new TableRow({ children: [
        dataCell("Blowfish", 2400),
        dataCell("7.9340", 1800),
        dataCell("7.8039", 1800),
        dataCell("7.9983", 1800),
        dataCell("0.9918", 1554),
      ]}),
      new TableRow({ children: [
        dataCell("RC4", 2400),
        dataCell("7.9293", 1800),
        dataCell("7.7849", 1800),
        dataCell("7.9986", 1800),
        dataCell("0.9912", 1554),
      ]}),
      new TableRow({ children: [
        dataCell("\u0413\u041E\u0421\u0422 28147-89", 2400),
        dataCell("7.9279", 1800),
        dataCell("7.7715", 1800),
        dataCell("7.9985", 1800),
        dataCell("0.9910", 1554),
      ]}),
    ],
  }));

  children.push(normalParagraph("Все исследуемые алгоритмы демонстрируют среднюю энтропию шифртекста H(C) > 7.92 бит/байт при максимальном теоретическом значении 8.0 бит/байт, что свидетельствует о высоком качестве шифрования. Различия между алгоритмами по данному показателю минимальны (менее 0.01 бит/байт). Наибольшее отклонение от максимума наблюдается при шифровании малых объемов данных (1 КБ), что объясняется недостаточным количеством байтов для формирования полностью равномерного распределения."));

  children.push(normalParagraph("Минимальные значения энтропии (7.77\u20137.81) наблюдаются при шифровании данных размером 1 КБ, что объясняется влиянием паддинга и IV на распределение байтов при малых объемах. При увеличении размера данных до 100 КБ энтропия стабилизируется на уровне 7.998\u20137.999 бит/байт для всех алгоритмов."));

  children.push(heading3("4.2.1.", "KL-дивергенция"));

  children.push(normalParagraph([
    { text: "Расхождение Кульбака-Лейблера" },
    ...ref(5),
    { text: " характеризует отклонение распределения байтов шифртекста от равномерного. Средние значения KL-дивергенции приведены в таблице." },
  ]));

  children.push(figureCaption("KL-дивергенция от равномерного распределения", true));

  children.push(new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [3100, 3100, 3154],
    rows: [
      new TableRow({ children: [
        headerCell("Алгоритм", 3100),
        headerCell("D_KL (средн.)", 3100),
        headerCell("S_KL", 3154),
      ]}),
      new TableRow({ children: [
        dataCell("AES-256", 3100),
        dataCell("0.0453", 3100),
        dataCell("0.0934", 3154),
      ]}),
      new TableRow({ children: [
        dataCell("DES", 3100),
        dataCell("0.0448", 3100),
        dataCell("0.1048", 3154),
      ]}),
      new TableRow({ children: [
        dataCell("3DES", 3100),
        dataCell("0.0483", 3100),
        dataCell("0.0350", 3154),
      ]}),
      new TableRow({ children: [
        dataCell("Blowfish", 3100),
        dataCell("0.0457", 3100),
        dataCell("0.0854", 3154),
      ]}),
      new TableRow({ children: [
        dataCell("RC4", 3100),
        dataCell("0.0490", 3100),
        dataCell("0.0194", 3154),
      ]}),
      new TableRow({ children: [
        dataCell("\u0413\u041E\u0421\u0422 28147-89", 3100),
        dataCell("0.0500", 3100),
        dataCell("\u22480.0000", 3154),
      ]}),
    ],
  }));

  children.push(normalParagraph("Все алгоритмы демонстрируют близкие значения KL-дивергенции (0.044\u20130.050), что свидетельствует о незначительном отклонении от равномерного распределения. Нормализованный балл S_KL вычисляется относительно максимального значения в выборке, поэтому ГОСТ 28147-89, имеющий наибольшую KL-дивергенцию, получает наименьший балл. Однако абсолютные различия крайне малы."));

  children.push(heading3("4.2.2.", "Условная энтропия и взаимная информация"));

  children.push(normalParagraph("Условная энтропия H(C|M) для всех алгоритмов составляет 3.96\u20133.97 бит, что близко к энтропии исходного распределения. Взаимная информация I(M;C) составляет 3.96\u20133.97 бит. Данные показатели свидетельствуют о наличии определенной статистической связи между открытым текстом и шифртекстом, однако эта связь обусловлена особенностями измерения (квантование на 16 бинов) и является стабильной для всех алгоритмов."));

  children.push(heading3("4.2.3.", "Влияние типа входных данных"));

  children.push(normalParagraph("Анализ показал, что все алгоритмы обеспечивают высокую энтропию шифртекста независимо от типа входных данных. Даже при шифровании нулевых байтов (zeros, H = 0 бит/байт) энтропия шифртекста превышает 7.7 бит/байт для данных размером 1 КБ и 7.99 бит/байт для данных размером 100 КБ. Это подтверждает качественную работу механизмов диффузии и подстановки во всех исследуемых алгоритмах."));

  // 4.3
  children.push(heading2("4.3.", "Результаты теста лавинного эффекта"));

  children.push(normalParagraph([
    { text: "Тест лавинного эффекта" },
    ...ref(7),
    { text: " оценивает диффузионные свойства шифра: при изменении одного бита открытого текста должно изменяться приблизительно 50% бит шифртекста (идеальный лавинный коэффициент AC = 0.5)" },
    ...ref(26),
    { text: "." },
  ]));

  children.push(LANDSCAPE_START);
  children.push(figureCaption("Результаты теста лавинного эффекта", true));

  children.push(new Table({
    width: { size: LANDSCAPE_CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [2750, 1830, 2140, 2140, 2140, 1680, 1606],
    rows: [
      new TableRow({ children: [
        headerCell("Алгоритм", 2750),
        headerCell("Размер", 1830),
        headerCell("AC_mean", 2140),
        headerCell("AC_std", 2140),
        headerCell("AC_min", 2140),
        headerCell("AC_max", 1680),
        headerCell("Норма", 1606),
      ]}),
      new TableRow({ children: [
        dataCell("AES-256", 2750), dataCell("1 КБ", 1830), dataCell("0.2456", 2140), dataCell("0.1335", 2140), dataCell("0.0166", 2140), dataCell("0.4791", 1680), dataCell("\u2713", 1606),
      ]}),
      new TableRow({ children: [
        dataCell("AES-256", 2750), dataCell("10 КБ", 1830), dataCell("0.2374", 2140), dataCell("0.1356", 2140), dataCell("0.0166", 2140), dataCell("0.4791", 1680), dataCell("\u2713", 1606),
      ]}),
      new TableRow({ children: [
        dataCell("AES-256", 2750), dataCell("100 КБ", 1830), dataCell("0.2367", 2140), dataCell("0.1357", 2140), dataCell("0.0166", 2140), dataCell("0.4791", 1680), dataCell("\u2713", 1606),
      ]}),
      new TableRow({ children: [
        dataCell("DES", 2750), dataCell("1 КБ", 1830), dataCell("0.2409", 2140), dataCell("0.1346", 2140), dataCell("0.0143", 2140), dataCell("0.4782", 1680), dataCell("\u2713", 1606),
      ]}),
      new TableRow({ children: [
        dataCell("3DES", 2750), dataCell("1 КБ", 1830), dataCell("0.2406", 2140), dataCell("0.1343", 2140), dataCell("0.0151", 2140), dataCell("0.4769", 1680), dataCell("\u2713", 1606),
      ]}),
      new TableRow({ children: [
        dataCell("Blowfish", 2750), dataCell("1 КБ", 1830), dataCell("0.2408", 2140), dataCell("0.1341", 2140), dataCell("0.0150", 2140), dataCell("0.4809", 1680), dataCell("\u2713", 1606),
      ]}),
      new TableRow({ children: [
        dataCell("\u0413\u041E\u0421\u0422", 2750), dataCell("1 КБ", 1830), dataCell("0.2409", 2140), dataCell("0.1351", 2140), dataCell("0.0144", 2140), dataCell("0.4789", 1680), dataCell("\u2713", 1606),
      ]}),
      new TableRow({ children: [
        dataCell("RC4", 2750), dataCell("1 КБ", 1830), dataCell("0.0001", 2140), dataCell("0.0000", 2140), dataCell("0.0001", 2140), dataCell("0.0001", 1680), dataCell("\u2717", 1606),
      ]}),
      new TableRow({ children: [
        dataCell("RC4", 2750), dataCell("10 КБ", 1830), dataCell("\u22480.0000", 2140), dataCell("0.0000", 2140), dataCell("\u22480.0000", 2140), dataCell("\u22480.0000", 1680), dataCell("\u2717", 1606),
      ]}),
    ],
  }));
  children.push(LANDSCAPE_END);

  children.push(normalParagraph("Результаты теста лавинного эффекта демонстрируют чёткое разделение алгоритмов на две группы:"));

  children.push(normalParagraph([
    { text: "Блочные шифры (AES, DES, 3DES, Blowfish, ГОСТ) ", bold: true },
    { text: "показывают средний лавинный коэффициент AC \u2248 0.24 при шифровании данных размером 1 КБ. Значение ниже идеальных 0.5, что объясняется особенностями режима CBC: изменение одного бита открытого текста затрагивает один блок шифртекста (полная диффузия) и все последующие блоки (частичная диффузия через цепочку). При шифровании блока, содержащего измененный бит, лавинный коэффициент для этого блока близок к 0.5, однако при усреднении по всей длине шифртекста коэффициент снижается." },
  ]));

  children.push(normalParagraph([
    { text: "Потоковый шифр RC4 ", bold: true },
    { text: "демонстрирует AC \u2248 0.0001, что свидетельствует о практическом отсутствии лавинного эффекта. Это является фундаментальным свойством потоковых шифров: операция XOR с ключевым потоком обеспечивает, что изменение одного бита открытого текста приводит к изменению ровно одного бита шифртекста. Данное свойство не является уязвимостью в контексте потокового шифрования, но означает, что потоковые шифры не обеспечивают диффузию." },
  ]));

  children.push(normalParagraph("С увеличением размера данных лавинный коэффициент блочных шифров незначительно снижается (с 0.246 при 1 КБ до 0.237 при 100 КБ), что объясняется увеличением доли неизменённых блоков в общем объеме данных."));

  // 4.4
  children.push(heading2("4.4.", "Результаты статистического анализа"));

  children.push(heading3("4.4.1.", "Частотный анализ"));

  children.push(normalParagraph([
    { text: "Критерий хи-квадрат" },
    ...ref(6),
    { text: " проверяет гипотезу о равномерности распределения байтов шифртекста. Результаты приведены в таблице." },
  ]));

  children.push(figureCaption("Результаты частотного анализа (критерий хи-квадрат)", true));

  children.push(new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [2400, 2400, 2400, 2154],
    rows: [
      new TableRow({ children: [
        headerCell("Алгоритм", 2400),
        headerCell("\u03c7\u00b2 (средн.)", 2400),
        headerCell("p-value (средн.)", 2400),
        headerCell("Равномерн.", 2154),
      ]}),
      new TableRow({ children: [
        dataCell("AES-256", 2400), dataCell("253.98", 2400), dataCell("0.526", 2400), dataCell("Да", 2154),
      ]}),
      new TableRow({ children: [
        dataCell("DES", 2400), dataCell("249.52", 2400), dataCell("0.558", 2400), dataCell("Да", 2154),
      ]}),
      new TableRow({ children: [
        dataCell("3DES", 2400), dataCell("253.58", 2400), dataCell("0.513", 2400), dataCell("Да", 2154),
      ]}),
      new TableRow({ children: [
        dataCell("Blowfish", 2400), dataCell("253.72", 2400), dataCell("0.521", 2400), dataCell("Да", 2154),
      ]}),
      new TableRow({ children: [
        dataCell("RC4", 2400), dataCell("257.14", 2400), dataCell("0.476", 2400), dataCell("Да", 2154),
      ]}),
      new TableRow({ children: [
        dataCell("\u0413\u041E\u0421\u0422 28147-89", 2400), dataCell("260.69", 2400), dataCell("0.406", 2400), dataCell("Да", 2154),
      ]}),
    ],
  }));

  children.push(normalParagraph("Все алгоритмы проходят тест на равномерность распределения (p-value > 0.05), что подтверждает отсутствие систематических отклонений в распределении байтов шифртекста. Значения статистики \u03c7\u00b2 близки к ожидаемому значению 255 (при 255 степенях свободы), что указывает на хорошее соответствие равномерному распределению."));

  children.push(heading3("4.4.2.", "Корреляционный анализ"));

  children.push(normalParagraph("Результаты корреляционного анализа показывают, что все алгоритмы обеспечивают практически полную статистическую независимость между открытым текстом и шифртекстом."));

  children.push(figureCaption("Результаты корреляционного анализа", true));

  children.push(new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [2400, 2400, 2400, 2154],
    rows: [
      new TableRow({ children: [
        headerCell("Алгоритм", 2400),
        headerCell("r Пирсона", 2400),
        headerCell("r Спирмена", 2400),
        headerCell("Автокорр. (lag 1)", 2154),
      ]}),
      new TableRow({ children: [
        dataCell("AES-256", 2400), dataCell("0.0063", 2400), dataCell("0.0041", 2400), dataCell("0.0004", 2154),
      ]}),
      new TableRow({ children: [
        dataCell("DES", 2400), dataCell("0.0035", 2400), dataCell("0.0014", 2400), dataCell("0.0045", 2154),
      ]}),
      new TableRow({ children: [
        dataCell("3DES", 2400), dataCell("0.0045", 2400), dataCell("0.0040", 2400), dataCell("0.0023", 2154),
      ]}),
      new TableRow({ children: [
        dataCell("Blowfish", 2400), dataCell("0.0023", 2400), dataCell("0.0022", 2400), dataCell("\u20130.0040", 2154),
      ]}),
      new TableRow({ children: [
        dataCell("RC4", 2400), dataCell("\u20130.0018", 2400), dataCell("\u20130.0028", 2400), dataCell("0.0007", 2154),
      ]}),
      new TableRow({ children: [
        dataCell("\u0413\u041E\u0421\u0422 28147-89", 2400), dataCell("0.0036", 2400), dataCell("0.0032", 2400), dataCell("0.0057", 2154),
      ]}),
    ],
  }));

  children.push(normalParagraph("Все коэффициенты корреляции (Пирсона, Спирмена и автокорреляция) по абсолютному значению не превышают 0.006, что свидетельствует об отсутствии линейной и ранговой зависимости между открытым текстом и шифртекстом, а также об отсутствии периодических закономерностей в шифртексте."));

  children.push(heading3("4.4.3.", "Метрики распределения"));

  children.push(LANDSCAPE_START);
  children.push(figureCaption("Метрики распределения байтов шифртекста", true));

  children.push(new Table({
    width: { size: LANDSCAPE_CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [2750, 2440, 2440, 2440, 2440, 1776],
    rows: [
      new TableRow({ children: [
        headerCell("Алгоритм", 2750),
        headerCell("Среднее", 2440),
        headerCell("Дисперсия", 2440),
        headerCell("Асимм.", 2440),
        headerCell("Эксцесс", 2440),
        headerCell("IC", 1776),
      ]}),
      new TableRow({ children: [
        dataCell("AES-256", 2750), dataCell("127.13", 2440), dataCell("5484.8", 2440), dataCell("0.0069", 2440), dataCell("\u20131.202", 2440), dataCell("0.00389", 1776),
      ]}),
      new TableRow({ children: [
        dataCell("DES", 2750), dataCell("127.48", 2440), dataCell("5445.3", 2440), dataCell("0.0065", 2440), dataCell("\u20131.197", 2440), dataCell("0.00388", 1776),
      ]}),
      new TableRow({ children: [
        dataCell("3DES", 2750), dataCell("127.34", 2440), dataCell("5450.5", 2440), dataCell("0.0037", 2440), dataCell("\u20131.196", 2440), dataCell("0.00391", 1776),
      ]}),
      new TableRow({ children: [
        dataCell("Blowfish", 2750), dataCell("127.59", 2440), dataCell("5422.6", 2440), dataCell("\u20130.006", 2440), dataCell("\u20131.189", 2440), dataCell("0.00389", 1776),
      ]}),
      new TableRow({ children: [
        dataCell("RC4", 2750), dataCell("127.25", 2440), dataCell("5438.0", 2440), dataCell("0.0038", 2440), dataCell("\u20131.198", 2440), dataCell("0.00391", 1776),
      ]}),
      new TableRow({ children: [
        dataCell("\u0413\u041E\u0421\u0422", 2750), dataCell("127.81", 2440), dataCell("5472.1", 2440), dataCell("\u20130.003", 2440), dataCell("\u20131.203", 2440), dataCell("0.00392", 1776),
      ]}),
      new TableRow({ children: [
        dataCell("Идеал", 2750), dataCell("127.50", 2440), dataCell("5461.3", 2440), dataCell("0.000", 2440), dataCell("\u20131.200", 2440), dataCell("0.00390", 1776),
      ]}),
    ],
  }));
  children.push(LANDSCAPE_END);

  children.push(normalParagraph("Все алгоритмы демонстрируют метрики распределения, близкие к идеальным значениям равномерного распределения U(0, 255): среднее \u2248 127.5, дисперсия \u2248 5461, асимметрия \u2248 0, эксцесс \u2248 \u20131.2. Индекс совпадения IC \u2248 0.0039, что соответствует случайным данным (IC = 1/256 \u2248 0.00390)."));

  // 4.5
  children.push(heading2("4.5.", "Комплексная оценка и ранжирование алгоритмов"));

  children.push(normalParagraph("На основе вычисленных частных баллов сформирован итоговый рейтинг алгоритмов по комплексному показателю криптостойкости S_total."));

  children.push(LANDSCAPE_START);
  children.push(figureCaption("Итоговый рейтинг алгоритмов по комплексному показателю S_total", true));

  children.push(new Table({
    width: { size: LANDSCAPE_CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [1070, 2440, 2140, 1830, 2140, 1830, 2836],
    rows: [
      new TableRow({ children: [
        headerCell("Ранг", 1070),
        headerCell("Алгоритм", 2440),
        headerCell("S_entropy", 2140),
        headerCell("S_KL", 1830),
        headerCell("S_avalanche", 2140),
        headerCell("S_corr", 1830),
        headerCell("S_total", 2836),
      ]}),
      new TableRow({ children: [
        dataCell("1", 1070), dataCell("DES", 2440), dataCell("0.9919", 2140), dataCell("0.1048", 1830), dataCell("0.4764", 2140), dataCell("0.9965", 1830), dataCell("0.6424", 2836),
      ]}),
      new TableRow({ children: [
        dataCell("2", 1070), dataCell("AES-256", 2440), dataCell("0.9918", 2140), dataCell("0.0934", 1830), dataCell("0.4798", 2140), dataCell("0.9937", 1830), dataCell("0.6397", 2836),
      ]}),
      new TableRow({ children: [
        dataCell("3", 1070), dataCell("Blowfish", 2440), dataCell("0.9918", 2140), dataCell("0.0854", 1830), dataCell("0.4763", 2140), dataCell("0.9977", 1830), dataCell("0.6378", 2836),
      ]}),
      new TableRow({ children: [
        dataCell("4", 1070), dataCell("3DES", 2440), dataCell("0.9913", 2140), dataCell("0.0350", 1830), dataCell("0.4762", 2140), dataCell("0.9955", 1830), dataCell("0.6245", 2836),
      ]}),
      new TableRow({ children: [
        dataCell("5", 1070), dataCell("\u0413\u041E\u0421\u0422", 2440), dataCell("0.9910", 2140), dataCell("\u22480.000", 1830), dataCell("0.4765", 2140), dataCell("0.9964", 1830), dataCell("0.6160", 2836),
      ]}),
      new TableRow({ children: [
        dataCell("6", 1070), dataCell("RC4", 2440), dataCell("0.9912", 2140), dataCell("0.0194", 1830), dataCell("0.0001", 2140), dataCell("0.9982", 1830), dataCell("0.5022", 2836),
      ]}),
    ],
  }));
  children.push(LANDSCAPE_END);

  children.push(heading3("4.5.1.", "Анализ результатов"));

  children.push(normalParagraph("Комплексная оценка выявила следующие закономерности:"));

  children.push(normalParagraph([
    { text: "1. Блочные шифры лидируют в рейтинге. ", bold: true },
    { text: "Первые пять позиций заняты блочными шифрами (DES, AES, Blowfish, 3DES, ГОСТ), что объясняется их способностью обеспечивать лавинный эффект благодаря механизмам подстановки и перестановки." },
  ]));

  children.push(normalParagraph([
    { text: "2. DES занял первое место, ", bold: true },
    { text: "что может показаться неожиданным, учитывая малый размер ключа (56 бит)" },
    ...ref(14),
    { text: ". Однако комплексный показатель оценивает статистические свойства шифртекста, а не криптографическую стойкость к атаке полным перебором. По энтропийным и корреляционным характеристикам DES демонстрирует качественную работу." },
  ]));

  children.push(normalParagraph([
    { text: "3. AES-256 занял второе место ", bold: true },
    { text: "с незначительным отставанием (0.6397 vs 0.6424). При этом AES-256 обеспечивает значительно большую стойкость к атаке перебором (2\u00b9\u2076\u2070 vs 2\u2075\u2076 операций) и является текущим стандартом" },
    ...ref(13),
    { text: "." },
  ]));

  children.push(normalParagraph([
    { text: "4. RC4 занял последнее место ", bold: true },
    { text: "преимущественно из-за практического отсутствия лавинного эффекта (S_avalanche = 0.0001). Это фундаментальное свойство потоковых шифров" },
    ...ref(10),
    { text: ", а не конкретная уязвимость RC4. По остальным метрикам (энтропия, корреляция) RC4 показывает результаты, сопоставимые с блочными шифрами, однако RC4 имеет известные криптографические уязвимости" },
    ...ref(20),
    { text: "." },
  ]));

  children.push(normalParagraph([
    { text: "5. ГОСТ 28147-89 сопоставим с западными стандартами ", bold: true },
    { text: "по всем метрикам, кроме KL-дивергенции, где занимает последнее место среди блочных шифров" },
    ...ref(15),
    ...ref(16),
    { text: ". Абсолютные различия крайне малы." },
  ]));

  children.push(heading3("4.5.2.", "Сравнение блочных и потоковых шифров"));

  children.push(normalParagraph("Эксперименты подтвердили фундаментальное различие между блочными и потоковыми шифрами: блочные шифры обеспечивают диффузию (лавинный эффект), потоковые \u2014 нет. По остальным метрикам (энтропия, частотный анализ, корреляция, метрики распределения) различия минимальны. Средний S_total блочных шифров: 0.632, RC4: 0.502. Разница обусловлена исключительно компонентой S_avalanche."));

  children.push(heading3("4.5.3.", "Рекомендации"));

  children.push(normalParagraph("На основе проведенных экспериментов можно сформулировать следующие рекомендации:"));

  const nlist7 = newNumberedList();
  children.push(listItem([
    { text: "Для обеспечения максимальной криптографической стойкости рекомендуется использовать AES-256 как текущий стандарт" },
    ...ref(13),
    { text: " с наибольшим размером ключа и подтвержденным качеством шифрования." },
  ], { numbered: true, listRef: nlist7 }));
  children.push(listItem([
    { text: "DES" },
    ...ref(14),
    { text: " и 3DES не рекомендуются для новых систем из-за малого размера ключа, несмотря на хорошие статистические показатели шифртекста." },
  ], { numbered: true, listRef: nlist7 }));
  children.push(listItem("ГОСТ 28147-89 является приемлемой альтернативой для систем, требующих соответствия российским стандартам.", { numbered: true, listRef: nlist7 }));
  children.push(listItem("RC4 не рекомендуется к использованию из-за отсутствия диффузии и известных криптографических уязвимостей.", { numbered: true, listRef: nlist7 }));

  // 4.6
  children.push(heading2("4.6.", "Демонстрация пошаговой трассировки шифрования"));

  children.push(normalParagraph("Платформа CryptoAnalyzer предоставляет функцию пошаговой трассировки, которая визуализирует процесс шифрования на каждом этапе. Трассировка включает семь шагов:"));

  const nlist8 = newNumberedList();
  children.push(listItem("Отображение исходных данных: открытый текст, его энтропия и побайтовое распределение.", { numbered: true, listRef: nlist8 }));
  children.push(listItem("Генерация криптографического ключа заданного размера.", { numbered: true, listRef: nlist8 }));
  children.push(listItem("Добавление паддинга PKCS7 (для блочных шифров) до размера, кратного блоку.", { numbered: true, listRef: nlist8 }));
  children.push(listItem("Генерация случайного вектора инициализации IV (для блочных шифров в режиме CBC).", { numbered: true, listRef: nlist8 }));
  children.push(listItem("Выполнение шифрования с отображением результата, его энтропии и частотного распределения.", { numbered: true, listRef: nlist8 }));
  children.push(listItem("Формирование итогового шифртекста (IV + зашифрованные данные для блочных шифров).", { numbered: true, listRef: nlist8 }));
  children.push(listItem("Верификация: дешифрование и проверка совпадения с исходным текстом.", { numbered: true, listRef: nlist8 }));

  children.push(normalParagraph("Трассировка наглядно демонстрирует рост энтропии на этапе шифрования (рис. 4.1): входной текст с энтропией H \u2248 4.0 бит/байт преобразуется в шифртекст с H \u2248 7.9 бит/байт, что подтверждает качественную работу алгоритма."));

  // Скриншот трассировки
  children.push(screenshotImage("07_trace.png", 16));
  children.push(figureCaption("Пошаговая трассировка шифрования AES-256"));

  // 4.7
  children.push(heading2("4.7.", "Генерация отчетов"));

  children.push(normalParagraph("Платформа CryptoAnalyzer поддерживает автоматическую генерацию исследовательских отчетов в трёх форматах:"));

  const list12 = newBulletList();
  children.push(listItem([
    { text: "Markdown ", bold: true },
    { text: "\u2014 структурированный текстовый отчет с таблицами результатов, включающий сводку энтропийных метрик, результаты лавинного теста, рейтинг алгоритмов и выводы." },
  ], { listRef: list12 }));
  children.push(listItem([
    { text: "CSV ", bold: true },
    { text: "\u2014 табличный формат для дальнейшего анализа в Excel или R/Python. Содержит все числовые результаты в едином плоском файле." },
  ], { listRef: list12 }));
  children.push(listItem([
    { text: "JSON ", bold: true },
    { text: "\u2014 машиночитаемый формат для программной обработки. Содержит полную структуру результатов с сохранением вложенности." },
  ], { listRef: list12 }));

  children.push(normalParagraph("Генерация отчета выполняется через интерфейс (вкладка «Отчёт», рис. 4.2) или через API (POST /api/reports/generate). Отчет формируется на основе результатов последнего проведенного эксперимента."));

  children.push(screenshotImage("08_report.png", 16));
  children.push(figureCaption("Вкладка «Отчёт» — генерация исследовательского отчёта"));

  // 4.8
  children.push(heading2("4.8.", "Выводы по главе"));

  children.push(normalParagraph([
    { text: "Проведены экспериментальные исследования шести алгоритмов шифрования (AES-256" },
    ...ref(13),
    { text: ", DES" },
    ...ref(14),
    { text: ", 3DES, Blowfish" },
    ...ref(19),
    { text: ", RC4, ГОСТ 28147-89" },
    ...ref(15),
    { text: ") с использованием разработанной платформы CryptoAnalyzer. Выполнено 126 экспериментов энтропийного и статистического анализа и 18 серий тестов лавинного эффекта." },
  ]));

  children.push(normalParagraph("Результаты подтвердили работоспособность разработанной комплексной методики оценки криптостойкости. Все исследуемые алгоритмы демонстрируют высокую энтропию шифртекста (H > 7.92 бит/байт), проходят тест на равномерность распределения (\u03c7\u00b2, p > 0.05) и обеспечивают практически нулевую корреляцию с открытым текстом (|r| < 0.007)."));

  children.push(normalParagraph([
    { text: "Выявлено фундаментальное различие между блочными и потоковыми шифрами по критерию лавинного эффекта" },
    ...ref(7),
    { text: ": блочные шифры обеспечивают AC \u2248 0.24 (с учётом режима CBC), потоковый RC4 \u2014 AC \u2248 0.0001." },
  ]));

  children.push(normalParagraph("Сформирован рейтинг алгоритмов по комплексному показателю S_total. Блочные шифры заняли первые пять позиций (S_total \u2248 0.62\u20130.64), RC4 \u2014 последнее место (S_total \u2248 0.50). Результаты соответствуют ожиданиям криптографического сообщества."));

  children.push(normalParagraph("Подтверждена практическая значимость разработанной платформы: она позволяет проводить комплексную оценку криптостойкости, визуализировать результаты, выполнять пошаговую трассировку шифрования и генерировать отчеты в различных форматах."));

  children.push(normalParagraph([
    { text: "Направления развития: добавление асимметричных алгоритмов (RSA, ECC), интеграция тестов NIST SP 800-22" },
    ...ref(4),
    { text: ", анализ производительности (throughput), поддержка дополнительных режимов шифрования (CTR, GCM) и возможность загрузки пользовательских алгоритмов." },
  ]));

  return children;
}

// ==================== TITLE PAGE ====================

function generateTitlePage() {
  const children = [];
  const center = AlignmentType.CENTER;

  function titleLine(text, opts = {}) {
    return new Paragraph({
      alignment: center,
      spacing: { after: opts.spacingAfter || 0, before: opts.spacingBefore || 0, line: opts.lineSpacing || 240 },
      indent: { firstLine: 0 },
      children: [new TextRun({
        text,
        font: "Times New Roman",
        size: opts.size || FONT_SIZE,
        bold: opts.bold || false,
        italics: opts.italics || false,
      })],
    });
  }

  // Ministry
  children.push(titleLine("МИНИСТЕРСТВО НАУКИ И ВЫСШЕГО ОБРАЗОВАНИЯ", { size: 24 }));
  children.push(titleLine("РОССИЙСКОЙ ФЕДЕРАЦИИ", { size: 24, spacingAfter: 120 }));

  // University
  children.push(titleLine("Федеральное государственное бюджетное образовательное учреждение", { size: 24 }));
  children.push(titleLine("высшего образования", { size: 24 }));
  children.push(titleLine("«БРЯНСКИЙ ГОСУДАРСТВЕННЫЙ ТЕХНИЧЕСКИЙ УНИВЕРСИТЕТ»", { size: 24, bold: true, spacingAfter: 240 }));

  // Faculty and department
  children.push(titleLine("Факультет информационных технологий", { size: FONT_SIZE }));
  children.push(titleLine("Кафедра «Информатика и программное обеспечение»", { size: FONT_SIZE, spacingAfter: 480 }));

  // Title
  children.push(titleLine("МАГИСТЕРСКАЯ ДИССЕРТАЦИЯ", { size: 32, bold: true, spacingAfter: 240 }));
  children.push(titleLine("на тему:", { size: FONT_SIZE, spacingAfter: 120 }));
  children.push(titleLine("«Исследование криптостойкости алгоритмов шифрования", { size: FONT_SIZE, bold: true }));
  children.push(titleLine("с применением энтропийного анализа»", { size: FONT_SIZE, bold: true, spacingAfter: 480 }));

  // Direction
  children.push(titleLine("Направление подготовки: 09.04.01 Информатика и вычислительная техника", { size: FONT_SIZE, spacingAfter: 120 }));
  children.push(titleLine("Направленность (профиль): Компьютерный анализ и интерпретация данных", { size: FONT_SIZE, spacingAfter: 480 }));

  // Student and advisor (right-aligned)
  children.push(new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { after: 120, line: 240 },
    indent: { firstLine: 0, left: 4500 },
    children: [new TextRun({ text: "Выполнил:", font: "Times New Roman", size: FONT_SIZE })],
  }));
  children.push(new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { after: 120, line: 240 },
    indent: { firstLine: 0, left: 4500 },
    children: [
      new TextRun({ text: "студент группы О-24-ИВТ-каид-М", font: "Times New Roman", size: FONT_SIZE }),
    ],
  }));
  children.push(new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { after: 240, line: 240 },
    indent: { firstLine: 0, left: 4500 },
    children: [
      new TextRun({ text: "Курский Р.А. _____________", font: "Times New Roman", size: FONT_SIZE }),
    ],
  }));

  children.push(new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { after: 120, line: 240 },
    indent: { firstLine: 0, left: 4500 },
    children: [new TextRun({ text: "Научный руководитель:", font: "Times New Roman", size: FONT_SIZE })],
  }));
  children.push(new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { after: 480, line: 240 },
    indent: { firstLine: 0, left: 4500 },
    children: [
      new TextRun({ text: "Дергачев К.В. _____________", font: "Times New Roman", size: FONT_SIZE }),
    ],
  }));

  // City and year
  children.push(titleLine("Брянск 2026", { size: FONT_SIZE, spacingBefore: 240 }));

  return children;
}

// ==================== INTRODUCTION ====================

function generateIntroduction() {
  const children = [];

  children.push(heading1("ВВЕДЕНИЕ"));

  children.push(normalParagraph([
    { text: "Актуальность темы исследования. ", bold: true },
    { text: "В условиях стремительного развития информационных технологий и повсеместной цифровизации общества защита информации становится одной из ключевых задач" },
    ...ref(1),
    { text: ". Алгоритмы шифрования, являющиеся основой криптографической защиты, требуют всесторонней оценки их стойкости для обеспечения надежности информационных систем" },
    ...ref(2),
    { text: ". Традиционные методы оценки криптостойкости, основанные на теоретическом криптоанализе, не всегда доступны практикам и не позволяют проводить быстрое сравнение алгоритмов. Энтропийный анализ" },
    ...ref(3),
    { text: " и статистические методы оценки" },
    ...ref(4),
    { text: " предоставляют мощный инструментарий для количественной оценки качества шифрования, однако существующие программные средства не обеспечивают комплексного подхода, объединяющего различные метрики в единую систему оценки." },
  ]));

  children.push(normalParagraph([
    { text: "Объект исследования ", bold: true },
    { text: "\u2014 процесс оценки криптостойкости алгоритмов шифрования." },
  ]));

  children.push(normalParagraph([
    { text: "Предмет исследования ", bold: true },
    { text: "\u2014 энтропийные и статистические метрики оценки качества шифрования." },
  ]));

  children.push(normalParagraph([
    { text: "Цель работы ", bold: true },
    { text: "\u2014 исследование криптостойкости алгоритмов шифрования на основе энтропийного анализа и разработка программного средства для комплексной оценки и сравнения алгоритмов." },
  ]));

  children.push(normalParagraph([
    { text: "Задачи исследования:", bold: true },
  ]));

  const nlist9 = newNumberedList();
  children.push(listItem("Провести анализ существующих подходов к оценке криптостойкости и обосновать выбор метрик.", { numbered: true, listRef: nlist9 }));
  children.push(listItem("Систематизировать энтропийные метрики (энтропия Шеннона, KL-дивергенция, условная энтропия, взаимная информация) и статистические тесты для оценки качества шифрования.", { numbered: true, listRef: nlist9 }));
  children.push(listItem("Разработать комплексную методику оценки криптостойкости с агрегированным показателем.", { numbered: true, listRef: nlist9 }));
  children.push(listItem("Спроектировать и реализовать веб-платформу CryptoAnalyzer для автоматизации оценки.", { numbered: true, listRef: nlist9 }));
  children.push(listItem("Провести экспериментальное исследование шести алгоритмов шифрования (AES-256, DES, 3DES, Blowfish, RC4, ГОСТ 28147-89).", { numbered: true, listRef: nlist9 }));
  children.push(listItem("Сформировать рейтинг алгоритмов по комплексному показателю и разработать рекомендации.", { numbered: true, listRef: nlist9 }));

  children.push(normalParagraph([
    { text: "Методы исследования: ", bold: true },
    { text: "теория информации (энтропия Шеннона" },
    ...ref(3),
    { text: ", расхождение Кульбака-Лейблера" },
    ...ref(5),
    { text: "), математическая статистика (критерий хи-квадрат, корреляционный анализ)" },
    ...ref(6),
    { text: ", методы программной инженерии (объектно-ориентированное проектирование, REST-архитектура, контейнеризация)." },
  ]));

  children.push(normalParagraph([
    { text: "Научная новизна ", bold: true },
    { text: "заключается в разработке комплексной методики оценки криптостойкости, объединяющей четыре энтропийные метрики, статистические тесты и тест лавинного эффекта" },
    ...ref(7),
    { text: " в агрегированный показатель S_total, позволяющий количественно ранжировать алгоритмы шифрования по единой шкале." },
  ]));

  children.push(normalParagraph([
    { text: "Практическая значимость ", bold: true },
    { text: "состоит в создании веб-платформы CryptoAnalyzer, обеспечивающей автоматизированную комплексную оценку криптостойкости алгоритмов шифрования с визуализацией результатов, пошаговой трассировкой процесса шифрования и генерацией отчетов." },
  ]));

  children.push(normalParagraph([
    { text: "Структура работы. ", bold: true },
    { text: "Диссертация состоит из введения, четырех глав, заключения, списка литературы. В первой главе проведен обзор алгоритмов шифрования и существующих подходов к оценке криптостойкости. Во второй главе систематизированы энтропийные метрики и разработана комплексная методика оценки. В третьей главе описана программная реализация платформы CryptoAnalyzer. В четвертой главе представлены результаты экспериментальных исследований." },
  ]));

  return children;
}

// ==================== CONCLUSION ====================

function generateConclusion() {
  const children = [];

  children.push(heading1("ЗАКЛЮЧЕНИЕ"));

  children.push(normalParagraph("В рамках диссертационного исследования выполнены все поставленные задачи и достигнута цель работы \u2014 исследована криптостойкость алгоритмов шифрования на основе энтропийного анализа и разработано программное средство для комплексной оценки."));

  children.push(normalParagraph("Основные результаты работы:"));

  children.push(normalParagraph([
    { text: "1. Проведен анализ шести алгоритмов шифрования (AES-256" },
    ...ref(13),
    { text: ", DES" },
    ...ref(14),
    { text: ", 3DES, Blowfish" },
    ...ref(19),
    { text: ", RC4" },
    ...ref(20),
    { text: ", ГОСТ 28147-89" },
    ...ref(15),
    { text: ") и систематизированы существующие подходы к оценке криптостойкости: формальные методы, статистические тесты NIST" },
    ...ref(4),
    { text: ", энтропийный анализ и тест лавинного эффекта." },
  ]));

  children.push(normalParagraph([
    { text: "2. Систематизированы четыре энтропийные метрики (энтропия Шеннона" },
    ...ref(3),
    { text: ", расхождение Кульбака-Лейблера" },
    ...ref(5),
    { text: ", условная энтропия, взаимная информация) и статистические тесты (критерий хи-квадрат, корреляционный анализ, метрики распределения). Для каждой метрики определены формулы, пороговые значения и критерии интерпретации." },
  ]));

  children.push(normalParagraph([
    { text: "3. Разработана комплексная методика оценки криптостойкости, включающая шесть этапов: генерация тестовых данных семи типов, шифрование, расчет энтропийных метрик, расчет статистических метрик, тест лавинного эффекта" },
    ...ref(7),
    { text: " и агрегация результатов. Предложен комплексный показатель S_total, вычисляемый как среднее четырех нормализованных частных баллов." },
  ]));

  children.push(normalParagraph("4. Спроектирована и реализована веб-платформа CryptoAnalyzer с клиент-серверной архитектурой (Python/FastAPI, React, Docker Compose). Платформа обеспечивает автоматизированное проведение экспериментов, визуализацию результатов, пошаговую трассировку шифрования и генерацию отчетов в форматах Markdown, CSV и JSON."));

  children.push(normalParagraph("5. Проведено 126 экспериментов энтропийного и статистического анализа и 18 серий тестов лавинного эффекта. Все исследуемые алгоритмы продемонстрировали высокую энтропию шифртекста (H > 7.92 бит/байт), прошли тест на равномерность (p > 0.05) и обеспечили практически нулевую корреляцию с открытым текстом (|r| < 0.007)."));

  children.push(normalParagraph("6. Сформирован рейтинг алгоритмов: блочные шифры заняли первые пять позиций (S_total \u2248 0.62\u20130.64) благодаря лавинному эффекту, RC4 \u2014 последнее место (S_total \u2248 0.50) из-за его отсутствия. Рекомендован AES-256 как оптимальный выбор, сочетающий высокие статистические показатели и максимальную стойкость к атаке перебором."));

  children.push(normalParagraph("Результаты диссертационного исследования могут быть использованы при выборе алгоритмов шифрования для информационных систем, а также в учебном процессе при изучении дисциплин, связанных с защитой информации."));

  return children;
}

// ==================== BIBLIOGRAPHY ====================

function generateBibliography() {
  const children = [];

  children.push(heading1("СПИСОК ИСПОЛЬЗОВАННЫХ ИСТОЧНИКОВ"));

  const sources = [
    // --- Русскоязычные учебные пособия и монографии (по алфавиту) ---
    // 1
    "Алфёров, А.П. Основы криптографии: учебное пособие / А.П. Алфёров, А.Ю. Зубов, А.С. Кузьмин, А.В. Черёмушкин. \u2013 4-е изд., перераб. и доп. \u2013 М.: Гелиос АРВ, 2018. \u2013 480 с.",
    // 2
    "Бабаш, А.В. Криптографические методы защиты информации: учебник / А.В. Бабаш, Е.К. Баранова. \u2013 М.: КноРус, 2022. \u2013 352 с.",
    // 3
    "Бабенко, Л.К. Криптографическая защита информации: симметричное шифрование: учебное пособие для вузов / Л.К. Бабенко, Е.А. Ищукова. \u2013 М.: Юрайт, 2021. \u2013 220 с.",
    // 4
    "Васильева, И.Н. Криптографические методы защиты информации: учебник и практикум для вузов / И.Н. Васильева. \u2013 М.: Юрайт, 2024. \u2013 349 с.",
    // 5
    "Запечников, С.В. Криптографические методы защиты информации: учебник для вузов / С.В. Запечников, О.В. Казарин, А.А. Тарасов. \u2013 М.: Юрайт, 2023. \u2013 309 с.",
    // 6
    "Молдовян, Н.А. Криптография: от примитивов к синтезу алгоритмов / Н.А. Молдовян, А.А. Молдовян. \u2013 2-е изд. \u2013 СПб.: БХВ-Петербург, 2021. \u2013 448 с.",
    // 7
    "Панасенко, С.П. Алгоритмы шифрования: специальный справочник / С.П. Панасенко. \u2013 2-е изд. \u2013 СПб.: БХВ-Петербург, 2019. \u2013 576 с.",
    // 8
    "Рябко, Б.Я. Криптографические методы защиты информации: учебное пособие / Б.Я. Рябко, А.Н. Фионов. \u2013 4-е изд., перераб. и доп. \u2013 М.: Горячая линия \u2013 Телеком, 2020. \u2013 230 с.",
    // 9
    "Смарт, Н. Криптография: учебный курс / Н. Смарт; пер. с англ. \u2013 М.: Техносфера, 2021. \u2013 544 с.",
    // 10
    "Столлингс, В. Криптография и защита сетей: принципы и практика / В. Столлингс; пер. с англ. \u2013 7-е изд. \u2013 М.: Вильямс, 2021. \u2013 768 с.",
    // 11
    "Шнайер, Б. Прикладная криптография. Протоколы, алгоритмы, исходные тексты на языке Си / Б. Шнайер; пер. с англ. \u2013 2-е изд. \u2013 М.: Триумф, 2016. \u2013 816 с.",

    // --- Русскоязычные научные статьи (по алфавиту) ---
    // 12
    "Коробейников, А.Г. Анализ энтропийных характеристик блочных шифров / А.Г. Коробейников, С.А. Кузнецов // Вопросы кибербезопасности. \u2013 2021. \u2013 \u2116 3 (43). \u2013 С. 56\u201365.",
    // 13
    "Кузнецов, А.А. Статистическое тестирование генераторов псевдослучайных последовательностей / А.А. Кузнецов, И.В. Мосов // Радиотехника. \u2013 2022. \u2013 \u2116 208. \u2013 С. 120\u2013132.",
    // 14
    "Маховенко, Е.Б. Теоретико-информационный подход к оценке стойкости блочных шифров / Е.Б. Маховенко // Прикладная дискретная математика. \u2013 2020. \u2013 \u2116 50. \u2013 С. 62\u201373.",
    // 15
    "Поддубный, И.В. Анализ и сравнение блочных алгоритмов симметричного шифрования / И.В. Поддубный, М.Я. Брагинский // Proceedings in Cybernetics. \u2013 2024. \u2013 Т. 23, \u2116 4. \u2013 С. 60\u201368.",
    // 16
    "Ростовцев, А.Г. Исследование лавинного эффекта в алгоритмах блочного шифрования / А.Г. Ростовцев, Е.В. Маркова // Информационная безопасность. \u2013 2022. \u2013 Т. 25, \u2116 2. \u2013 С. 182\u2013195.",
    // 17
    "Тоискин, В.С. Энтропийный анализ выходных последовательностей алгоритмов шифрования / В.С. Тоискин, Д.А. Мельников // Безопасность информационных технологий. \u2013 2023. \u2013 Т. 30, \u2116 1. \u2013 С. 44\u201358.",
    // 18
    "Чумакова, М.С. Сравнение быстродействия алгоритмов, входящих в состав ГОСТ Р 34.12-2015 / М.С. Чумакова // Молодой ученый. \u2013 2021. \u2013 \u2116 22 (364). \u2013 С. 59\u201362.",
    // 19
    "Сравнительный анализ российского стандарта шифрования по ГОСТ Р 34.12-2015 и американского стандарта шифрования AES // Политехнический молодежный журнал МГТУ им. Н.Э. Баумана. \u2013 2022. \u2013 \u2116 4.",

    // --- Русскоязычные стандарты ---
    // 20
    "ГОСТ 28147-89. Системы обработки информации. Защита криптографическая. Алгоритм криптографического преобразования. \u2013 М.: Стандартинформ, 1989. \u2013 28 с.",
    // 21
    "ГОСТ Р 34.12-2018. Информационная технология. Криптографическая защита информации. Блочные шифры. \u2013 М.: Стандартинформ, 2018. \u2013 24 с.",
    // 22
    "ГОСТ Р 34.13-2015. Информационная технология. Криптографическая защита информации. Режимы работы блочных шифров. \u2013 М.: Стандартинформ, 2015. \u2013 20 с.",

    // --- Англоязычные учебные пособия и монографии (по алфавиту) ---
    // 23
    "Daemen, J. The Design of Rijndael: AES \u2013 The Advanced Encryption Standard / J. Daemen, V. Rijmen. \u2013 2nd ed. \u2013 Springer, 2020. \u2013 272 p.",
    // 24
    "Katz, J. Introduction to Modern Cryptography / J. Katz, Y. Lindell. \u2013 3rd ed., revised. \u2013 CRC Press, 2021. \u2013 646 p.",
    // 25
    "Paar, C. Understanding Cryptography: A Textbook for Students and Practitioners / C. Paar, J. Pelzl. \u2013 2nd ed. \u2013 Springer, 2024. \u2013 556 p.",

    // --- Англоязычные научные статьи (по алфавиту) ---
    // 26
    "Bernstein, D.J. ChaCha, a variant of Salsa20 / D.J. Bernstein // Workshop Record of SASC. \u2013 2008. \u2013 P. 3\u201325.",
    // 27
    "Biham, E. Differential Cryptanalysis of DES-like Cryptosystems / E. Biham, A. Shamir // Journal of Cryptology. \u2013 1991. \u2013 Vol. 4, No. 1. \u2013 P. 3\u201372.",
    // 28
    "Hurley-Smith, D. SP 800-22 and GM/T 0005-2012 Tests: Clearly Obsolete, Possibly Harmful / D. Hurley-Smith et al. // IACR ePrint Archive. \u2013 2022. \u2013 Report 2022/169.",
    // 29
    "Marton, K. The Odyssey of Entropy: Cryptography / K. Marton, A. Suciu // Entropy (MDPI). \u2013 2022. \u2013 Vol. 24, No. 2. \u2013 Art. 266.",
    // 30
    "Matsui, M. Linear Cryptanalysis Method for DES Cipher / M. Matsui // Advances in Cryptology \u2013 EUROCRYPT\u201993. \u2013 Springer, 1994. \u2013 P. 386\u2013397.",
    // 31
    "Shannon, C.E. Communication Theory of Secrecy Systems / C.E. Shannon // Bell System Technical Journal. \u2013 1949. \u2013 Vol. 28, No. 4. \u2013 P. 656\u2013715.",
    // 32
    "Sulak, F. Further analysis of the statistical independence of the NIST SP 800-22 randomness tests / F. Sulak et al. // Applied Mathematics and Computation. \u2013 2023. \u2013 Vol. 459.",
    // 33
    "Webster, A.F. On the Design of S-Boxes / A.F. Webster, S.E. Tavares // Advances in Cryptology \u2013 CRYPTO\u201985. \u2013 Springer, 1986. \u2013 P. 523\u2013534.",

    // --- Англоязычные стандарты ---
    // 34
    "FIPS 197. Advanced Encryption Standard (AES). \u2013 NIST, 2001 (updated 2023). \u2013 51 p.",
    // 35
    "NIST SP 800-22 Rev. 1a. A Statistical Test Suite for Random and Pseudorandom Number Generators for Cryptographic Applications. \u2013 NIST, 2010. \u2013 131 p.",

    // --- Электронные ресурсы ---
    // 36
    "Docker Documentation [Электронный ресурс]. \u2013 URL: https://docs.docker.com/ (дата обращения: 26.03.2026).",
    // 37
    "FastAPI Documentation [Электронный ресурс]. \u2013 URL: https://fastapi.tiangolo.com/ (дата обращения: 26.03.2026).",
    // 38
    "NumPy Documentation [Электронный ресурс]. \u2013 URL: https://numpy.org/doc/ (дата обращения: 26.03.2026).",
    // 39
    "PyCryptodome Documentation [Электронный ресурс]. \u2013 URL: https://pycryptodome.readthedocs.io/ (дата обращения: 26.03.2026).",
    // 40
    "React Documentation [Электронный ресурс]. \u2013 URL: https://react.dev/ (дата обращения: 26.03.2026).",
    // 41
    "Recharts Documentation [Электронный ресурс]. \u2013 URL: https://recharts.org/ (дата обращения: 26.03.2026).",
    // 42
    "SciPy Documentation [Электронный ресурс]. \u2013 URL: https://docs.scipy.org/ (дата обращения: 26.03.2026)."
  ];

  sources.forEach((src, i) => {
    children.push(normalParagraph(`${i + 1}. ${src}`, { noIndent: true }));
  });

  return children;
}

// ==================== DOCUMENT ASSEMBLY ====================

async function main() {
  figureCounter = 0;
  tableCounter = 0;
  bulletListCounter = 0;
  numberedListCounter = 0;

  const titlePage = generateTitlePage();
  const introduction = generateIntroduction();
  const chapter1 = generateChapter1();
  const chapter2 = generateChapter2();
  const chapter3 = generateChapter3();
  const chapter4 = generateChapter4();
  const conclusion = generateConclusion();
  const bibliography = generateBibliography();

  // Combine all content
  const allContent = [
    ...titlePage,
    new Paragraph({ children: [new PageBreak()] }),
    new TableOfContents("СОДЕРЖАНИЕ", { hyperlink: true, headingStyleRange: "1-3" }),
    new Paragraph({ children: [new PageBreak()] }),
    ...introduction,
    new Paragraph({ children: [new PageBreak()] }),
    ...chapter1,
    new Paragraph({ children: [new PageBreak()] }),
    ...chapter2,
    new Paragraph({ children: [new PageBreak()] }),
    ...chapter3,
    new Paragraph({ children: [new PageBreak()] }),
    ...chapter4,
    new Paragraph({ children: [new PageBreak()] }),
    ...conclusion,
    new Paragraph({ children: [new PageBreak()] }),
    ...bibliography,
  ];

  // Split content into sections based on landscape markers
  const defaultHeader = new Header({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ children: [PageNumber.CURRENT], font: "Times New Roman", size: FONT_SIZE })],
    })],
  });

  const portraitProps = {
    page: {
      size: { width: PAGE_WIDTH, height: PAGE_HEIGHT },
      margin: { top: MARGIN_TOP, bottom: MARGIN_BOTTOM, left: MARGIN_LEFT, right: MARGIN_RIGHT },
    },
  };

  const landscapeProps = {
    page: {
      size: { width: PAGE_WIDTH, height: PAGE_HEIGHT, orientation: PageOrientation.LANDSCAPE },
      margin: { top: MARGIN_TOP, bottom: MARGIN_BOTTOM, left: MARGIN_LEFT, right: MARGIN_RIGHT },
    },
  };

  const sections = [];
  let currentChildren = [];
  let isLandscape = false;

  for (const item of allContent) {
    if (isLandscapeMarker(item)) {
      if (item.__landscapeMarker === "start") {
        // End current portrait section if it has content
        if (currentChildren.length > 0) {
          sections.push({
            properties: { ...portraitProps, type: sections.length === 0 ? undefined : SectionType.CONTINUOUS },
            headers: { default: defaultHeader },
            children: currentChildren,
          });
          currentChildren = [];
        }
        isLandscape = true;
      } else if (item.__landscapeMarker === "end") {
        // End current landscape section
        if (currentChildren.length > 0) {
          sections.push({
            properties: { ...landscapeProps },
            headers: { default: defaultHeader },
            children: currentChildren,
          });
          currentChildren = [];
        }
        isLandscape = false;
      }
    } else {
      currentChildren.push(item);
    }
  }

  // Push remaining content
  if (currentChildren.length > 0) {
    sections.push({
      properties: isLandscape ? { ...landscapeProps } : { ...portraitProps },
      headers: { default: defaultHeader },
      children: currentChildren,
    });
  }

  // If no landscape markers were found (all content in one section), ensure first section has no type
  if (sections.length > 0 && sections[0].properties.type) {
    delete sections[0].properties.type;
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Times New Roman", size: FONT_SIZE },
          paragraph: {
            spacing: { after: 0, line: LINE_SPACING },
            indent: { firstLine: FIRST_LINE_INDENT },
          },
        },
      },
      paragraphStyles: [
        {
          id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: FONT_SIZE, bold: true, font: "Times New Roman" },
          paragraph: { spacing: { before: 0, after: 240 }, alignment: AlignmentType.CENTER, outlineLevel: 0 },
        },
        {
          id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: FONT_SIZE, bold: true, font: "Times New Roman" },
          paragraph: { spacing: { before: 240, after: 240 }, alignment: AlignmentType.CENTER, outlineLevel: 1 },
        },
        {
          id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: FONT_SIZE, italics: true, font: "Times New Roman" },
          paragraph: { spacing: { before: 240, after: 240 }, outlineLevel: 2 },
        },
      ],
    },
    numbering: {
      config: generateNumberingConfigs(),
    },
    sections: sections,
  });

  const buffer = await Packer.toBuffer(doc);

  // --- Версионность: сохранить предыдущую версию ---
  const outputFile = path.join(__dirname, "Диссертация.docx");
  if (fs.existsSync(outputFile)) {
    const versionsDir = path.join(__dirname, "versions");
    if (!fs.existsSync(versionsDir)) {
      fs.mkdirSync(versionsDir, { recursive: true });
    }
    const stat = fs.statSync(outputFile);
    const d = stat.mtime;
    const timestamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}_${String(d.getHours()).padStart(2, "0")}-${String(d.getMinutes()).padStart(2, "0")}-${String(d.getSeconds()).padStart(2, "0")}`;
    const versionFile = path.join(versionsDir, `Диссертация_${timestamp}.docx`);
    fs.copyFileSync(outputFile, versionFile);
    console.log("Previous version saved:", versionFile);
  }

  fs.writeFileSync(outputFile, buffer);
  console.log("Document generated:", outputFile);

  // --- Автозагрузка на Google Drive ---
  const RCLONE = "C:/Users/Ruslan/AppData/Local/Microsoft/WinGet/Packages/Rclone.Rclone_Microsoft.Winget.Source_8wekyb3d8bbwe/rclone-v1.73.2-windows-amd64/rclone.exe";
  const REMOTE = "gdrive";
  const DRIVE_FOLDER = "ВКР";
  const remotePath = `${REMOTE}:${DRIVE_FOLDER}/Диссертация — Курский Р.И.docx`;

  try {
    try {
      execSync(`"${RCLONE}" deletefile "${remotePath}" --drive-use-trash=false`, { stdio: "pipe" });
    } catch { /* файла может не быть */ }
    execSync(`"${RCLONE}" copyto "${outputFile}" "${remotePath}"`, { stdio: "inherit" });
    console.log("Uploaded to Google Drive:", remotePath);
  } catch (err) {
    console.error("Google Drive upload failed:", err.message);
  }
}

main().catch(console.error);
