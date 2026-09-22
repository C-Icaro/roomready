import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import path from 'node:path';

const evidence = process.env.EVIDENCE_DIR || 'test-results/evidence';
const taskRow = (page: Page, title: string) => page.locator('.task-row').filter({ has: page.getByText(title, { exact: true }) });
const plannedSpend = (page: Page) => page.locator('.plan-stats .stat').filter({ hasText: 'PLANNED SPEND' }).locator('strong');
const dollars = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);

async function openPlan(page: Page) {
  await page.getByRole('button', { name: 'Move plan', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your move, made manageable.' })).toBeVisible();
}

async function addTask(page: Page, title: string, cost = 0) {
  await page.getByRole('button', { name: 'Add a task', exact: true }).click();
  await page.getByLabel('What needs doing?').fill(title);
  await page.getByLabel('Estimated cost ($)', { exact: true }).fill(String(cost));
  // Keeping the default priority catches frontend/backend enum mismatches.
  await page.getByRole('button', { name: 'Add to plan', exact: true }).click();
  await expect(taskRow(page, title)).toBeVisible();
}

async function savedToken(page: Page) {
  const token = await page.evaluate(() => localStorage.getItem('roomready-home'));
  expect(token).toMatch(/^[0-9a-f-]{36}$/i);
  return token!;
}

test('scroll camera, task editing, budget and completion persist and sync between independent sessions', async ({ page, browser }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'A fresh start. Coming together.' })).toBeVisible();
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-ready', 'true');
  await page.screenshot({ path: path.join(evidence, 'desktop-home.png'), fullPage: false });
  const before = await canvas.getAttribute('data-camera');
  await page.mouse.wheel(0, 550);
  await expect.poll(() => canvas.getAttribute('data-camera')).not.toBe(before);
  await page.screenshot({ path: path.join(evidence, 'desktop-scroll.png'), fullPage: false });

  await openPlan(page);
  const baseline = Number((await plannedSpend(page).innerText()).replace(/[^\d.-]/g, ''));
  const originalTitle = 'E2E: collect the spare keys';
  const editedTitle = 'E2E: spare keys and entry handoff';
  await addTask(page, originalTitle, 32);
  await expect(plannedSpend(page)).toHaveText(dollars(baseline + 32));

  const token = await savedToken(page);
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  try {
    const second = await context.newPage();
    second.on('pageerror', error => errors.push(error.message));
    await second.goto(`/#home=${token}`);
    await openPlan(second);
    await expect(taskRow(second, originalTitle)).toBeVisible();

    await page.getByRole('button', { name: `Edit ${originalTitle}`, exact: true }).click();
    await page.getByLabel('Task', { exact: true }).fill(editedTitle);
    await page.getByLabel('Estimated cost ($)', { exact: true }).fill('125');
    await page.getByLabel('Who’s on it?', { exact: true }).fill('Casey');
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(taskRow(page, originalTitle)).toHaveCount(0);
    await expect(taskRow(second, editedTitle).locator('.assignee')).toContainText('Casey');
    await expect(taskRow(second, editedTitle).getByRole('button', { name: `Edit ${editedTitle}`, exact: true })).toContainText('$125');
    await expect(plannedSpend(page)).toHaveText(dollars(baseline + 125));
    await expect(plannedSpend(second)).toHaveText(dollars(baseline + 125));

    // Convex drives this controlled checkbox asynchronously. A click followed by
    // subscribed-state assertions checks persistence, unlike check()'s immediate DOM test.
    await taskRow(page, editedTitle).getByRole('checkbox').click();
    await expect(taskRow(page, editedTitle).getByRole('checkbox')).toBeChecked();
    await expect(taskRow(second, editedTitle).getByRole('checkbox')).toBeChecked();

    await page.reload();
    await openPlan(page);
    await expect(taskRow(page, editedTitle).getByRole('checkbox')).toBeChecked();
    await expect(taskRow(page, editedTitle).locator('.assignee')).toContainText('Casey');
    await expect(plannedSpend(page)).toHaveText(dollars(baseline + 125));
    await page.screenshot({ path: path.join(evidence, 'desktop-plan.png'), fullPage: false });
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});

test('switching shared links in the same tab changes the active home and preserves isolation after reload', async ({ page }) => {
  await page.goto('/');
  await openPlan(page);
  await addTask(page, 'E2E: belongs only to home A', 13);
  const tokenA = await savedToken(page);

  await page.getByRole('button', { name: 'Home settings', exact: true }).click();
  await page.getByRole('button', { name: 'Create a separate, empty home', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'A fresh start. Coming together.' })).toBeVisible();
  const tokenB = await savedToken(page);
  expect(tokenB).not.toBe(tokenA);
  await openPlan(page);
  await expect(taskRow(page, 'E2E: belongs only to home A')).toHaveCount(0);
  await addTask(page, 'E2E: belongs only to home B', 24);
  await expect(plannedSpend(page)).toHaveText('$24');

  // Fragment navigation does not reload React; this exercises the hashchange path.
  await page.evaluate(token => { location.hash = `home=${token}`; }, tokenA);
  await expect(taskRow(page, 'E2E: belongs only to home A')).toBeVisible();
  await expect(taskRow(page, 'E2E: belongs only to home B')).toHaveCount(0);
  expect(await savedToken(page)).toBe(tokenA);
  await addTask(page, 'E2E: added after switching back to A', 9);

  await page.evaluate(token => { location.hash = `home=${token}`; }, tokenB);
  await expect(taskRow(page, 'E2E: belongs only to home B')).toBeVisible();
  await expect(taskRow(page, 'E2E: added after switching back to A')).toHaveCount(0);
  await expect(plannedSpend(page)).toHaveText('$24');
  await page.reload();
  await openPlan(page);
  expect(await savedToken(page)).toBe(tokenB);
  await expect(taskRow(page, 'E2E: belongs only to home B')).toBeVisible();
  await expect(taskRow(page, 'E2E: belongs only to home A')).toHaveCount(0);
  await expect(plannedSpend(page)).toHaveText('$24');
});

