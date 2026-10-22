/* Requires Playwright and a Chromium executable. Uses an isolated browser profile.
 * Run with NODE_PATH pointing to Playwright packages, and optionally BROWSER_PATH. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const server = http.createServer((request, response) => {
  let file;
  try { file = path.resolve(root, '.' + decodeURIComponent(new URL(request.url, 'http://localhost').pathname)); }
  catch { response.writeHead(400).end(); return; }
  if (!file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { response.writeHead(404).end(); return; }
    response.setHeader('Content-Type', ({ '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript' })[path.extname(file)] || 'application/octet-stream');
    response.end(data);
  });
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul', reducedMotion: 'reduce' });
  // Exercise unchanged pages without relying on CDN availability.
  await context.route('https://code.jquery.com/jquery-3.7.1.min.js', route => route.fulfill({ path: path.join(root, 'assets/js/jquery-3.7.1.min.js'), contentType: 'text/javascript' }));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const count = () => page.locator('.food-meal-item').count();
  const waitCount = n => page.waitForFunction(n => document.querySelectorAll('.food-meal-item').length === n, n);
  try {
    await page.goto(base + '/index.html');
    await page.locator('.home-calculator-card a[href^="food-calorie"]').click();
    await page.waitForSelector('#food-search-results [role="option"]');
    assert.equal(await page.locator('.dropdown-link.is-active').textContent(), '🍱 음식 칼로리 계산기');
    assert.equal(await page.locator('#food-search-results [role="option"]').count(), 12);
    await page.locator('#food-form [type="submit"]').click();
    assert.match(await page.locator('#food-selection-error').textContent(), /선택/);
    await page.locator('#food-search').fill('바 나 나');
    await page.waitForFunction(() => document.querySelectorAll('#food-search-results [role="option"]').length === 1);
    await page.locator('#food-search').press('ArrowDown');
    await page.locator('#food-search').press('Enter');
    await page.locator('#food-grams').fill('150');
    await page.locator('#food-grams').press('Enter');
    assert.match(await page.locator('#food-result-data').textContent(), /약 134/);
    assert.match(await page.locator('#food-nutrient-bars').textContent(), /34.3/);
    await page.locator('#food-grams').fill('1200');
    assert.equal(await page.locator('#food-grams').inputValue(), '1200');
    assert.equal(await page.locator('#food-slider').inputValue(), '1000');
    await page.locator('#food-grams').fill('0');
    assert.equal(await page.locator('#food-result').isVisible(), false);
    assert.match(await page.locator('#food-amount-error').textContent(), /5000/);
    await page.locator('#food-grams').fill('150');
    await page.locator('#food-form [type="submit"]').click();
    await page.locator('#food-add').dblclick();
    await waitCount(1);
    await page.waitForFunction(() => !document.querySelector('#food-add').disabled);
    await page.locator('#food-add').click();
    await waitCount(2);
    assert.match(await page.locator('#food-daily-kcal').textContent(), /267/);
    await page.locator('[data-edit]').first().click();
    await page.locator('#food-edit-grams').fill('300');
    assert.match(await page.locator('#food-edit-preview').textContent(), /267/);
    await page.locator('#food-edit-form [type="submit"]').click();
    assert.match(await page.locator('#food-daily-kcal').textContent(), /401/);
    await page.locator('[data-delete]').last().click();
    await waitCount(1);
    assert.match(await page.locator('#food-daily-kcal').textContent(), /267/);
    const today = await page.locator('#food-date').inputValue();
    await page.reload();
    await waitCount(1);
    await page.locator('#food-prev').click();
    await waitCount(0);
    const previous = await page.locator('#food-date').inputValue();
    await page.locator('#food-custom-toggle').click();
    await page.locator('#custom-name').fill('<img src=x onerror=alert(1)> 사용자 음식');
    await page.locator('#custom-kcal').fill('1500');
    await page.locator('#food-custom-form [type="submit"]').click();
    assert.match(await page.locator('#food-nutrient-bars').textContent(), /정보 없음/);
    await page.locator('#food-add').click();
    await waitCount(1);
    assert.equal(await page.locator('.food-meal-item img').count(), 0);
    assert.match(await page.locator('#food-progress-text').textContent(), /75.0%/);
    assert.match(await page.locator('#food-daily-macros').textContent(), /정보 없음/);
    assert.match(await page.locator('#food-missing-note').textContent(), /부분 분석/);
    await page.locator('#food-goal').fill('1000');
    assert.match(await page.locator('#food-progress-text').textContent(), /150.0%/);
    assert.equal(await page.locator('#food-progress').getAttribute('value'), '100');
    await page.locator('#food-goal').fill('0');
    assert.match(await page.locator('#food-goal-error').textContent(), /유효한/);
    await page.locator('#food-goal').fill('2000');
    await page.locator('#food-reset').click();
    assert.equal(await count(), 1);
    await page.locator('#food-search').fill('존재하지않는음식');
    await page.waitForSelector('.food-no-results');
    await page.locator('#food-search').fill('밥');
    await page.waitForFunction(() => document.querySelectorAll('#food-search-results [role="option"]').length === 2);
    await page.locator('[data-category="과일"]').click();
    assert.equal(await page.locator('#food-search-results [role="option"]').count(), 0);
    await page.locator('#food-faq-button-0').click();
    assert.equal(await page.locator('#food-faq-button-0').getAttribute('aria-expanded'), 'true');
    await page.locator('#food-faq-button-0').press('Enter');
    assert.equal(await page.locator('#food-faq-answer-0').isVisible(), false);
    await page.locator('#food-today').click();
    assert.equal(await page.locator('#food-date').inputValue(), today);
    assert.match(await page.locator('#food-daily-kcal').textContent(), /267/);
    await page.locator('#food-clear').click();
    await page.locator('#food-clear-cancel').click();
    assert.equal(await count(), 1);
    await page.locator('#food-clear').click();
    await page.locator('#food-clear-confirm').click();
    await waitCount(0);
    await page.locator('#food-date').fill(previous);
    assert.match(await page.locator('#food-daily-kcal').textContent(), /1,500/);
    await page.reload(); await waitCount(0); // reload defaults to today's separate record
    await page.locator('#food-date').fill(previous); await waitCount(1);
    console.log('PASS: search, keyboard, calculation, duplicate-click protection, CRUD, missing data, dates, reload, goals, reset, FAQ, safe text rendering.');

    // Storage errors and midnight rollover are tested with an isolated browser clock.
    await page.evaluate(() => { localStorage.setItem('fitcalc-food-log-v1:2020-01-01', '{broken'); });
    await page.locator('#food-date').fill('2020-01-01');
    assert.match(await page.locator('#food-storage-status').textContent(), /읽을 수 없습니다/);
    await page.locator('#food-goal').fill('1900');
    assert.equal(await page.evaluate(() => localStorage.getItem('fitcalc-food-log-v1:2020-01-01')), '{broken');
    await page.locator('#food-today').click();
    await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('quota'); }; });
    await page.locator('#food-goal').fill('2100');
    assert.match(await page.locator('#food-storage-status').textContent(), /저장에 실패/);
    await page.reload();
    await page.clock.install({ time: new Date('2026-10-08T23:59:50+09:00') });
    await page.reload();
    assert.equal(await page.locator('#food-date').inputValue(), '2026-10-08');
    await page.clock.fastForward(31000);
    assert.equal(await page.locator('#food-date').inputValue(), '2026-10-09');
    assert.equal(await count(), 0);
    console.log('PASS: corrupt storage protection, failed saves, local midnight rollover.');

    for (const width of [1440, 1100, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(base + '/food-calorie.html');
      await page.waitForSelector('.header');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'overflow at ' + width);
      if (width < 768) await page.locator('.nav-toggle').click();
      await page.locator('.nav-dropdown-toggle').click();
      assert.equal(await page.locator('.dropdown-link').count(), 9);
      await page.locator('.dropdown-link[data-nav-key="food"]').click();
      await page.locator('#food-search').fill('바나나');
      await page.waitForFunction(() => document.querySelectorAll('#food-search-results [role="option"]').length === 1);
      await page.locator('#food-search-results [role="option"]').click();
      await page.locator('#food-quick [data-grams="150"]').click();
      await page.locator('#food-form [type="submit"]').click();
      assert.match(await page.locator('#food-result-data').textContent(), /134/);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'result overflow at ' + width);
      if ([1440,390].includes(width)) await page.screenshot({ path: path.join(process.env.TEMP || root, 'fitcalc-food-' + width + '.png'), fullPage: true });
      await page.goto(base + '/index.html');
      const columns = await page.locator('.home-calculator-grid').evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length);
      assert.equal(columns, width >= 1200 ? 3 : width >= 768 ? 2 : 1);
    }
    console.log('PASS: 1440/1100/768/390/320px layouts, mobile menus, mobile calculation and HOME grids.');
    await page.setViewportSize({ width: 1440, height: 1000 });
    for (const filename of ['bmi.html','bmr.html','calorie.html','weight-goal.html','exercise.html','macros.html','body-fat.html','water.html']) {
      await page.goto(base + '/' + filename);
      await page.waitForSelector('.header');
      const gender = page.locator('button[data-gender="male"], button[data-sex="male"]');
      if (await gender.count()) await gender.first().click();
      const button = page.locator('button.primary-btn').first();
      await button.click();
      const issues = await page.locator('[aria-invalid="true"]:visible').count();
      assert.equal(issues, 0, filename + ' default input validation');
      const resultSelectors = { 'bmi.html': '#bmiValue', 'bmr.html': '#resultBmr', 'calorie.html': '#calMaintenanceValue', 'weight-goal.html': '#estimatedWeeks', 'exercise.html': '#grossCalories', 'macros.html': '#carbGrams', 'body-fat.html': '#bodyFatPercentage', 'water.html': '#waterMl' };
      await page.locator(resultSelectors[filename]).waitFor({ state: 'visible' });
      const value = await page.locator(resultSelectors[filename]).textContent();
      assert.match(value, /\d/, filename + ' numeric result');
      console.log('REGRESSION PASS:', filename, value.trim());
      assert.equal(await page.locator('.dropdown-link[data-nav-key="food"]').getAttribute('href'), 'food-calorie.html#home');
    }
    assert.deepEqual(errors, []);
    console.log('PASS: no uncaught browser errors; existing calculator navigation preserved.');
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
