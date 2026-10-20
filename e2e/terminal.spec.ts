import { expect, test, type Page } from "@playwright/test";
import { projects } from "../src/content/projects";
import { waitForIsland } from "./helpers";

async function readyTerminal(page: Page) {
  await page.goto("/about/");
  const input = page.getByRole("textbox", { name: "Command" });
  await input.scrollIntoViewIfNeeded();
  await waitForIsland(page, "Terminal");
  await expect(input).toBeEnabled();
  return input;
}

test.describe("terminal on the about page", () => {
  test("runs help, ls and an unknown project, and recalls history with the arrow key", async ({ page }) => {
    const input = await readyTerminal(page);
    const log = page.getByRole("log");

    await input.fill("help");
    await input.press("Enter");
    await expect(log).toContainText("list commands");

    await input.fill("ls");
    await input.press("Enter");
    await expect(log).toContainText(projects[0]?.slug ?? "");

    await input.fill("open nope");
    await input.press("Enter");
    await expect(log).toContainText('no project called "nope"');
    await expect(input).toHaveValue("");

    await input.press("ArrowUp");
    await expect(input).toHaveValue("open nope");
  });

  test("open <project> navigates to the case study", async ({ page }) => {
    const input = await readyTerminal(page);
    await input.fill("open product-master");
    await input.press("Enter");
    await expect(page).toHaveURL(/\/projects\/product-master\/?$/);
  });
});
