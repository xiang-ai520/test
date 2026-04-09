import { test, expect } from '@playwright/test';

test('capture gameplay state', async ({ page }) => {
  await page.goto('http://127.0.0.1:8080/index.html');
  await page.click('#primaryButton');
  await page.waitForTimeout(2000);

  const before = await page.evaluate(() => window.__app?.getDebugState?.());
  await page.keyboard.press('Space');
  await page.waitForTimeout(700);
  const after = await page.evaluate(() => window.__app?.getDebugState?.());

  console.log('DEBUG_BEFORE', JSON.stringify(before));
  console.log('DEBUG_AFTER', JSON.stringify(after));

  await page.screenshot({ path: 'output/playwright/ground-check.png', fullPage: true });
  expect(after).toBeTruthy();
});
