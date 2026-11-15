import { useEffect, useRef, useState } from 'react'
import { requestJson } from '../../services/api'

type Budget = {status:string;total_cost:{value:number;unit:string};gross_revenue:{value:number;unit:string};net_margin:{value:number;unit:string};break_even_yield_t_ha:{value:number|null;unit:string};limitations:string[]}
export default function LocalBudget({area}: {area:number|null}) {
  const [cost,setCost]=useState(''), [yieldValue,setYield]=useState(''),[price,setPrice]=useState(''),[currency,setCurrency]=useState('USD'),[manualArea,setArea]=useState('')
  const [result,setResult]=useState<Budget|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false)
  const request=useRef<AbortController|null>(null)
  const selectedArea=area??Number(manualArea)
  useEffect(()=>{request.current?.abort();setResult(null);setError('');setBusy(false);return()=>request.current?.abort()},[selectedArea,cost,yieldValue,price,currency])
  async function calculate() {
    if (![cost,yieldValue,price].every(v=>v.trim()&&Number.isFinite(Number(v))&&Number(v)>=0)||!selectedArea||selectedArea<0) {setError('Enter your area, costs, expected harvest and selling price. Zero is allowed for costs, harvest and price.');return}
    request.current?.abort();const controller=new AbortController();request.current=controller;setBusy(true);setError('')
    try {const response=await requestJson<Budget>('/planning/budget',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({area_ha:selectedArea,cost_per_ha:Number(cost),expected_yield_t_ha:Number(yieldValue),price_per_ton:Number(price),currency}),signal:controller.signal});if(!controller.signal.aborted)setResult(response)}
    catch(caught){if(!controller.signal.aborted)setError(caught instanceof Error?caught.message:'Budget could not be calculated.')}
    finally{if(!controller.signal.aborted)setBusy(false)}
  }
  return <details className="local-budget"><summary>My local costs &amp; harvest estimate (user input)</summary><p>Try your own numbers. This is a budget scenario; the expected harvest comes from you.</p><div className="budget-fields">{area!==null?<p>Selected area: <strong>{area.toFixed(3)} ha</strong></p>:<label>Budget area (ha)<input type="number" min="0.0001" step="any" value={manualArea} onChange={e=>setArea(e.target.value)}/></label>}<label>Currency<select value={currency} onChange={e=>setCurrency(e.target.value)}>{['USD','PEN','EUR','COP','BRL','MXN'].map(c=><option key={c}>{c}</option>)}</select></label><label>Costs per hectare<input type="number" min="0" step="any" value={cost} onChange={e=>setCost(e.target.value)}/></label><label>Expected harvest (t/ha)<input type="number" min="0" step="any" value={yieldValue} onChange={e=>setYield(e.target.value)}/></label><label>Selling price per tonne<input type="number" min="0" step="any" value={price} onChange={e=>setPrice(e.target.value)}/></label></div><button className="secondary-button" disabled={busy} onClick={()=>void calculate()}>{busy?'Calculating…':'Calculate my budget'}</button>{error&&<p className="field-error" role="alert">{error}</p>}{result&&<div role="status" className="budget-result"><h3>What your assumptions give</h3><dl>{(['total_cost','gross_revenue','net_margin','break_even_yield_t_ha'] as const).map(name=><div key={name}><dt>{name.replaceAll('_',' ')}</dt><dd>{result[name].value===null?'Unavailable':result[name].value?.toLocaleString('en',{maximumFractionDigits:2})} {result[name].value!==null&&result[name].unit}</dd></div>)}</dl><p>Scenario from your inputs. No yield forecast or guaranteed profit.</p></div>}</details>
}
