import { test, expect } from '@playwright/test';

test('Homepage loads without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));

  await page.goto('/', { waitUntil: 'networkidle' });

  // Check page loads
  await expect(page.locator('body')).toBeVisible({ timeout: 10000 });

  console.log('Console errors:', errors.filter(e => !e.includes('favicon') && !e.includes('manifest')));
  expect(errors.filter(e => !e.includes('favicon') && !e.includes('manifest') && !e.includes('hydration'))).toHaveLength(0);
});

test('Homepage responsive - mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
});

test('Auth page accessible', async ({ page }) => {
  await page.goto('/auth', { waitUntil: 'networkidle' });
  await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
  // Should show login form
  await expect(page.locator('input[type="email"], input[type="password"], button').first()).toBeVisible({ timeout: 10000 });
});
