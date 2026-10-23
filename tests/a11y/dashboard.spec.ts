import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  // No external requests, auth sessions or production data, even if a component
  // accidentally attempts one. Report unexpected calls rather than hiding them.
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin === 'http://127.0.0.1:4181' && !url.pathname.startsWith('/api/')) return route.continue();
    if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') return route.abort();
    throw new Error(`Unexpected fixture network request: ${url.origin}${url.pathname}`);
  });
});

async function scan(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();
  const failures = results.violations.map(v => ({
    rule: v.id, nodes: v.nodes.map(n => ({ target: n.target, reason: n.failureSummary })),
  }));
  expect(failures, JSON.stringify(failures, null, 2)).toEqual([]);
}

for (const theme of ['light', 'dark']) {
  test(`${theme} semantic color pairs`, async ({ page }) => {
    await page.addInitScript(theme => localStorage.setItem('blueprint-theme', theme), theme);
    await page.goto('/tests/a11y/');
    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
    await page.evaluate(() => {
      const region = document.createElement('section');
      region.setAttribute('aria-label', 'Semantic color pairs');
      const pairs = [
        ['background', 'foreground'], ['card', 'card-foreground'],
        ['popover', 'popover-foreground'], ['primary', 'primary-foreground'],
        ['secondary', 'secondary-foreground'], ['muted', 'muted-foreground'],
        ['accent', 'accent-foreground'], ['destructive', 'destructive-foreground'],
        ['panel', 'panel-foreground'], ['navigation', 'navigation-foreground'],
        ['status-active', 'status-active-foreground'], ['status-draft', 'status-draft-foreground'],
      ];
      for (const [background, foreground] of pairs) {
        const swatch = document.createElement('p');
        swatch.style.cssText = `background:var(--${background});color:var(--${foreground});padding:16px;font-size:16px;font-weight:400;`;
        swatch.textContent = `${background} and ${foreground}`;
        region.append(swatch);
      }
      document.querySelector('main')!.prepend(region);
    });
    await scan(page);
  });

  for (const empty of [false, true]) {
    test(`${theme} dashboard: ${empty ? 'empty' : 'populated'} data`, async ({ page }, testInfo) => {
      await page.addInitScript(theme => localStorage.setItem('blueprint-theme', theme), theme);
      await page.goto(`/tests/a11y/${empty ? '?empty=1' : ''}`);
      await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
      await expect(page.locator('html')).toHaveClass(theme === 'dark' ? 'dark' : '');
      await expect(page.locator('.bp-stat-value').first()).toContainText(empty ? '$0' : '$98,370');
      await page.getByText('View pipeline growth data', { exact: true }).click();
      await expect(page.getByRole('table')).toBeVisible();
      await expect(page.getByRole('row')).toHaveCount(7);
      await scan(page);
      await page.getByRole('heading', { name: 'Dashboard', exact: true }).scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const screenshot = testInfo.outputPath('dashboard.png');
      await page.screenshot({ path: screenshot, fullPage: true });
      await testInfo.attach('dashboard', { path: screenshot, contentType: 'image/png' });
    });
  }

  test(`${theme} keyboard navigation and appearance`, async ({ page }) => {
    await page.addInitScript(theme => localStorage.setItem('blueprint-theme', theme), theme);
    await page.goto('/tests/a11y/');
    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.getByText('View pipeline growth data', { exact: true })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('table')).toBeVisible();
    for (const name of ['Home', 'Plans', 'Settings']) {
      await page.keyboard.press('Tab');
      const button = page.getByRole('button', { name, exact: true });
      await expect(button).toBeFocused();
      expect(await button.evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe('none');
    }
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
    await scan(page);
    await page.getByRole('button', { name: 'Appearance', exact: true }).click();
    await scan(page);
    await page.getByRole('button', { name: `Switch to ${theme === 'light' ? 'dark' : 'light'} mode` }).click();
    await expect(page.locator('html')).toHaveClass(theme === 'light' ? 'dark' : '');
    await scan(page);
  });

  test(`${theme} plan cards`, async ({ page }) => {
    await page.addInitScript(theme => localStorage.setItem('blueprint-theme', theme), theme);
    await page.goto('/tests/a11y/');
    await page.getByRole('button', { name: 'Plans', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Plans', exact: true })).toBeVisible();
    await scan(page);
  });
}

test('guard detects the pale metric text regression', async ({ page }) => {
  await page.goto('/tests/a11y/');
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
  await page.addStyleTag({ content: '.bg-card .bp-stat-value { color: #eaf4f6 !important; }' });
  const results = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
  expect(results.violations.some(v => v.nodes.some(n => n.html.includes('bp-stat-value')))).toBe(true);
});

test('dashboard remains readable with doubled text size', async ({ page }) => {
  await page.goto('/tests/a11y/');
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
  await page.evaluate(() => document.documentElement.style.fontSize = '200%');
  await scan(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
