import { defineConfig, devices } from "@playwright/test";

// Gli end-to-end girano SEMPRE su build di produzione: il server di sviluppo ha
// tempi e comportamenti di cache diversi, e un verde ottenuto lì non dimostra nulla
// sull'istanza che il cliente userà davvero.

const PORTA = 3100;
const BASE = `http://127.0.0.1:${PORTA}`;
const inCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: inCI,
  retries: inCI ? 1 : 0,
  // In CI un solo worker: il server di produzione è uno, e l'esecuzione parallela
  // renderebbe i fallimenti difficili da attribuire.
  ...(inCI ? { workers: 1 } : {}),
  reporter: inCI ? [["github"], ["html", { open: "never" }]] : [["list"]],

  use: {
    baseURL: BASE,
    locale: "it-IT",
    timezoneId: "Europe/Rome",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  webServer: {
    command: `pnpm build && pnpm start --port ${PORTA}`,
    url: BASE,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
