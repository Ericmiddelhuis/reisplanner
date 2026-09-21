import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  use: { baseURL: 'http://localhost:8000' },
  // De app is statisch: een simpele webserver volstaat
  webServer: { command: 'python3 -m http.server 8000', url: 'http://localhost:8000', reuseExistingServer: true, stdout: 'ignore' },
});
