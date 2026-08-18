import { test, expect } from '@playwright/test';

test('Dashboard loads without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));

  await page.goto('/dashboard', { waitUntil: 'networkidle' });

  // Wait for dashboard to render
  await expect(page.locator('text=Resumo')).toBeVisible({ timeout: 10000 });

  // Check sections exist
  await expect(page.locator('#resumo')).toBeVisible();
  await expect(page.locator('#saude')).toBeVisible();
  await expect(page.locator('#analise')).toBeVisible();
  await expect(page.locator('#evolucao')).toBeVisible();
  await expect(page.locator('#ativos')).toBeVisible();

  console.log('Console errors:', errors);
  expect(errors.filter(e => !e.includes('favicon') && !e.includes('manifest'))).toHaveLength(0);
});

test('Dashboard responsive - mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/dashboard', { waitUntil: 'networkidle' });

  await expect(page.locator('text=Resumo')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('#resumo')).toBeVisible();

  // Navigation pills should be scrollable on mobile
  const nav = page.locator('nav[aria-label="Seções desta página"]');
  await expect(nav).toBeVisible();
});

test('Dashboard filters work', async ({ page }) => {
  await page.goto('/dashboard', { waitUntil: 'networkidle' });
  await expect(page.locator('text=Resumo')).toBeVisible({ timeout: 10000 });

  // Test periodo select - using the actual Select component from Radix UI
  const periodoButton = page.locator('button[aria-label="Período do gráfico de evolução"]').first();
  await expect(periodoButton).toBeVisible();
  await periodoButton.click();

  // Click on "2 Anos" option
  const option24 = page.locator('div[role="option"]:has-text("2 Anos")');
  await expect(option24).toBeVisible();
  await option24.click();

  await page.waitForTimeout(500);

  // Test tipo evolucao select
  const tipoButton = page.locator('button[aria-label="Tipo de ativo na evolução"]').first();
  await expect(tipoButton).toBeVisible();
});
