/**
 * E2E: Login flow.
 * Foundation for QA AI Planning agent.
 */

import { test, expect } from "@playwright/test";

test.describe("Login flow", () => {
  test("splash shows Enter and navigates to login", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /enter/i })).toBeVisible();
    await page.getByRole("link", { name: /enter/i }).click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText(/sign in/i)).toBeVisible();
  });

  test("login form validates and submits", async ({ page }) => {
    await page.goto("/login");

    // Empty submit shows validation
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByText(/email required/i)).toBeVisible();

    // Fill credentials (mock auth accepts any when API fails)
    await page.getByPlaceholder(/artist@example\.com/i).fill("test@test.com");
    await page.getByPlaceholder(/••••••••/).fill("test123");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Should redirect to tabs (feed/home)
    await expect(page).toHaveURL(/\/(tabs)?/);
  });
});
