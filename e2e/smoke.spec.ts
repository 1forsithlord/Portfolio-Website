import { expect, test } from "@playwright/test";
import { nav } from "../src/content/site";

const isThirdParty = (url: string) => /fonts\.(googleapis|gstatic)\.com/.test(url);

test.describe("every page", () => {
  for (const item of nav) {
    test(`${item.label} (${item.href}) renders, has a heading and throws no errors`, async ({ page }) => {
      const pageErrors: string[] = [];
      const badRequests: string[] = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));
      page.on("requestfailed", (request) => {
        // Ignore aborted requests (page navigation, worker teardown) and third-party fonts.
        if (request.failure()?.errorText === "net::ERR_ABORTED") return;
        if (!isThirdParty(request.url())) badRequests.push(request.url());
      });

      const response = await page.goto(item.href);
      expect(response?.status()).toBe(200);
      await page.waitForLoadState("networkidle");
      await expect(page.locator("h1").first()).toBeAttached();
      expect(pageErrors).toEqual([]);
      expect(badRequests).toEqual([]);
    });
  }

  test("an unknown path shows the 404 page", async ({ page }) => {
    const response = await page.goto("/nope");
    expect(response?.status()).toBe(404);
  });
});
