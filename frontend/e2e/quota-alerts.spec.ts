import { test, expect } from "@playwright/test";

test.describe("Real-Time Token Quota & Latency Budget Alerting (§ 6.3 & § 13.2)", () => {
  const timestamp = Date.now();
  const testUser = {
    fullName: "Quota SRE Auditor",
    email: `quota_auditor_${timestamp}@bytherix.com`,
    password: "Password123!",
    orgName: `SRE Telemetry ${timestamp}`,
  };

  test("Verify Live Token Quota Alerting & Latency SLA Observability Dashboard", async ({ page, request }) => {
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

    // 2. Set auth in browser
    await page.goto("/login");
    await page.evaluate(({ token, user, orgId, role }) => {
      localStorage.setItem("bytherix_token", token);
      localStorage.setItem("bytherix_user", JSON.stringify(user));
      localStorage.setItem("bytherix_org", orgId);
      localStorage.setItem("bytherix_role", role);
    }, { token, user, orgId, role });

    await page.goto("/");
    await expect(page.locator("header")).toContainText(/bytherix/i, { timeout: 15000 });

    // 3. Verify Header Quota Badge is visible
    const quotaPill = page.locator("header").locator("button").filter({ hasText: /quota/i });
    await expect(quotaPill).toBeVisible({ timeout: 10000 });

    // 4. Navigate to Audit & Observability Tab
    const auditTabBtn = page.locator('button[aria-label="Audit"]');
    await auditTabBtn.click();
    await expect(page.locator("h2")).toContainText("Enterprise Audit & Observability", { timeout: 10000 });

    // 5. Switch to Observability sub-tab
    const telemetryTabBtn = page.locator("button").filter({ hasText: /observability/i });
    await telemetryTabBtn.click();

    // 6. Verify Latency SLA Budget Card is rendered (§ 13.2)
    const slaBudgetCard = page.locator("div").filter({ hasText: /latency sla budget/i }).first();
    await expect(slaBudgetCard).toBeVisible({ timeout: 10000 });
    await expect(page.locator("body")).toContainText("Target Budget: ≤ 2000ms");
    await expect(page.locator("body")).toContainText(/HEALTHY|WARNING|BREACHED/);

    // 7. Verify Prometheus /metrics link is present
    const metricsLink = page.locator('a[href*="/metrics"]');
    await expect(metricsLink).toBeVisible();

    // 8. Capture verified screenshot
    await page.screenshot({
      path: "C:/Users/asus/.gemini/antigravity/brain/2435dc4f-1042-437e-befd-903d974b9a53/quota_latency_alerting_verified.png",
      fullPage: true,
    });
  });
});
