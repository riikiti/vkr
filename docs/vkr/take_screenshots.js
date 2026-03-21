const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const URL = "http://91.229.8.171";
const SCREENSHOTS_DIR = path.join(__dirname, "screenshots");

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-web-security",
      "--disable-extensions",
      "--disable-default-apps",
      "--disable-client-side-phishing-detection",
      "--no-first-run",
    ],
    defaultViewport: { width: 1920, height: 1080 },
  });

  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
  await page.setBypassCSP(true);

  try {
    console.log("Loading main page...");
    await page.goto(URL, { waitUntil: "load", timeout: 60000 });
    await delay(5000);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "01_main_interface.png"), fullPage: false });
    console.log("Screenshot 1: Main interface");

    const clickTab = async (tabName, filename) => {
      try {
        const clicked = await page.evaluate((name) => {
          const elements = document.querySelectorAll("button, a, div, span, nav *, [role='tab']");
          for (const el of elements) {
            const text = el.textContent?.trim();
            const rect = el.getBoundingClientRect();
            if (text && rect.width > 0 && rect.height > 0 && text === name) {
              el.click();
              return text;
            }
          }
          // Fallback: partial match
          for (const el of elements) {
            const text = el.textContent?.trim();
            const rect = el.getBoundingClientRect();
            if (text && rect.width > 0 && rect.height > 0 && text.includes(name)) {
              el.click();
              return text;
            }
          }
          return null;
        }, tabName);

        if (clicked) {
          await delay(3000);
          await page.screenshot({ path: path.join(SCREENSHOTS_DIR, filename), fullPage: false });
          console.log(`Screenshot: ${filename} (clicked: "${clicked}")`);
          return true;
        }
        console.log(`  Tab "${tabName}" not found`);
        return false;
      } catch (e) {
        console.log(`  Error clicking ${tabName}: ${e.message}`);
        return false;
      }
    };

    // Click "Быстрый тест" preset
    console.log("Clicking 'Быстрый тест' preset...");
    const presetClicked = await page.evaluate(() => {
      const elements = document.querySelectorAll("div, button, span");
      for (const el of elements) {
        const text = el.textContent?.trim();
        if (text && text.includes("Быстрый тест") && !text.includes("Полный")) {
          el.click();
          return text;
        }
      }
      return null;
    });
    console.log(`Preset: ${presetClicked || "not found"}`);
    await delay(1000);

    // Click "Запустить эксперимент"
    const runClicked = await page.evaluate(() => {
      const buttons = document.querySelectorAll("button");
      for (const btn of buttons) {
        const text = btn.textContent?.trim();
        if (text && text.includes("Запустить")) {
          btn.click();
          return text;
        }
      }
      return null;
    });
    console.log(`Run button: ${runClicked || "not found"}`);

    // Wait for experiment to complete - poll until loading spinner disappears
    console.log("Waiting for experiment to complete...");
    for (let i = 0; i < 60; i++) {
      await delay(5000);
      const isLoading = await page.evaluate(() => {
        const text = document.body.innerText;
        return text.includes("Выполнение") || text.includes("Выполняется");
      });
      if (!isLoading) {
        console.log(`Experiment completed after ~${(i + 1) * 5} seconds`);
        break;
      }
      if (i % 6 === 0) console.log(`  Still running... (${(i + 1) * 5}s)`);
    }
    await delay(3000);

    // Screenshot overview tab with results
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "02_overview_results.png"), fullPage: false });
    console.log("Screenshot 2: Overview with results");

    // Navigate tabs with Russian names
    await clickTab("Энтропия", "03_entropy.png");
    await clickTab("Лавинный эффект", "04_avalanche.png");
    await clickTab("Распределение", "05_distribution.png");
    await clickTab("Сравнение", "06_comparison.png");
    await clickTab("Путь шифрования", "07_trace.png");
    await clickTab("Отчёт", "08_report.png");

    console.log("\nDone! Screenshots saved to:", SCREENSHOTS_DIR);
  } catch (err) {
    console.error("Error:", err.message);
    try {
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "error.png"), fullPage: false });
      console.log("Error screenshot saved");
    } catch (e) {}
  }

  await browser.close();
}

main().catch(console.error);
