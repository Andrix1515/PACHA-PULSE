import { defineConfig, devices } from '@playwright/test'

const isolated = process.env.PACHA_ISOLATED === '1'
const webPort = isolated ? 5174 : 5173
const apiPort = isolated ? 8001 : 8000

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  workers: 2,
  reporter: 'list',
  use: { baseURL: `http://127.0.0.1:${webPort}`, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Edge'], channel: 'msedge', viewport: { width: 1440, height: 1100 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'], defaultBrowserType: 'chromium', channel: 'msedge' } },
  ],
  webServer: [
    { command: `..\\backend\\.venv\\Scripts\\python.exe -m uvicorn app.main:app --app-dir ../backend --host 127.0.0.1 --port ${apiPort}`, url: `http://127.0.0.1:${apiPort}/api/v1/health`, reuseExistingServer: false },
    { command: `npm run dev -- --port ${webPort}`, url: `http://127.0.0.1:${webPort}`, env: { API_PROXY_TARGET: `http://127.0.0.1:${apiPort}` }, reuseExistingServer: false },
  ],
})
