import { expect, test } from "@playwright/test";

test.describe("link check", () => {
  test("every internal link resolves", async ({ page }) => {
    const pages = ["/", "/projects/", "/about/", "/contact/"];
    const internalLinks = new Set<string>();

    for (const path of pages) {
      await page.goto(path);
      const links = await page
        .locator("a")
        .evaluateAll((els) => els.map((el) => el.getAttribute("href")).filter(Boolean));
      for (const href of links) {
        if (href && href.startsWith("/") && !href.startsWith("//") && !href.startsWith("/#")) {
          internalLinks.add(href.split("#")[0]); // Strip anchor hashes
        }
      }
    }

    for (const href of internalLinks) {
      const response = await page.request.get(href);
      expect([200, 301, 308]).toContain(response.status());
    }
  });
});
