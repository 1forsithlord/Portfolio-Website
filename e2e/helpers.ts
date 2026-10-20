import type { Page } from "@playwright/test";

export async function waitForIsland(page: Page, component: string): Promise<void> {
  // Wait for the island element itself to exist
  await page.locator(`astro-island[component-url*="${component}"]`).waitFor({ state: "attached", timeout: 15000 });
  // Then wait a beat for hydration (removing ssr attribute is not reliable across Astro versions)
  await page.waitForTimeout(1000);
}
