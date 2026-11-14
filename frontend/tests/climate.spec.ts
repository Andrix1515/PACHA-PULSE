import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('NASA auténtica guardada: gráfico, procedencia, tabla y cambio de ubicación', async ({ page }, testInfo) => {
  await page.goto('/#demo')
  await page.getByRole('button', { name: 'Abrir ejemplo real:' }).click()
  const results = page.getByLabel('Resultados de clima NASA POWER')
  await expect(results).toBeVisible()
  await expect(results).toContainText('2025-01-01 a 2025-01-31')
  await expect(results).toContainText('Observación guardada auténtica')
  await expect(results).toContainText('NASA POWER · MERRA-2')
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  expect(axe.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target) }))).toEqual([])
  await page.screenshot({ path: `../docs/evidence/climate-${testInfo.project.name}.png`, fullPage: true })
  await page.getByRole('button', { name: 'Ver tabla de observaciones' }).click()
  await expect(page.getByRole('cell', { name: '8.76', exact: true })).toBeVisible()
  await expect(page.getByRole('rowheader', { name: '2025-01-31' })).toBeVisible()
  await page.getByLabel('Latitud', { exact: true }).fill('-33')
  await page.getByLabel('Longitud', { exact: true }).fill('-70')
  await page.getByRole('button', { name: 'Usar ubicación' }).click()
  await expect(results).toHaveCount(0)
})

test('error POWER explícito conserva acceso al ejemplo guardado', async ({ page }) => {
  await page.route('**/api/v1/observations/climate?*', (route) => route.fulfill({ status: 502, json: { error: { code: 'power_unavailable', message: 'NASA POWER no respondió a tiempo.' } } }))
  await page.goto('/#demo')
  await page.getByLabel('Latitud', { exact: true }).fill('40')
  await page.getByLabel('Longitud', { exact: true }).fill('-3')
  await page.getByRole('button', { name: 'Usar ubicación' }).click()
  await page.getByRole('button', { name: 'Consultar NASA POWER' }).click()
  await expect(page.getByRole('alert')).toContainText('NASA POWER no respondió')
  await page.getByRole('button', { name: 'Abrir ejemplo real:' }).click()
  await expect(page.getByLabel('Resultados de clima NASA POWER')).toBeVisible()
})
