import { test, expect } from "@playwright/test";

test.describe("Bytherix EAM - Phase 4: Governed Agent Workflows", () => {
  const timestamp = Date.now();
  const testUser = {
    fullName: "Chief AI Officer",
    email: `caio_${timestamp}@bytherix.com`,
    password: "Password123!",
    orgName: `Sovereign AI Labs ${timestamp}`,
  };

  test("Phase 4 Flow: Allowlisted Catalog, Step Budget, Human-in-the-Loop Approval & Audit", async ({ page }) => {
    // 1. Sign up fresh tenant organization
    await page.goto("/signup");
    await expect(page).toHaveTitle(/Bytherix EAM/);

    await page.locator('input[placeholder="Alex Mercer"]').fill(testUser.fullName);
    await page.locator('input[type="email"]').fill(testUser.email);
    await page.locator('input[type="password"]').fill(testUser.password);
    await page.locator('input[placeholder="Acme Intelligence Inc."]').fill(testUser.orgName);
    await page.locator('button[type="submit"]').click();

    // 2. Redirect to platform dashboard
    await expect(page).toHaveURL("/", { timeout: 15000 });
    await expect(page.locator("header")).toContainText(testUser.email);

    // 3. Navigate to Agents dock tab
    const agentsTab = page.locator('button[aria-label="Agents"]');
    await agentsTab.click();
    await expect(page.locator("h2")).toContainText("Governed Agent Workflows");

    // 4. Verify catalog definitions
    await expect(page.locator("body")).toContainText("Enterprise Knowledge Auditor");
    await expect(page.locator("body")).toContainText("Governed Data Export & Integration");

    // 5. Select Governed Data Export & Integration workflow
    const exportHeading = page.locator('h3:has-text("Governed Data Export & Integration")');
    await exportHeading.click();

    // 6. Enter prompt and dispatch workflow
    const promptInput = page.locator('input[placeholder*="Enter objective for the agent"]');
    await promptInput.fill("Export full annual compliance audit package to enterprise storage");

    const launchBtn = page.locator('button:has-text("Launch Governed Agent")');
    await expect(launchBtn).toBeEnabled();
    await launchBtn.click();

    // 7. Verify Agent Execution Pauses at Human-In-The-Loop Gate
    const approvalGate = page.locator("text=Human-In-The-Loop Authorization Gate");
    await expect(approvalGate).toBeVisible({ timeout: 15000 });
    await expect(page.locator("body")).toContainText("SensitiveExportTool");

    // 8. Provide Authorization Note & Approve
    const noteInput = page.locator('input[placeholder="Optional authorization note..."]');
    if (await noteInput.isVisible()) {
      await noteInput.fill("Authorized by CAIO for compliance export");
    }

    const approveBtn = page.locator('button:has-text("Approve & Execute")');
    await approveBtn.click();

    // 9. Verify Execution Resumes and Completes
    const completedBadge = page.locator('span:has-text("completed")').first();
    await expect(completedBadge).toBeVisible({ timeout: 15000 });
    await expect(page.locator("body")).toContainText("Action Approved & Executed by Administrator");

    // 10. Verify Immutable Compliance Trail in Audit Dock
    const auditTab = page.locator('button[aria-label="Audit"]');
    await auditTab.click();
    await expect(page.locator("h2")).toContainText("Enterprise Audit & Observability");
    await expect(page.locator("table")).toContainText("agent.workflow_started");
    await expect(page.locator("table")).toContainText("agent.approval_granted");
  });
});
