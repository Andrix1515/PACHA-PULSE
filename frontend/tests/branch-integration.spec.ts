import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import type { Crop } from '../src/types'

// Transport fixtures are synthetic, never represented as a live provider verification.
const provenance = { source: 'Synthetic integration transport fixture', provider_id: 'synthetic', retrieved_at: '2026-11-15T12:00:00Z', spatial_resolution: 'Synthetic test grid', data_quality: 'modeled', status: 'derived', limitations: ['Not real field measurements.'] }
const climateFixture = {
  lat: -12.05, lon: -75.2, start: '2025-01-01', end: '2025-01-01',
  source: 'NASA POWER · MERRA-2', request_url: 'https://power.larc.nasa.gov/api/temporal/daily/point?fixture=true',
  product_version: 'test-fixture', retrieved_at: '2026-11-15T12:00:00Z',
  spatial_resolution: 'Synthetic grid fixture; not a live observation', limitations: ['Synthetic browser fixture only.'],
  status: 'observed', quality: 'complete', delivery: 'saved_observation',
  variables: Object.fromEntries(['T2M', 'T2M_MIN', 'T2M_MAX', 'PRECTOTCORR'].map((name) => [name, { unit: name === 'PRECTOTCORR' ? 'mm/day' : '°C', source: 'Synthetic fixture', status: 'observed', missing_value: null }])),
  data: [{ date: '2025-01-01', T2M: 8.5, T2M_MIN: 2, T2M_MAX: 14, PRECTOTCORR: 15.25 }],
  summary: {
    temperature_mean: { value: 8.5, unit: '°C', status: 'derived', source: 'Synthetic fixture', observed_at: '2025-01-01', retrieved_at: '2026-11-15T12:00:00Z', spatial_resolution: 'Synthetic grid', quality: 'complete', limitations: ['Synthetic browser fixture only.'] },
    rainfall_total: { value: 15.25, unit: 'mm', status: 'derived', source: 'Synthetic fixture', observed_at: '2025-01-01', retrieved_at: '2026-11-15T12:00:00Z', spatial_resolution: 'Synthetic grid', quality: 'complete', limitations: ['Synthetic browser fixture only.'] },
  },
}
async function seed(page: Page) {
  await page.addInitScript(() => sessionStorage.setItem('pacha-pulse.journey.v1', JSON.stringify({ version: 1, scene: 'field', role: 'grower', profile: { name: 'Integration field', crop: 'Maize', areaHa: null, soil: 'unknown', water: 'rainfed', previousRotation: '' }, location: { lat: -12.05, lon: -75.2, source: 'manual' }, guided: true, paused: true, profileDone: true })))
}
async function navigate(page: Page, name: string) {
  await page.getByRole('button', { name: 'Open journey menu' }).click()
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name, exact: true }).click()
}
async function accessible(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()
  expect(result.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target) }))).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
}

