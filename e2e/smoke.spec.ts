import { expect, test } from "@playwright/test";

/**
 * End-to-end smoke: landing → register → shell → core nav → logout → login.
 * Runs against demo mode (no keys needed); each run registers a unique user.
 */

const stamp = Date.now().toString(36);
const email = `e2e-${stamp}@example.com`;
const username = `e2e_${stamp}`;
const password = "e2e-password-1";

test.describe.configure({ mode: "serial" });

test("landing page renders for logged-out visitors", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/welcome/);
  await expect(page.getByRole("heading", { name: /know why you own it/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /get started/i })).toBeVisible();
});

test("register lands on the dashboard", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /create account/i }).click();
  await page.waitForURL("/");
  // Shell chrome is present
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
  await expect(page.getByRole("button", { name: /account menu/i })).toBeVisible();
});

test("core pages load through the sidebar", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL("/");

  const nav = page.getByRole("navigation", { name: "Primary" });
  for (const [label, path] of [
    ["Markets", "/markets"],
    ["Stock Research", "/research"],
    ["Watchlists", "/watchlists"],
    ["Portfolio", "/portfolio"],
    ["Paper Trading", "/trade"],
    ["Alerts", "/alerts"],
  ] as const) {
    await nav.getByRole("link", { name: label }).click();
    await page.waitForURL(`**${path}**`);
    await expect(page.locator("main h1").first()).toBeVisible();
  }
});

test("stock research page shows a labeled price", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL("/");

  await page.goto("/research/AAPL");
  await expect(page.getByText("AAPL").first()).toBeVisible();
  // Demo mode: provenance labeling must be visible somewhere on the page.
  await expect(page.getByText(/synthetic/i).first()).toBeVisible();
});

test("wrong password is rejected; logout returns to login", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByText(/incorrect email or password/i)).toBeVisible();

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL("/");

  await page.getByRole("button", { name: /account menu/i }).click();
  await page.getByRole("menuitem", { name: /sign out/i }).click();
  await page.waitForURL(/\/login/);
});
