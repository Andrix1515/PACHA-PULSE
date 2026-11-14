import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('página del proyecto y entrada real a la demo', async ({ page }, testInfo) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('mejor perspectiva')
  await expect(page.getByRole('link', { name: 'Explorar la demo' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  expect(axe.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target) }))).toEqual([])
  await page.screenshot({ path: `../docs/evidence/project-${testInfo.project.name}.png`, fullPage: true })
  await page.getByRole('link', { name: 'Explorar la demo' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Conoce mejor tu campo.')
  await page.getByRole('link', { name: 'Volver a la página del proyecto' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('mejor perspectiva')
})