test('main terrain and soil contracts reach guided scenes, layer selection preserves the polygon, point changes clear evidence', async ({ page }, info) => {
  await seed(page)
  const terrainRequests: URL[] = [], soilRequests: URL[] = []
  await page.route('**/api/v1/location/terrain?**', (route) => { terrainRequests.push(new URL(route.request().url())); return route.fulfill({ json: { lat:-12.05, lon:-75.2, elevation_m:0, elevation_min_m:0, elevation_max_m:5, relief_m:5, slope_percent:0, slope_degrees:0, aspect:'flat', dem_source:'Synthetic DEM', provenance, warnings:['Synthetic terrain fixture.'] } }) })
  await page.route('**/api/v1/observations/soil?**', (route) => { soilRequests.push(new URL(route.request().url())); return route.fulfill({ json: { lat:-12.05, lon:-75.2, ph_h2o:{ name:'phh2o', description:'Synthetic pH', unit:'pH', profile_mean:6.5, status:'derived', layers:[{depth_range:'0-5cm', mean_value:6.5, unit:'pH', status:'derived'}] }, soil_organic_carbon:{name:'soc', description:'Synthetic missing carbon', unit:'%', profile_mean:null, layers:[],status:'unavailable'}, soil_texture_class:'unknown', provenance, warnings:['Synthetic soil fixture.'] } }) })
  await page.goto('/#field')
  await expect(page.locator('.field-terrain-glance')).toContainText('Not checked')
  await page.getByText('Field tools', { exact:true }).click()
  const ring = [[-75.2,-12.05],[-75.199,-12.05],[-75.199,-12.049],[-75.2,-12.05]]
  await page.getByLabel('Import field GeoJSON', { exact:true }).setInputFiles({name:'integration.geojson',mimeType:'application/geo+json',buffer:Buffer.from(JSON.stringify({type:'Polygon',coordinates:[ring]}))})
  await page.getByRole('button', {name:'Close and save field',exact:true}).click()
  await page.getByRole('combobox',{name:'Map layer',exact:true}).selectOption('satellite')
  await expect(page.locator('.leaflet-control-attribution')).toContainText('Esri')
  await page.getByRole('combobox',{name:'Map layer',exact:true}).selectOption('terrain')
  await expect(page.locator('.leaflet-control-attribution')).toContainText('OpenTopoMap')
  expect(terrainRequests).toHaveLength(0); expect(soilRequests).toHaveLength(0)
  const saved = await page.evaluate(() => localStorage.getItem('pacha-pulse.parcel.v1'))
  await page.getByRole('button', {name:'Soil & terrain',exact:true}).click()
  await page.getByRole('button', {name:'Terrain',exact:true}).click()
  await page.getByRole('button', {name:'Read terrain data',exact:true}).click()
  await expect(page.getByRole('heading', {name:'Terrain around your field'})).toBeVisible()
  expect(terrainRequests).toHaveLength(1)
  expect(terrainRequests[0].searchParams.get('polygon_lats')).toBe('-12.05,-12.05,-12.049')
  expect(terrainRequests[0].searchParams.get('polygon_lons')).toBe('-75.2,-75.199,-75.199')
  await expect(page.locator('.evidence-key-metrics')).toContainText('0 m')
  await expect(page.locator('.evidence-key-metrics')).toContainText('0 %')
  await page.getByRole('button', {name:'Soil profile',exact:true}).click()
  await page.getByRole('button', {name:'Read soil estimates',exact:true}).click()
  await expect(page.getByRole('heading', {name:'Soil model estimates'})).toBeVisible()
  expect(soilRequests).toHaveLength(1)
  await page.getByText('Properties, depth layers and provider warnings', {exact:true}).click()
  await expect(page.getByRole('row', {name:/Organic carbon/})).toContainText('Unavailable')
  await expect(page.locator('.evidence-source')).toContainText(provenance.source)
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('pacha-pulse.journey.v1')!).profile.soil)).toBe('unknown')
  await accessible(page)
  await page.screenshot({path:`../docs/evidence/integration-soil-${info.project.name}.png`,fullPage:true})
  await navigate(page,'Find my field')
  await expect(page.locator('.field-terrain-glance')).toContainText('0 m')
  await expect(page.locator('.field-terrain-glance')).toContainText('0.0%')
  await page.getByText('Field tools', { exact:true }).click()
  await page.getByRole('button', {name:'See terrain details',exact:true}).click()
  await expect(page.locator('.journey-shell')).toHaveAttribute('data-scene','evidence')
  await expect(page.getByRole('button',{name:'Terrain',exact:true})).toHaveAttribute('aria-pressed','true')
  await navigate(page,'Find my field')
  if (await page.locator('.field-tools-drawer').getAttribute('open') === null) await page.getByText('Field tools', {exact:true}).click()
  await page.getByLabel('Latitude',{exact:true}).fill('42.03')
  await page.getByLabel('Longitude',{exact:true}).fill('-93.64')
  await page.getByRole('button',{name:'Use location',exact:true}).click()
  await page.getByText('Field tools', {exact:true}).click()
  await navigate(page,'Check soil & terrain')
  await expect(page.getByRole('heading',{name:'Soil model estimates'})).toHaveCount(0)
  await page.getByRole('button',{name:'Soil profile',exact:true}).click()
  await expect(page.getByRole('button',{name:'Read soil estimates',exact:true})).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('pacha-pulse.parcel.v1'))).toBe(saved)
})

