import { test, expect } from '@playwright/test';

test('landing page loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /taskgenius/i }).first()).toBeVisible();
});

test('login page is accessible', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  await expect(page.getByPlaceholder(/email/i)).toBeVisible();
});

test('forgot password page shows reset instructions', async ({ page }) => {
  await page.goto('/forgot-password');
  await expect(page.getByRole('heading', { name: /reset password/i })).toBeVisible();
  await expect(page.getByPlaceholder(/you@example.com/i)).toBeVisible();
});
