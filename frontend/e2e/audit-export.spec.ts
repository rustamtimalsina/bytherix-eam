import { test, expect } from "@playwright/test";
import * as path from "path";

test.describe("Audit Log Export & Date Filter UI Verification", () => {
  const timestamp = Date.now();
  const testUser = {
    fullName: "Audit Officer",
    email: `audit_verifier_${timestamp}@bytherix.com`,
    password: "Password123!",
    orgName: `Audit Corp ${timestamp}`,
  };

  test("Verify Audit Range Pills, CSV/JSON Export, and SHA-256 Digest Banner", async ({ page }) => {
    // 1. Sign up new tenant
    await page.goto("/signup");
    await page.locator('input[placeholder="Alex Mercer"]').fill(testUser.fullName);
    await page.locator('input[type="email"]').fill(testUser.email);
    await page.locator('input[type="password"]').fill(testUser.password);
    await page.locator('input[placeholder="Acme Intelligence Inc."]').fill(testUser.orgName);
    await page.locator('button[type="submit"]').click();

    // 2. Wait for dashboard redirect
    await expect(page).toHaveURL("/", { timeout: 15000 });

    // 3. Navigate to Audit tab
    const auditTabBtn = page.locator('button[aria-label="Audit"]');
    await auditTabBtn.click();
    await expect(page.locator("h2")).toContainText("Enterprise Audit & Observability", { timeout: 10000 });

    // 4. Verify Date Range Filter Pills
    const rangeAll = page.locator('button:has-text("All Time")');
    const range24h = page.locator('button:has-text("24h")');
    const range7d = page.locator('button:has-text("7 Days")');
    const range30d = page.locator('button:has-text("30 Days")');

    await expect(rangeAll).toBeVisible();
    await expect(range24h).toBeVisible();
    await expect(range7d).toBeVisible();
    await expect(range30d).toBeVisible();

    // Select 24h filter
    await range24h.click();

    // 5. Verify and trigger CSV Export
    const exportCsvBtn = page.locator('button:has-text("Export CSV")');
    await expect(exportCsvBtn).toBeVisible();

    const [csvDownload] = await Promise.all([
      page.waitForEvent("download"),
      exportCsvBtn.click(),
    ]);
    const csvFilename = csvDownload.suggestedFilename();
    expect(csvFilename).toContain(".csv");
    console.log("Downloaded CSV:", csvFilename);

    // 6. Verify SHA-256 Digest Toast is displayed
    const toastBanner = page.locator("text=Audit Export Generated:");
    await expect(toastBanner).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=SHA-256 Digest:")).toBeVisible();

    // 7. Trigger JSON (SIEM) Export
    const exportJsonBtn = page.locator('button:has-text("Export JSON (SIEM)")');
    await expect(exportJsonBtn).toBeVisible();

    const [jsonDownload] = await Promise.all([
      page.waitForEvent("download"),
      exportJsonBtn.click(),
    ]);
    const jsonFilename = jsonDownload.suggestedFilename();
    expect(jsonFilename).toContain(".json");
    console.log("Downloaded JSON:", jsonFilename);

    // 8. Capture screenshot of the UI with the cryptographic verification banner
    const screenshotPath = "C:/Users/asus/.gemini/antigravity/brain/2435dc4f-1042-437e-befd-903d974b9a53/audit_export_verified.png";
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log("Saved verification screenshot to:", screenshotPath);
  });
});
