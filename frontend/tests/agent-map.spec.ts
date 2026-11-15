import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

async function navigate(page: Page, title: string) {
  const labels: Record<string, string> = { Charts: 'Make a chart', 'My field': 'Find my field', Reports: 'Keep my findings' }
  await page.getByRole('button', { name: 'Open journey menu', exact: true }).click()
  await page.getByRole('navigation', { name: 'Main navigation', exact: true }).getByRole('button', { name: labels[title] || title, exact: true }).click()
  if (title === 'My field') await page.getByText('Field tools', { exact: true }).click()
}
async function begin(page: Page) {
  await page.goto('/#field'); await page.getByText('Field tools', { exact: true }).click()
  await page.getByLabel('Latitude', { exact: true }).fill('-12.05')
  await page.getByLabel('Longitude', { exact: true }).fill('-75.2')
  await page.getByRole('button', { name: 'Use location', exact: true }).click()
  await page.getByRole('button', { name: 'Zoom to point', exact: true }).click()
  await page.getByRole('button', { name: 'Draw or edit field', exact: true }).click()
}
async function add(page: Page, lat: string, lon: string) {
  await page.getByLabel('Vertex latitude', { exact: true }).fill(lat)
  await page.getByLabel('Vertex longitude', { exact: true }).fill(lon)
  await page.getByRole('button', { name: 'Add vertex', exact: true }).click()
}
async function climate(page: Page) {
  await page.goto('/#climate')
  await page.getByRole('button', { name: /Explore the Mantaro example/ }).click()
  await expect(page.getByLabel('NASA POWER weather results')).toBeVisible()
}
async function axe(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()
  expect(result.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target) }))).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
}

test('clicking or tapping point one closes and saves without a duplicate vertex', async ({ page }) => {
  await begin(page)
  await add(page, '-12.05', '-75.2'); await add(page, '-12.05', '-75.199'); await add(page, '-12.049', '-75.199')
  const first = page.locator('.close-outline-point')
  await expect(first).toHaveAttribute('title', 'Close and save field at point 1')
  await page.getByText('Field tools', { exact: true }).click()
  await first.click()
  await page.getByText('Field tools', { exact: true }).click()
  await expect(page.getByLabel('Saved field', { exact: true })).toContainText('3 vertices')
  await expect(page.getByLabel('Editable outline vertices')).toHaveCount(0)
  const ring = await page.evaluate(() => JSON.parse(localStorage.getItem('pacha-pulse.parcel.v1')!).feature.geometry.coordinates[0])
  expect(ring).toHaveLength(4); expect(ring[0]).toEqual(ring.at(-1))
  expect(new Set(ring.slice(0, -1).map((point: number[]) => point.join(','))).size).toBe(3)
})

