/**
 * Загрузка диссертации и статей на Google Drive через rclone.
 *
 * Первоначальная настройка (один раз):
 *   rclone config
 *   → New remote → name: gdrive → Storage: drive → оставить всё по умолчанию
 *   → авторизоваться в браузере → Done
 *
 * Использование:
 *   node upload_to_drive.js              # загрузить все
 *   node upload_to_drive.js dissertation # только диссертацию
 *   node upload_to_drive.js article1     # только статью 1
 *   node upload_to_drive.js article2     # только статью 2
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Путь к rclone
const RCLONE = "C:/Users/Ruslan/AppData/Local/Microsoft/WinGet/Packages/Rclone.Rclone_Microsoft.Winget.Source_8wekyb3d8bbwe/rclone-v1.73.2-windows-amd64/rclone.exe";

// Имя remote (настраивается через rclone config)
const REMOTE = "gdrive";

// Папка на Google Drive
const DRIVE_FOLDER = "ВКР";

// Файлы для загрузки
const FILES = {
  dissertation: {
    local: path.join(__dirname, "Диссертация.docx"),
    remote: `${REMOTE}:${DRIVE_FOLDER}/Диссертация — Курский Р.И.docx`,
    label: "Диссертация",
  },
  article1: {
    local: path.join(__dirname, "..", "scientific_article", "article_1", "Курский_статья_1_СТНО.docx"),
    remote: `${REMOTE}:${DRIVE_FOLDER}/Статья 1 — Энтропийный анализ — Курский Р.И.docx`,
    label: "Статья 1 (СТНО)",
  },
  article2: {
    local: path.join(__dirname, "..", "scientific_article", "article_2", "Курский_статья_2_AMPU.docx"),
    remote: `${REMOTE}:${DRIVE_FOLDER}/Статья 2 — Криптостойкость шифров — Курский Р.И.docx`,
    label: "Статья 2 (AMPU)",
  },
};

function checkRclone() {
  try {
    execSync(`"${RCLONE}" listremotes`, { stdio: "pipe" });
  } catch {
    console.error("Ошибка: rclone не настроен.");
    console.error("Запусти: rclone config");
    console.error("Создай remote с именем 'gdrive' для Google Drive.");
    process.exit(1);
  }

  const remotes = execSync(`"${RCLONE}" listremotes`, { encoding: "utf-8" });
  if (!remotes.includes(`${REMOTE}:`)) {
    console.error(`Ошибка: remote '${REMOTE}' не найден.`);
    console.error(`Доступные remotes: ${remotes.trim()}`);
    console.error(`Запусти: rclone config и создай remote '${REMOTE}'`);
    process.exit(1);
  }
}

function upload(fileConfig) {
  const { local, remote, label } = fileConfig;

  if (!fs.existsSync(local)) {
    console.log(`  Пропуск: файл не найден — ${local}`);
    return;
  }

  console.log(`  Загрузка: ${label}...`);
  try {
    // Удаляем старый файл (без корзины) чтобы rclone не пропустил загрузку
    try {
      execSync(`"${RCLONE}" deletefile "${remote}" --drive-use-trash=false`, { stdio: "pipe" });
      console.log(`  Удалён старый файл`);
    } catch { /* файла может не быть */ }

    // Загружаем .docx в папку на Google Drive
    execSync(`"${RCLONE}" copyto "${local}" "${remote}"`, {
      stdio: "inherit",
    });
    console.log(`  Готово: ${label}`);
  } catch (err) {
    console.error(`  Ошибка загрузки ${label}:`, err.message);
  }
}

function shareFolder() {
  console.log("\nУстановка публичного доступа...");
  try {
    // Создаём папку если не существует
    execSync(`"${RCLONE}" mkdir "${REMOTE}:${DRIVE_FOLDER}"`, { stdio: "pipe" });

    // Получаем ссылку на папку
    const output = execSync(`"${RCLONE}" link "${REMOTE}:${DRIVE_FOLDER}"`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    console.log(`Ссылка на папку: ${output.trim()}`);
  } catch {
    console.log("  (Установи доступ вручную через Google Drive: ПКМ на папке ВКР → Поделиться → Все у кого есть ссылка)");
  }
}

function main() {
  const args = process.argv.slice(2);
  const targets = args.length > 0
    ? args.filter(a => FILES[a])
    : Object.keys(FILES);

  if (args.length > 0 && targets.length === 0) {
    console.log("Использование: node upload_to_drive.js [dissertation|article1|article2]");
    process.exit(1);
  }

  console.log("\n=== Загрузка на Google Drive ===\n");
  checkRclone();

  for (const target of targets) {
    console.log(`[${target}]`);
    upload(FILES[target]);
    console.log();
  }

  shareFolder();
  console.log("\nГотово!");
}

main();
