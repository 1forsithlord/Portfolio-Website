import { expect, test } from "@playwright/test";
import { projects } from "../src/content/projects";

const featuredCount = projects.filter((project) => project.featured).length;
const pad2 = (n: number) => String(n).padStart(2, "0");

test.describe("projects page", () => {
  test("shows the project count as a real number", async ({ page }) => {
    await page.goto("/projects/");
    const count = page.locator("[data-count-to]").first();
    await count.scrollIntoViewIfNeeded();
    await expect(count).toHaveText(String(projects.length), { timeout: 5000 });
  });

  test("the carousel steps, expands and closes with the keyboard", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/projects/");
    await page.waitForLoadState("networkidle");

    const carousel = page.getByRole("region", { name: "Featured projects" });
    await carousel.scrollIntoViewIfNeeded();

    const position = page.locator(".carousel .position");
    await expect(position).toHaveText(`01 / ${pad2(featuredCount)}`, { timeout: 10000 });

    // Retry clicking Next until the position actually changes (hydration race).
    await expect
      .poll(
        async () => {
          await page
            .getByRole("button", { name: "Next project" })
            .click({ timeout: 2000 })
            .catch(() => {});
          return (await position.textContent()) ?? "";
        },
        { timeout: 20000, intervals: [300, 500, 1000, 2000] },
      )
      .toBe(`02 / ${pad2(featuredCount)}`);

    await page.keyboard.press("ArrowLeft");
    await expect(position).toHaveText(`01 / ${pad2(featuredCount)}`, { timeout: 5000 });

    await page.getByRole("button", { name: /^Open / }).click();
    await expect(page.locator("#detail-title")).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(carousel).toHaveAttribute("data-mode", "browse");
  });

  test("the page never scrolls sideways", async ({ page }) => {
    await page.goto("/projects/");
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflows).toBe(false);
  });
});