test('Enter on first point closes a valid outline and rejects an intersecting ring', async ({ page }) => {
  await begin(page)
  await add(page, '-12.05', '-75.2'); await add(page, '-12.049', '-75.199'); await add(page, '-12.05', '-75.199'); await add(page, '-12.049', '-75.2')
  await page.getByText('Field tools', { exact: true }).click()
  await page.locator('.close-outline-point').focus(); await page.keyboard.press('Enter')
  await page.getByText('Field tools', { exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('cross')
  await expect(page.getByLabel('Saved field', { exact: true })).toHaveCount(0)
  await expect(page.getByLabel('Editable outline vertices').getByRole('listitem')).toHaveCount(4)
  await page.getByRole('button', { name: 'Remove point 4', exact: true }).click()
  await page.getByText('Field tools', { exact: true }).click()
  await page.locator('.close-outline-point').focus(); await page.keyboard.press('Enter')
  await page.getByText('Field tools', { exact: true }).click()
  await expect(page.getByLabel('Saved field', { exact: true })).toContainText('3 vertices')
})

test('first point before three corners does not close or add a duplicate', async ({ page }) => {
  await begin(page); await add(page, '-12.05', '-75.2'); await add(page, '-12.05', '-75.199')
  await page.getByText('Field tools', { exact: true }).click()
  await page.locator('.parcel-vertex-icon').first().click()
  await page.getByText('Field tools', { exact: true }).click()
  await expect(page.getByLabel('Editable outline vertices').getByRole('listitem')).toHaveCount(2)
  await expect(page.getByLabel('Saved field', { exact: true })).toHaveCount(0)
  await expect(page.locator('.map-announcement').last()).toContainText('at least three')
})

test('manual chart builder creates real weekly rainfall and temperature with exports', async ({ page }, info) => {
  await climate(page); await navigate(page, 'Charts')
  await page.getByRole('combobox', { name: 'Time grouping', exact: true }).selectOption('weekly')
  await page.getByRole('button', { name: 'Create chart', exact: true }).click()
  const rain = page.getByRole('article', { name: '7-day rainfall', exact: true })
  await expect(rain).toBeVisible(); await expect(rain).toContainText('NASA POWER')
  await rain.getByText('Exact values and limitations', { exact: true }).click()
  await expect(rain.getByRole('row')).toHaveCount(6)
  const download = page.waitForEvent('download'); await rain.getByRole('button', { name: 'Export values CSV', exact: true }).click()
  expect((await download).suggestedFilename()).toMatch(/\.csv$/)
  await page.getByRole('combobox', { name: 'What to show', exact: true }).selectOption('temperature')
  await page.getByRole('button', { name: 'Create chart', exact: true }).click()
  await expect(page.getByRole('article', { name: 'Daily mean temperature', exact: true })).toBeVisible()
  await axe(page)
  await page.screenshot({ path: `../docs/evidence/pacha-charts-${info.project.name}.png`, fullPage: true })
  await navigate(page, 'My field'); await page.getByLabel('Latitude', { exact: true }).fill('10'); await page.getByLabel('Longitude', { exact: true }).fill('20'); await page.getByRole('button', { name: 'Use location', exact: true }).click()
  await navigate(page, 'Charts'); await page.getByRole('button', { name: /7-day rainfall/ }).click(); await expect(rain).toContainText('-12.05, -75.2'); await expect(page.getByRole('button', { name: 'Create chart', exact: true })).toBeDisabled()
})

test('rotation charts use actual structural results and appear in exported report', async ({ page }) => {
  await page.goto('/#rotations'); await page.getByRole('button', { name: 'Edit Compare', exact: true }).click(); await page.getByRole('button', { name: 'Compare three rotations', exact: true }).click()
  await expect(page.getByLabel('Rotation comparison results')).toBeVisible(); await navigate(page, 'Charts')
  await page.getByRole('combobox', { name: 'What to show', exact: true }).selectOption('rotation_structure')
  await expect(page.getByRole('combobox', { name: 'Chart style', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Create chart', exact: true }).click()
  const chart = page.getByRole('article', { name: 'Crop rotation structure', exact: true }); await expect(chart).toBeVisible()
  await chart.getByText('Exact values and limitations', { exact: true }).click()
  await expect(chart.getByRole('row', { name: /Usual \/ reference/ }).getByRole('cell')).toHaveText(['1', '2', '0'])
  await axe(page)
  await navigate(page, 'Reports'); const event = page.waitForEvent('download'); await page.getByRole('button', { name: 'Keep my report', exact: true }).click()
  const result = await event; const file = await result.path(); const fs = await import('node:fs/promises'); const report = JSON.parse(await fs.readFile(file!, 'utf8'))
  expect(report.charts[0].title).toBe('Crop rotation structure')
})

test('synthetic agent transport displays a server-built chart and team rabbit skin', async ({ page }, info) => {
  await climate(page)
  // Real server arithmetic; only the Gemini conversation envelope is a synthetic fixture.
  const artifact = await (await page.request.post('/api/v1/assistant/charts', { data: { spec: { metric: 'rainfall', chart_type: 'bar', aggregation: 'weekly' }, climate: { lat: -12.05, lon: -75.2, start: '2025-01-01', end: '2025-01-31', saved_example: true } } })).json()
  await page.route('**/api/v1/assistant/status', (route) => route.fulfill({ json: { configured: true } }))
  await page.route('**/api/v1/assistant/chat', (route) => route.fulfill({ json: { message: 'Your historical rainfall chart is ready. Each bar groups up to seven days.', proposals: [], next_question: null, provider: 'gemini', model: 'synthetic-agent-browser-fixture', evidence: 'verified_climate', tool_steps: ['Checked current field and verified evidence', 'Prepared 7-day rainfall'], charts: [artifact] } }))
  await page.getByRole('button', { name: 'Ask Pacha', exact: true }).click()
  await page.getByRole('button', { name: 'Make a chart', exact: true }).click()
  await expect(page.getByText('Your chart is ready', { exact: true })).toBeVisible()
  await expect(page.locator('.agent-chart-receipt [data-character="team-rabbit"]')).toBeVisible()
  await page.getByText('Steps Pacha completed', { exact: true }).click(); await expect(page.getByRole('dialog')).toContainText('Prepared 7-day rainfall')
  await axe(page)
  await page.screenshot({ path: `../docs/evidence/pacha-agent-rabbit-${info.project.name}.png`, fullPage: true })
  await page.getByRole('button', { name: 'Open prepared charts', exact: true }).click()
  await expect(page.getByRole('article', { name: '7-day rainfall', exact: true })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('manual chart builder explains missing data and prepares a request for the agent', async ({ page }) => {
  await page.goto('/#charts'); await expect(page.getByRole('button', { name: 'Create chart', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Ask Pacha to make a chart', exact: true }).click()
  await expect(page.getByLabel('Message Pacha', { exact: true })).toHaveValue(/Please create a daily bar chart of rainfall/)
  await page.getByRole('button', { name: 'Close companion', exact: true }).click()
  await page.setViewportSize({ width: 320, height: 740 }); await axe(page)
})
