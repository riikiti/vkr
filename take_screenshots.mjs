import { chromium } from 'playwright';

const BASE = 'http://91.229.8.171';
const OUT = 'C:/Users/Ruslan/Проекты/вкр/docs/vkr/screenshots';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Screenshot 1: Initial view
  console.log('1. Initial view...');
  await page.screenshot({ path: `${OUT}/01_initial_view.png` });

  // Use "DES vs AES" - good for screenshots (2 popular algorithms to compare)
  console.log('Clicking "DES vs AES"...');
  const testCase = page.locator('button:has-text("DES vs AES")');
  await testCase.first().click();
  await page.waitForTimeout(1000);

  // Screenshot 2: Sidebar configured
  console.log('2. Sidebar configured...');
  await page.screenshot({ path: `${OUT}/02_sidebar_configured.png` });

  // Wait for experiment - the test case auto-starts
  console.log('Waiting for experiment...');
  // Wait for the "Запустить эксперимент" button to reappear (means experiment done)
  try {
    // First wait for loading state
    await page.waitForSelector('text=Выполняется', { timeout: 10000 }).catch(() => {});
    // Then wait for it to disappear
    await page.waitForSelector('text=Запустить эксперимент', { timeout: 120000 });
    console.log('Experiment completed!');
  } catch (e) {
    console.log('Waiting alternative...');
    await page.waitForTimeout(30000);
  }
  await page.waitForTimeout(2000);

  // Check if there's an error
  const errorEl = page.locator('text=timeout');
  if (await errorEl.count() > 0) {
    console.log('ERROR: timeout detected, trying smaller test...');
    // Reload and try "Быстрый тест"
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    const quickBtn = page.locator('button:has-text("Быстрый тест")');
    await quickBtn.first().click();
    await page.waitForTimeout(1000);
    try {
      await page.waitForSelector('text=Выполняется', { timeout: 10000 }).catch(() => {});
      await page.waitForSelector('text=Запустить эксперимент', { timeout: 120000 });
    } catch {
      await page.waitForTimeout(60000);
    }
    await page.waitForTimeout(2000);
  }

  // Now take screenshots of all tabs
  console.log('3. Overview tab...');
  // Make sure we're on Overview
  const overviewBtn = page.locator('button').filter({ hasText: 'Обзор' });
  if (await overviewBtn.count() > 0) await overviewBtn.first().click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/03_overview.png` });
  await page.screenshot({ path: `${OUT}/03_overview_full.png`, fullPage: true });

  const tabs = [
    { label: 'Энтропия', name: '04_entropy' },
    { label: 'Лавинный эффект', name: '05_avalanche' },
    { label: 'Распределение', name: '06_distribution' },
    { label: 'Сравнение', name: '07_comparison' },
    { label: 'Путь шифрования', name: '09_trace' },
    { label: 'Отчёт', name: '08_report' },
  ];

  for (const tab of tabs) {
    console.log(`${tab.name} (${tab.label})...`);
    const tabBtn = page.locator('button').filter({ hasText: tab.label });
    if (await tabBtn.count() > 0) {
      await tabBtn.first().click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: `${OUT}/${tab.name}.png` });
      await page.screenshot({ path: `${OUT}/${tab.name}_full.png`, fullPage: true });
    } else {
      console.log(`  Tab "${tab.label}" not found!`);
    }
  }

  console.log('Done!');
  await browser.close();
})();
