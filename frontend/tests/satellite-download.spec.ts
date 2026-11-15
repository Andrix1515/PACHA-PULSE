import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

// Synthetic transport fixtures, deliberately separate from real NASA evidence.
const job = { id: 77, status: 'queued', requested_at: '2026-11-15T12:00:00Z', finished_at: null, error: null, completed_batches: 0, total_batches: 2 }
const row = { date: '2023-01-01', period_end: '2023-01-16', ndvi: .42, evi: .26, pixel_reliability: 0, quality: 'good', retrieved_at: '2026-11-15', request_url: 'https://synthetic.invalid/test-only' }
function response(status = 'queued', completed = 0) {
  return { lat: -12.0465, lon: -75.1958, start: '2023-01-01', end: '2025-12-31', source: 'Synthetic transport fixture', status: completed ? 'observed' : 'unavailable', delivery: 'test-only', spatial_resolution: 'Synthetic', retrieved_at: null, quality: 'partial', limitations: ['Synthetic transport test, not NASA observations.'], data: completed ? [row] : [], summary: { ndvi_mean: completed ? .42 : null, ndvi_min: null, ndvi_max: null, valid_composites_count: completed ? 1 : 0, cloudy_composites_count: 0 }, ingestion_job: { ...job, status, completed_batches: completed } }
}
async function open(page: Page) {
  await page.addInitScript(() => sessionStorage.setItem('pacha-pulse.journey.v1', JSON.stringify({ version: 1, role: 'grower', scene: 'climate', profile: { name: 'Download test', crop: 'Maize', areaHa: 2, soil: 'unknown', water: 'rainfed', previousRotation: '' }, location: { lat: -12.0465, lon: -75.1958, source: 'manual' }, guided: true, paused: true, profileDone: true })))
  await page.route('**/ml/predict-ndvi', r => r.fulfill({ json: { status: 'model_unavailable_for_region', reason: 'No validated model for this test point.', limitations: [] } }))
  await page.route('**/monitoring/analyze', r => r.fulfill({ json: { status: 'unavailable', metrics: {}, coverage: { expected_weather_days: 1096, available_weather_days: 0, complete_weather_days: 0 }, limitations: [] } }))
  await page.goto('/#climate')
  await page.getByRole('button', { name: 'Satellite greenness', exact: true }).click()
}

test('multi-year NASA request queues once, polls saved progress and keeps controls usable', async ({ page }, info) => {
  let posts = 0, reads = 0, done = false
  await page.route('**/observations/vegetation/sync', async route => {
    posts++
    expect(route.request().postDataJSON()).toEqual({ lat: -12.0465, lon: -75.1958, start: '2023-01-01', end: '2025-12-31' })
    await route.fulfill({ status: 202, json: response() })
  })
  await page.route('**/observations/vegetation?*', route => {
    reads++
    expect(new URL(route.request().url()).searchParams.get('refresh')).toBe('false')
    return route.fulfill({ json: response(done ? 'complete' : 'running', done ? 2 : 1) })
  })
  await open(page)
  expect(posts + reads).toBe(0)
  await page.getByLabel('Check NASA for this period', { exact: true }).check()
  await page.getByRole('button', { name: 'Check NASA & read history', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Your download is in line' })).toBeVisible()
  await expect(page.getByRole('progressbar')).toHaveAttribute('value', '1', { timeout: 10000 })
  await expect(page.getByRole('heading', { name: 'Greenness: 0.42' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Stop checking for now' })).toBeEnabled()
  const violations = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  expect(violations.violations.map(v => v.id)).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  done = true
  await expect(page.getByRole('heading', { name: 'NASA check finished' })).toBeVisible({ timeout: 10000 })
  await expect(page.getByRole('heading', { name: 'A cautious look ahead' })).toBeVisible()
  expect(posts).toBe(1)
  await page.screenshot({ path: `../docs/evidence/satellite-download-${info.project.name}.png`, fullPage: true })
})

test('failed download explains saved progress and allows an explicit retry', async ({ page }) => {
  let posts = 0
  await page.route('**/observations/vegetation/sync', route => {
    posts++
    return route.fulfill({ status: 202, json: { ...response(posts === 1 ? 'partial' : 'complete', posts === 1 ? 1 : 2), ingestion_job: { ...job, status: posts === 1 ? 'partial' : 'complete', completed_batches: posts === 1 ? 1 : 2, error: posts === 1 ? 'Synthetic TimeoutError' : null } } })
  })
  await open(page)
  await page.getByLabel('Check NASA for this period', { exact: true }).check()
  await page.getByRole('button', { name: 'Check NASA & read history', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'NASA download paused' })).toBeVisible()
  await expect(page.getByText(/Saved readings are safe/)).toBeVisible()
  await expect(page.getByText('Synthetic TimeoutError', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Check NASA & read history', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'NASA check finished' })).toBeVisible()
  expect(posts).toBe(2)
})

test('changing dates ignores a late response and stopping polling does not cancel the job', async ({ page }) => {
  let reads = 0, lateFinished = false
  await page.route('**/observations/vegetation/sync', route => route.fulfill({ status: 202, json: response() }))
  await page.route('**/observations/vegetation?*', async route => {
    reads++
    await new Promise(resolve => setTimeout(resolve, 1200))
    await route.fulfill({ json: response('complete', 2) }).catch(() => {})
    lateFinished = true
  })
  await open(page)
  await page.getByLabel('Check NASA for this period', { exact: true }).check()
  await page.getByRole('button', { name: 'Check NASA & read history', exact: true }).click()
  await page.getByRole('button', { name: 'Stop checking for now' }).click()
  await expect(page.getByRole('heading', { name: 'Your download is in line' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Check NASA & read history', exact: true })).toBeEnabled()
  expect(reads).toBe(0)
  await page.getByRole('button', { name: 'Check NASA & read history', exact: true }).click()
  await expect.poll(() => reads, { timeout: 10000 }).toBe(1)
  await page.getByLabel('Satellite end date', { exact: true }).fill('2024-12-31')
  await expect.poll(() => lateFinished).toBe(true)
  await expect(page.getByRole('heading', { name: 'NASA check finished' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Greenness: 0.42' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Check NASA & read history', exact: true })).toBeEnabled()
})

test('network errors show a useful message instead of a raw timeout', async ({ page }) => {
  await page.route('**/observations/vegetation/sync', route => route.abort('timedout'))
  await open(page)
  await page.getByLabel('Check NASA for this period', { exact: true }).check()
  await page.getByRole('button', { name: 'Check NASA & read history', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Any queued download continues in the data worker')
  await expect(page.getByRole('alert')).not.toContainText('signal timed out')
})
