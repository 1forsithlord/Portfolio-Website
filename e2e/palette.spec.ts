import { expect, test, type Page } from "@playwright/test";

async function openPalette(page: Page) {
  await page.goto("/projects/");
  await page.waitForLoadState("networkidle");
  // Give the client:load island a moment to hydrate before clicking.
  await page.waitForTimeout(800);

  const trigger = page.getByRole("button", { name: /Search/ });
  await trigger.waitFor({ state: "visible", timeout: 15000 });
  await trigger.click();

  // Use DOM attribute selector instead of accessibility role.
  await page.waitForSelector("dialog[open]", { state: "visible", timeout: 15000 });
  return page.locator("dialog[open]");
}

test.describe("command palette", () => {
  test("opens it, a search finds a project, and Enter goes there", async ({ page }) => {
    await openPalette(page);

    const search = page.getByRole("combobox", { name: "Search pages and projects" });
    await expect(search).toBeFocused();

    await search.fill("product");
    await expect(page.getByRole("option", { name: /Product-Master/ })).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/projects\/product-master\/?$/);
  });

  test("Escape closes it", async ({ page }) => {
    await openPalette(page);
    await page.keyboard.press("Escape");
    await expect(page.locator("dialog[open]")).toHaveCount(0, { timeout: 5000 });
  });
});
