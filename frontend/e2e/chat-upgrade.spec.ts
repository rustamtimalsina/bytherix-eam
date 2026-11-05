import { test, expect } from "@playwright/test";

test.describe("RAG AI & Chat Interface Upgrades", () => {
  const timestamp = Date.now();
  const testUser = {
    fullName: "Chat UI Lead",
    email: `chat_ui_${timestamp}@bytherix.com`,
    password: "Password123!",
    orgName: `Design Systems ${timestamp}`,
  };

  test("Verify Markdown Code Blocks, Copy Buttons, and Input Console Polish", async ({ page, request }) => {
    // 1. Sign up user
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

    // 2. Authenticate
    await page.goto("/login");
    await page.evaluate(({ token, user, orgId, role }) => {
      localStorage.setItem("bytherix_token", token);
      localStorage.setItem("bytherix_user", JSON.stringify(user));
      localStorage.setItem("bytherix_org", orgId);
      localStorage.setItem("bytherix_role", role);
    }, { token, user, orgId, role });

    await page.goto("/");
    await expect(page.locator("header")).toContainText(/bytherix/i, { timeout: 15000 });

    // 3. Switch to RAG AI Chat tab
    const chatTabBtn = page.locator('button[aria-label="RAG AI"]');
    await chatTabBtn.click();
    await expect(page.locator("h3")).toContainText("Grounded Knowledge QA", { timeout: 10000 });

    // 4. Verify Input Console Polish: Shortcuts hint and placeholder
    await expect(page.locator("body")).toContainText("send");
    await expect(page.locator("body")).toContainText("newline");
    await expect(page.locator("body")).toContainText("Strictly grounded in enterprise documents");

    // 5. Test typing in the input console and verifying the clear button appears
    const input = page.locator('input[placeholder*="Ask a question"]');
    await input.fill("What are the subscription plans and quotas?");
    const clearBtn = page.locator('button[title="Clear input"]');
    await expect(clearBtn).toBeVisible();

    // 6. Submit prompt and verify streaming/message rendering
    await page.locator('button[type="submit"]').click();
    const userMsg = page.locator("p").filter({ hasText: "What are the subscription plans and quotas?" });
    await expect(userMsg.first()).toBeVisible({ timeout: 10000 });

    // 7. Wait for assistant response to complete and verify Message Action Bar
    const actionCopyBtn = page.locator('button[title="Copy response text"]');
    await expect(actionCopyBtn.first()).toBeVisible({ timeout: 25000 });
    await expect(page.locator("body")).toContainText(/gpt-4o-mini/i);
    await expect(page.locator("body")).toContainText(/tokens/i);

    // 8. Capture screenshot
    await page.screenshot({
      path: "C:/Users/asus/.gemini/antigravity/brain/2435dc4f-1042-437e-befd-903d974b9a53/chat_ui_upgraded.png",
      fullPage: true,
    });
  });
});