test('an invalid shared link recovers a stable home instead of creating a new one on every reload', async ({ page }) => {
  await page.goto('/#home=invalid-link');
  await openPlan(page);
  const token = await savedToken(page);
  await addTask(page, 'E2E: survives invalid-link recovery', 7);
  await page.reload();
  await openPlan(page);
  expect(await savedToken(page)).toBe(token);
  await expect(taskRow(page, 'E2E: survives invalid-link recovery')).toBeVisible();
});

test('the focused room controls the next task and completing it updates the room plan', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true');
  await page.locator('.rail').getByRole('button', { name: 'Kitchen', exact: true }).click();
  const next = page.locator('.next-card');
  await expect(next.getByRole('heading')).toHaveText('Label boxes by cabinet');
  await expect(next.locator('.next-meta')).toContainText('Kitchen');
  await next.getByRole('button', { name: 'Mark as done', exact: true }).click();
  await expect(next.getByRole('heading')).toHaveText('Clean appliances before moving in');
  await next.getByRole('button', { name: 'See your move plan', exact: true }).click();
  await expect(page.locator('.task-row')).toHaveCount(2);
  await expect(taskRow(page, 'Label boxes by cabinet').getByRole('checkbox')).toBeChecked();
  await expect(taskRow(page, 'Clean appliances before moving in').getByRole('checkbox')).not.toBeChecked();
  await expect(taskRow(page, 'Choose a sofa that fits the room')).toHaveCount(0);
});

test('mobile plan fallback and draft-only email remain usable and honestly labeled', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true');
  await page.screenshot({ path: path.join(evidence, 'mobile-home.png'), fullPage: false });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Plan', exact: true }).click();
  const floorplan = page.locator('.floorplan');
  await expect(floorplan).toBeVisible();
  await expect(floorplan.getByRole('button')).toHaveCount(4);
  await floorplan.getByRole('button', { name: /Kitchen/ }).click();
  await expect(page.getByRole('heading', { name: 'Kitchen Make it yours.' })).toBeVisible();

  await page.getByRole('button', { name: 'Inbox', exact: true }).click();
  await page.getByRole('button', { name: 'New enquiry', exact: true }).click();
  await page.getByLabel('To', { exact: true }).fill('controlled@example.test');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByText('DRAFT', { exact: true })).toBeVisible();
  await expect(page.getByText('SENT', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Review & send', exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Inbox', exact: true }).click();
  await expect(page.getByText('DRAFT', { exact: true })).toBeVisible();
  await expect(page.getByText('SENT', { exact: true })).toHaveCount(0);
  await page.screenshot({ path: path.join(evidence, 'mobile-inbox.png'), fullPage: false });

  await page.getByRole('button', { name: 'Discover', exact: true }).click();
  await expect(page.locator('.source-card').first()).toContainText('Sample reference');
  await expect(page.getByText('Source checked', { exact: false })).toHaveCount(0);
});

test('an unconfigured research provider returns its actual error and creates no successful result', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Discover', exact: true }).click();
  // Real backend error path. Never trigger a paid provider in a configured environment.
  const unavailable = page.locator('.integration-notice').filter({ hasText: 'Web research is awaiting a service connection.' });
  test.skip(await unavailable.count() === 0, 'Requires external research to be disabled; no paid call attempted.');
  const sourceCount = await page.locator('.source-card').count();
  await page.getByRole('textbox', { name: 'Research query or website' }).fill('Moving services in San Francisco');
  await page.getByRole('button', { name: 'Find options', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('not enabled');
  await expect(page.locator('.source-card')).toHaveCount(sourceCount);
  await expect(page.getByText('Research started. Results will appear here.', { exact: true })).toHaveCount(0);
});

test('reduced motion keeps the scroll camera stable and unavailable WebGL offers selectable rooms', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  try {
    const page = await context.newPage();
    await page.goto('/');
    const canvas = page.locator('canvas');
    await expect(canvas).toHaveAttribute('data-ready', 'true');
    const before = await canvas.getAttribute('data-camera');
    await page.mouse.wheel(0, 600);
    await page.getByRole('button', { name: 'Plan', exact: true }).click();
    await page.getByRole('button', { name: '3D', exact: true }).click();
    expect(await canvas.getAttribute('data-camera')).toBe(before);
  } finally {
    await context.close();
  }

  const fallback = await browser.newContext();
  try {
    // Device-capability fixture only. Backend and provider responses are not mocked.
    await fallback.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type: string, ...args: unknown[]) {
        if (type.includes('webgl')) return null;
        return original.apply(this, [type, ...args] as never);
      } as typeof original;
    });
    const noGpu = await fallback.newPage();
    await noGpu.goto('/');
    await expect(noGpu.locator('.floorplan')).toBeVisible();
    await expect(noGpu.getByText('3D is unavailable on this device. Your full plan is still here.')).toBeVisible();
    await noGpu.locator('.floorplan').getByRole('button', { name: /Bedroom/ }).click();
    await expect(noGpu.getByRole('heading', { name: 'Bedroom Make it yours.' })).toBeVisible();
  } finally {
    await fallback.close();
  }
});
