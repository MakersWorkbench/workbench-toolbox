const { defineConfig } = require('@playwright/test');
const fs = require('node:fs');
const exe = fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined;
module.exports = defineConfig({
  testDir: 'e2e',
  timeout: 60000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:4173/', launchOptions: { executablePath: exe }, serviceWorkers: 'allow' },
  webServer: { command: 'node scripts/serve.mjs 4173', url: 'http://127.0.0.1:4173/', reuseExistingServer: true, timeout: 20000 }
});
