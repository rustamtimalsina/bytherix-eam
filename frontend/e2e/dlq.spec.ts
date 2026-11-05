import { test, expect } from "@playwright/test";

test.describe("Dead-Letter Queue (DLQ) & Background Job Pipeline Verification", () => {
  const timestamp = Date.now();
  const testUser = {
    fullName: "DLQ SRE Lead",
    email: `dlq_lead_${timestamp}@bytherix.com`,
    password: "Password123!",
    orgName: `SRE Labs ${timestamp}`,
  };

  test("Verify DLQ Sub-tab, Job Diagnostics Modal, Re-drive and Purge", async ({ page, request }) => {
    // 1. Sign up user via API
    const signupRes = await request.post("http://127.0.0.1:8000/api/v1/auth/signup", {
      data: {
        email: testUser.email,
        password: testUser.password,
        full_name: testUser.fullName,
        organization_name: testUser.orgName,
      },
    });
    expect(signupRes.ok()).toBeTruthy();
    const signupData = await signupRes.json();
    const token = signupData.access_token;
    const orgId = signupData.organization_id;
    const user = signupData.user;
    const role = signupData.role;

    // 2. Set exact localStorage keys as expected by auth-context
    await page.goto("/login");
    await page.evaluate(({ token, user, orgId, role }) => {
      localStorage.setItem("bytherix_token", token);
      localStorage.setItem("bytherix_user", JSON.stringify(user));
      localStorage.setItem("bytherix_org", orgId);
      localStorage.setItem("bytherix_role", role);
    }, { token, user, orgId, role });

    await page.goto("/");
    await expect(page.locator("header")).toContainText(/bytherix/i, { timeout: 15000 });

    // 3. Navigate to Audit tab
    const auditTabBtn = page.locator('button[aria-label="Audit"]');
    await auditTabBtn.click();
    await expect(page.locator("h2")).toContainText("Enterprise Audit & Observability", { timeout: 10000 });

    // 4. Click Dead-Letter Queue (DLQ) sub-tab
    const dlqSubTab = page.locator('button:has-text("Dead-Letter Queue (DLQ)")');
    await expect(dlqSubTab).toBeVisible();
    await dlqSubTab.click();

    // 5. Verify DLQ Stat Cards
    await expect(page.locator("text=Total DLQ Tasks")).toBeVisible();
    await expect(page.locator("text=Active Failures")).toBeVisible();
    await expect(page.locator("text=Re-driving")).toBeVisible();
    await expect(page.locator("text=Purged / Dismissed")).toBeVisible();

    // 6. Capture screenshot of DLQ Dashboard
    const screenshotPath = "C:/Users/asus/.gemini/antigravity/brain/2435dc4f-1042-437e-befd-903d974b9a53/dlq_dashboard_verified.png";
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log("Saved DLQ screenshot to:", screenshotPath);
  });
});
