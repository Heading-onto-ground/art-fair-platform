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
    await page.getByText("Sign In", { exact: true }).click();
    await expect(page).toHaveURL(/\/(tabs)?/);
  });

  test("navigates to moment screen and shows form", async ({ page }) => {
    await page.getByRole("tab", { name: /moment/i }).click();
    await expect(page.getByRole("heading", { name: "Moment" })).toBeVisible();
    await expect(page.getByText("Capture your artist state")).toBeVisible();
    await expect(page.getByPlaceholder(/reflection/i)).toBeVisible();
    await expect(page.getByText("Take Photo", { exact: true })).toBeVisible();
    await expect(page.getByText("Add from gallery", { exact: true })).toBeVisible();
  });

  test("can fill note and select state/medium", async ({ page }) => {
    await page.getByRole("tab", { name: /moment/i }).click();
    await page.getByPlaceholder(/reflection/i).fill("Testing my practice");
    await page.getByText("Thinking", { exact: true }).click();
    await page.getByText("drawing", { exact: true }).click();
    await expect(page.getByPlaceholder(/reflection/i)).toHaveValue("Testing my practice");
  });
});
