import { test, expect } from "@playwright/test";

test.describe("Bytherix EAM - Executive AI Demo Experience", () => {
  const timestamp = Date.now();
  const testUser = {
    fullName: "Executive Evaluator",
    email: `evaluator_${timestamp}@bytherix.com`,
    password: "Password123!",
    orgName: `Evaluator Corp ${timestamp}`,
  };

  test("1-Click Demo Knowledge, Auto-Dispatch RAG & Live Quota Telemetry", async ({ page }) => {
    // 1. Sign up a fresh evaluator account
    await page.goto("/signup");
    await page.locator('input[placeholder="Alex Mercer"]').fill(testUser.fullName);
    await page.locator('input[type="email"]').fill(testUser.email);
    await page.locator('input[placeholder="Acme Intelligence Inc."]').fill(testUser.orgName);
    await page.locator('input[type="password"]').fill(testUser.password);
    await page.locator('button[type="submit"]').click();

    // 2. Arrive at platform dashboard
    await expect(page).toHaveURL("/", { timeout: 15000 });
    await expect(page.locator("header")).toContainText(testUser.email);

    // 3. Verify Live Quota Pill in Navbar
    const quotaPill = page.locator("header").locator('text=/\\d+ \\/ \\d+/');
    await expect(quotaPill).toBeVisible();

    // 4. Click 1-Click Load Enterprise Demo Knowledge
    const seedDemoBtn = page.locator('button:has-text("1-Click Load Enterprise Demo Knowledge")');
    await expect(seedDemoBtn).toBeVisible({ timeout: 10000 });
    await seedDemoBtn.click();

    // 5. Verify Document is Indexed with 5 Chunks
    await expect(page.locator("body")).toContainText("Bytherix EAM Enterprise Technical Specification", { timeout: 15000 });
    await expect(page.locator("body")).toContainText("Ready");

    // 6. Switch to RAG AI Dock
    const ragTab = page.locator('button[aria-label="RAG AI"]');
    await ragTab.click();
    await expect(page.locator("h3")).toContainText("Grounded Knowledge QA");

    // 7. Click 1-Click Auto-Dispatch Question Card
    const techArchCard = page.locator('button:has-text("Technical Architecture")');
    await expect(techArchCard).toBeVisible();
    await techArchCard.click();

    // 8. Verify AI Answer Streams with Citations
    await expect(page.locator("body")).toContainText("Bytherix", { timeout: 15000 });
    await expect(page.locator("body")).toContainText("Source", { timeout: 15000 });
  });
});
