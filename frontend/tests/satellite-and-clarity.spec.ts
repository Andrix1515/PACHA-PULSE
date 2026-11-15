import {test,expect} from '@playwright/test'
import type {Page} from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

async function seed(page:Page,role='grower') {
  await page.addInitScript((role)=>sessionStorage.setItem('pacha-pulse.journey.v1',JSON.stringify({version:1,role,scene:'climate',profile:{name:'Satellite verification',crop:'Maize',areaHa:2,soil:'unknown',water:'rainfed',previousRotation:''},location:{lat:-12.05,lon:-75.2,source:'manual'},guided:true,paused:true,profileDone:true})),role)
}
async function accessible(page:Page) {
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()
  expect(result.violations.map(({id,nodes})=>({id,targets:nodes.map(n=>n.target)}))).toEqual([])
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
}

test('actual archived MODIS history, missing values and model status are readable in grower mode',async({page},info)=>{
  await seed(page)
  const errors:string[]=[];page.on('console',message=>{if(message.type()==='error'&&/Maximum update depth/.test(message.text()))errors.push(message.text())})
  await page.goto('/#climate')
  await page.getByRole('button',{name:'Satellite greenness',exact:true}).click()
  await expect(page.getByRole('heading',{level:1})).toHaveText(/How green was/)
  const response=page.waitForResponse(r=>r.url().includes('/observations/vegetation?'))
  await page.getByRole('button',{name:'Read canopy history',exact:true}).click()
  const body=await (await response).json()
  expect(body.source).toContain('NASA MODIS')
  expect(body.data).toHaveLength(69)
  await expect(page.getByRole('heading',{name:/Greenness:/})).toBeVisible()
  await expect(page.getByRole('heading',{name:'A cautious look ahead'})).toBeVisible()
  await page.getByText('Satellite source, quality and exact readings',{exact:true}).click()
  await expect(page.getByRole('region',{name:'MODIS exact readings'}).locator('tbody tr')).toHaveCount(69)
  await accessible(page)
  await page.screenshot({path:`../docs/evidence/satellite-grower-${info.project.name}.png`,fullPage:true})
  expect(errors).toEqual([])
})

test('agronomist mode exposes validation and observed QA without requiring Gemini',async({page},info)=>{
  await seed(page,'agronomist')
  await page.goto('/#climate')
  await page.getByRole('button',{name:'Satellite greenness',exact:true}).click()
  await page.getByRole('button',{name:'Read canopy history',exact:true}).click()
  await expect(page.getByRole('region',{name:'MODIS exact readings'})).toBeVisible()
  await expect(page.getByText('Model validation and update status',{exact:true})).toBeVisible()
  await accessible(page)
  await page.screenshot({path:`../docs/evidence/satellite-agronomist-${info.project.name}.png`,fullPage:true})
})

test('3D plan stays stable, controls have space, and local budget uses selected hectares',async({page},info)=>{
  await seed(page)
  const errors:string[]=[];page.on('console',m=>{if(/Maximum update depth/.test(m.text()))errors.push(m.text())})
  await page.goto('/#field')
  await page.getByText('Field tools',{exact:true}).click()
  await page.getByLabel('Import field GeoJSON',{exact:true}).setInputFiles({name:'plan.geojson',mimeType:'application/geo+json',buffer:Buffer.from(JSON.stringify({type:'Polygon',coordinates:[[[-75.2,-12.05],[-75.199,-12.05],[-75.199,-12.049],[-75.2,-12.049],[-75.2,-12.05]]]}))})
  await page.getByRole('button',{name:'Close and save field',exact:true}).click()
  await page.getByText('Field tools',{exact:true}).click()
  await page.getByRole('button',{name:'Explore in 3D',exact:true}).click()
  await expect(page.locator('.field-canvas')).toHaveAttribute('data-renderer',/webgl|svg/)
  await page.getByText('My local costs & harvest estimate (user input)',{exact:true}).click()
  await page.getByLabel('Costs per hectare',{exact:true}).fill('1000')
  await page.getByLabel('Expected harvest (t/ha)',{exact:true}).fill('3')
  await page.getByLabel('Selling price per tonne',{exact:true}).fill('500')
  const sent=page.waitForRequest(r=>r.url().endsWith('/planning/budget'))
  await page.getByRole('button',{name:'Calculate my budget',exact:true}).click()
  const body=(await sent).postDataJSON()
  expect(body.area_ha).toBeGreaterThan(0)
  await expect(page.locator('.budget-result')).toContainText('Scenario from your inputs')
  await accessible(page)
  const canvas=await page.locator('.field-canvas').boundingBox(),controls=await page.locator('.explorer-options').boundingBox()
  expect(canvas&&controls).toBeTruthy()
  const overlap=canvas&&controls&&Math.max(0,Math.min(canvas.x+canvas.width,controls.x+controls.width)-Math.max(canvas.x,controls.x))*Math.max(0,Math.min(canvas.y+canvas.height,controls.y+controls.height)-Math.max(canvas.y,controls.y))
  expect(overlap).toBe(0)
  await page.screenshot({path:`../docs/evidence/clear-simulator-${info.project.name}.png`,fullPage:true})
  expect(errors).toEqual([])
})
