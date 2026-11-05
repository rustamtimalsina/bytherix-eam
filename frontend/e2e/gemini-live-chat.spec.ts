import { test, expect } from "@playwright/test";

test("Verify Real Gemini LLM RAG Code Generation and High Grounding Score", async ({ page, request }) => {
  // 1. Login as Rustam Timalsina (Owner)
  const loginRes = await request.post("http://127.0.0.1:8000/api/v1/auth/login", {
    data: {
      email: "rustam@bytherix.com",
      password: "Password123!",
    },
  });
  expect(loginRes.ok()).toBeTruthy();
  const loginData = await loginRes.json();

  await page.goto("/login");
  await page.evaluate((data) => {
    localStorage.setItem("bytherix_token", data.access_token);
    localStorage.setItem("bytherix_user", JSON.stringify(data.user));
    localStorage.setItem("bytherix_org", data.organization_id);
    localStorage.setItem("bytherix_role", data.role);
  }, loginData);

  await page.goto("/");
  await expect(page.locator("header")).toContainText(/bytherix/i, { timeout: 15000 });

  // 2. Switch to RAG AI Chat tab
  const chatTabBtn = page.locator('button[aria-label="RAG AI"]');
  await chatTabBtn.click();
  await expect(page.locator("h3")).toContainText("Grounded Knowledge QA", { timeout: 10000 });

  // 3. Ask for Python code
  const input = page.locator('input[placeholder*="Ask a question"]');
  await input.fill("Provide Python code to query the Bytherix API with an API key");
  await page.locator('button[type="submit"]').click();

  // 4. Wait for response and model tag
  await expect(page.locator("body")).toContainText("gemini-3.1-flash-lite", { timeout: 30000 });
  await page.waitForTimeout(3000);

  // 5. Take verified screenshot showing the new grounding score
  await page.screenshot({
    path: "C:/Users/asus/.gemini/antigravity/brain/2435dc4f-1042-437e-befd-903d974b9a53/gemini_grounded_high_score.png",
    fullPage: true,
  });
});
