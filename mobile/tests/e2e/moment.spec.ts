/**
 * E2E: Create moment flow (form interaction).
 * Foundation for QA AI Planning agent.
 * Note: Full image capture requires device APIs; we test form and navigation.
 */

import { test, expect } from "@playwright/test";

test.describe("Create moment flow", () => {
  test.beforeEach(async ({ page }) => {
    // Login first (mock auth)
    await page.goto("/login");
    await page.getByPlaceholder(/artist@example\.com/i).fill("test@test.com");
    await page.getByPlaceholder(/••••••••/).fill("test123");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/(tabs)?/);
  });

  test("navigates to moment screen and shows form", async ({ page }) => {
    await page.getByRole("tab", { name: /moment/i }).click();
    await expect(page.getByText(/artist moment/i)).toBeVisible();
    await expect(page.getByText(/record/i)).toBeVisible();
    await expect(page.getByPlaceholder(/reflection/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /take photo/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /upload/i })).toBeVisible();
  });

  test("can fill note and select state/medium", async ({ page }) => {
    await page.getByRole("tab", { name: /moment/i }).click();
    await page.getByPlaceholder(/reflection/i).fill("Testing my practice");
    await page.getByRole("button", { name: /thinking/i }).click();
    await page.getByRole("button", { name: /drawing/i }).click();
    // Record practice is disabled without image - we've verified form interaction
    await expect(page.getByRole("button", { name: /record practice/i })).toBeDisabled();
  });
});
