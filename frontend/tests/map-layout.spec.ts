import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('map context flows without overlapping terrain, search, actions or bottom controls', async ({page},info) => {
  test.setTimeout(60000)
  await page.addInitScript(() => sessionStorage.setItem('pacha-pulse.journey.v1',JSON.stringify({version:1,role:'grower',scene:'field',profile:{name:'Layout check',crop:'Maize',areaHa:null,soil:'unknown',water:'rainfed',previousRotation:''},location:{lat:-12.05,lon:-75.2,source:'manual'},guided:true,paused:true,profileDone:true})))
  const sizes=info.project.name==='desktop'?[{width:942,height:665},{width:1280,height:720}]:[{width:393,height:851},{width:320,height:740}]
  for (const size of sizes) {
    await page.setViewportSize(size)
    await page.goto('/#field')
    await page.reload()
    await expect(page.getByRole('heading',{name:'Find your field.',exact:true})).toBeVisible()
    await expect(page.locator('.map-context-stack')).toHaveAttribute('style',/max-height/)
    const search=await page.locator('.place-search').boundingBox(),actions=await page.locator('.field-quick-tools').boundingBox(),terrain=await page.locator('.field-terrain-glance').boundingBox()
    expect(search&&actions&&terrain).toBeTruthy()
    expect(search!.y+search!.height).toBeLessThanOrEqual(actions!.y)
    expect(actions!.y+actions!.height).toBeLessThanOrEqual(terrain!.y)
    await page.getByText('Terrain summary',{exact:true}).click()
    await expect(page.getByRole('button',{name:'Check terrain',exact:true})).toBeVisible()
    const stack=await page.locator('.map-context-stack').boundingBox(),drawer=await page.locator('.field-tools-drawer').boundingBox(),bar=await page.locator('.field-confirm-bar').boundingBox()
    expect(stack!.y+stack!.height).toBeLessThanOrEqual(drawer!.y)
    expect(stack!.y+stack!.height).toBeLessThanOrEqual(bar!.y)
    const overlaps=(a:{x:number;y:number;width:number;height:number},b:{x:number;y:number;width:number;height:number})=>Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y))
    const bubble=await page.locator('.pacha-story-bubble').boundingBox(),actor=await page.locator('.pacha-stage-character').boundingBox()
    for(const selector of ['.leaflet-control-zoom','.leaflet-control-scale']) {
      const control=await page.locator(selector).boundingBox()
      expect(overlaps(control!,bubble!)).toBe(0)
      expect(overlaps(control!,actor!)).toBe(0)
      expect(overlaps(control!,drawer!)).toBe(0)
    }

    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
    const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()
    expect(result.violations.map(({id,nodes})=>({id,targets:nodes.map(n=>n.target)}))).toEqual([])
    await page.screenshot({path:`../docs/evidence/map-context-${size.width}.png`})
    await page.getByText('Terrain summary',{exact:true}).click()
    await page.getByRole('button',{name:'Draw my field',exact:true}).click()
    await expect(page.locator('.field-terrain-glance')).toHaveCount(0)
    await expect(page.getByRole('button',{name:'Pause drawing',exact:true})).toBeVisible()
  }
})
