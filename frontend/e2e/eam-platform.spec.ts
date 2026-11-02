import { test, expect } from "@playwright/test";

test.describe("Bytherix EAM Enterprise End-to-End Suite", () => {
  const timestamp = Date.now();
  const testUser = {
    fullName: "Playwright E2E Lead",
    email: `e2e_lead_${timestamp}@bytherix.com`,
    password: "Password123!",
    orgName: `E2E Labs ${timestamp}`,
  };

  test("Complete E2E: Provisioning, Navigation, API Key Vault & Audit Logging", async ({ page }) => {
    // 1. Sign up a fresh tenant organization
    await page.goto("/signup");
    await expect(page).toHaveTitle(/Bytherix EAM/);

    await page.locator('input[placeholder="Alex Mercer"]').fill(testUser.fullName);
    await page.locator('input[type="email"]').fill(testUser.email);
    await page.locator('input[type="password"]').fill(testUser.password);
    await page.locator('input[placeholder="Acme Intelligence Inc."]').fill(testUser.orgName);

    await page.locator('button[type="submit"]').click();

    // 2. Wait for redirect to dashboard
    await expect(page).toHaveURL("/", { timeout: 15000 });
    await expect(page.locator("header")).toContainText("Bytherix");
    await expect(page.locator("header")).toContainText(testUser.email);

    // 3. Navigate to Models tab using the bottom dock
    const modelsTab = page.locator('button[aria-label="Models"]');
    await modelsTab.click();
    await expect(page.locator("h2")).toContainText("MLOps Model Registry");

    // 4. Navigate to API Keys tab
    const apiKeysTab = page.locator('button[aria-label="API Keys"]');
    await apiKeysTab.click();
    await expect(page.locator("h2")).toContainText("API Keys & Machine Access");

    // 5. Generate a new API Key with explicit verification
    const nameInput = page.locator('input[placeholder="e.g. CI/CD Ingestion Pipeline"]');
    await nameInput.click();
    await nameInput.fill("E2E Automated Key");
    await expect(nameInput).toHaveValue("E2E Automated Key");

    const scopesInput = page.locator('input[placeholder="docs:read, docs:write, chat:query"]');
    await scopesInput.click();
    await scopesInput.fill("docs:read, models:read");

    const generateBtn = page.locator('button:has-text("Generate Key")');
    await expect(generateBtn).toBeEnabled();
    await generateBtn.click();

    // 6. Verify One-Time Reveal Modal
    const revealModal = page.locator("text=Copy Your API Secret Key (Shown Only Once!)");
    await expect(revealModal).toBeVisible({ timeout: 10000 });
    await expect(page.locator("code.break-all")).toContainText("bx_live_");

    // Dismiss reveal modal
    await page.locator('button:has-text("I have saved my key securely")').click();
    await expect(revealModal).not.toBeVisible();

    // 7. Verify Key appears in table and Revoke it with dialog acceptance
    page.on("dialog", async (dialog) => {
      await dialog.accept();
    });

    const keyRow = page.locator('[data-testid="api-key-row"]').filter({ hasText: "E2E Automated Key" });
    await expect(keyRow).toBeVisible({ timeout: 10000 });

    const revokeBtn = keyRow.locator('button:has-text("Revoke")');
    await revokeBtn.click();

    // Verify status changes to Revoked
    const revokedBadge = keyRow.locator('span:has-text("Revoked")');
    await expect(revokedBadge).toBeVisible({ timeout: 10000 });

    // 8. Navigate to Audit tab and verify immutable compliance logging
    const auditTab = page.locator('button[aria-label="Audit"]');
    await auditTab.click();
    await expect(page.locator("h2")).toContainText("Enterprise Audit & Observability");
    await expect(page.locator("table")).toContainText("security.api_key_created");
    await expect(page.locator("table")).toContainText("security.api_key_revoked");
  });
});
