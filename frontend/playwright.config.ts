import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 45000,
  retries: 0,
  workers: 1,
  use: {
    baseURL: "http://localhost:3000",
    channel: "msedge",
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "edge",
      use: {
        channel: "msedge",
      },
    },
  ],
});