test('main catalogue, crop comparison and scenario API work through our guided visual flow', async ({ page }, info) => {
  await seed(page)
  const response = await page.request.get('/api/v1/crops')
  expect(response.ok()).toBeTruthy()
  const crops = await response.json() as Crop[]
  const selectedCrops = ['maize','soybean'].map((id) => crops.find((crop) => crop.id === id)!)
  expect(selectedCrops.every(Boolean)).toBe(true)
  let screening: URL | null = null
  await page.route('**/api/v1/crops/candidates?**',(route) => { screening = new URL(route.request().url()); return route.fulfill({json:selectedCrops.map((crop) => ({crop,suitability_category:'insufficient_data',overall_score:0,confidence_level:'exploratory',limiting_factors:['Synthetic integration assessment, not live evidence.'],advantages:[],evidence:[],data_gaps:['Field soil test and climate period']}))}) })
  await page.goto('/#crops')
  await expect(page.getByRole('combobox',{name:'Explore one crop',exact:true}).locator('option')).toHaveCount(crops.length)
  await page.getByRole('button',{name:'Check crop options for my point',exact:true}).click()
  await expect(page.locator('.candidate-assessment')).toContainText('More evidence needed')
  await expect(page.locator('.candidate-option-card')).toHaveCount(crops.length)
  await expect(page.locator('.candidate-option-card').filter({ hasText: 'Maize' })).toContainText('Heuristic screening index: 0/100')
  expect(screening!.searchParams.get('lat')).toBe('-12.05')
  expect(screening!.searchParams.get('water')).toBe('rainfed')
  expect(screening!.searchParams.has('start')).toBe(false)
  await page.getByLabel('Compare this crop',{exact:true}).check()
  await page.getByRole('combobox',{name:'Explore one crop',exact:true}).selectOption('soybean')
  await page.getByLabel('Compare this crop',{exact:true}).check()
  await page.getByRole('button',{name:'Compare selected crops (2/3)',exact:true}).click()
  await expect(page.getByText('Catalogue comparison results',{exact:true})).toBeVisible()
  await expect(page.locator('.candidate-compare h3')).toHaveCount(2)
  await accessible(page)
  await page.screenshot({path:`../docs/evidence/integration-crops-${info.project.name}.png`,fullPage:true})
  await page.getByRole('button',{name:'Try in Alternative A',exact:true}).click()
  await expect(page.getByRole('combobox',{name:'Alternative A, campaign 1',exact:true})).toHaveValue('soybean')
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('pacha-pulse.journey.v1')!).profile.crop)).toBe('Maize')
  await page.locator('.rotation-question').getByRole('button',{name:'Back',exact:true}).click()
  await page.getByRole('checkbox',{name:'I confirm the first sequence reflects my usual rotation.'}).check()
  await page.getByRole('button',{name:'Next: alternative A',exact:true}).click()
  await page.getByRole('button',{name:'Next: alternative B',exact:true}).click()
  await page.getByRole('button',{name:'Let us compare',exact:true}).click()
  await page.getByText('Temperature and calendar assumptions',{exact:true}).click()
  await page.getByLabel('Temperature change (degrees C)',{exact:true}).fill('2')
  await page.getByRole('combobox',{name:'First campaign month',exact:true}).selectOption('10')
  await page.getByRole('combobox',{name:'Calendar hemisphere',exact:true}).selectOption('southern')
  const sent = page.waitForRequest((request) => request.url().endsWith('/rotations/compare') && request.method() === 'POST')
  await page.getByRole('button',{name:'Compare three rotations',exact:true}).click()
  expect((await sent).postDataJSON()).toMatchObject({temperature_delta_c:2,start_month:10,hemisphere:'southern',water:'rainfed'})
  await page.getByText('Rule-based sequence review',{exact:true}).click()
  await expect(page.getByRole('region',{name:'Campaign calendar for Usual / reference'})).toBeVisible()
  await expect(page.getByText('Calendar review',{exact:true})).toBeVisible()
  await accessible(page)
  await page.screenshot({path:`../docs/evidence/integration-calendar-${info.project.name}.png`,fullPage:true})
})

test('climate evidence tab shows provenance and opens the complete NASA climate scene', async ({ page }) => {
  await seed(page)
  await page.route('**/api/v1/observations/climate/demo', (route) => route.fulfill({ json: climateFixture }))
  await page.goto('/#evidence')
  await page.getByRole('button', { name: 'Climate', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'No historical series loaded' })).toBeVisible()
  await page.getByRole('button', { name: 'Choose dates and load NASA climate', exact: true }).click()
  await expect(page.locator('.journey-shell')).toHaveAttribute('data-scene', 'climate')
  await page.getByRole('button', { name: /Explore the Mantaro example/ }).click()
  await expect(page.getByLabel('NASA POWER weather results')).toContainText('15.3')
  await navigate(page, 'Check soil & terrain')
  await page.getByRole('button', { name: 'Climate', exact: true }).click()
  await expect(page.locator('.evidence-key-metrics')).toContainText('15.25 mm')
  await expect(page.locator('.evidence-key-metrics')).toContainText('8.5 °C')
  await expect(page.locator('.evidence-result')).toContainText('NASA POWER · MERRA-2')
  await expect(page.locator('.evidence-result')).toContainText('Synthetic browser fixture only.')
  await expect(page.getByRole('link', { name: 'View the original NASA POWER request' })).toHaveAttribute('href', /power\.larc\.nasa\.gov/)
  await accessible(page)
})

test('soil failure remains explicit and leaves other scenes usable',async ({page}) => {
  await seed(page)
  await page.route('**/api/v1/observations/soil?**',(route) => route.fulfill({status:502,json:{error:{code:'synthetic_unavailable',message:'Synthetic provider outage. Retry later.'}}}))
  await page.goto('/#evidence')
  await page.getByRole('button',{name:'Soil profile',exact:true}).click()
  await page.getByRole('button',{name:'Read soil estimates',exact:true}).click()
  await expect(page.getByRole('alert')).toContainText('Synthetic provider outage')
  await expect(page.getByRole('heading',{name:'Soil model estimates'})).toHaveCount(0)
  await navigate(page,'Explore crops')
  await expect(page.getByRole('heading',{name:'Explore your planting options.'})).toBeVisible()
})
