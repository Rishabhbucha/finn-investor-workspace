'use client';
import {useState} from 'react';
import {compileIndicator} from '../lib/watch-indicators.mjs';

import {intervals,type Interval} from './candle-movement';
export type Rule={id:string;name:string;scope:string;frame:'day'|Interval;source:string;levels?:string[];thresholds?:string[];direction?:string;enabled:boolean};
const storage='finn.watch-indicators.v1';
export const defaults:Rule[]=(['day','15m'] as const).map(frame=>({
  id:frame,name:frame==='day'?'Daily ±3%':'15 min ±3%',scope:'*',frame,
  source:'math.abs('+(frame==='day'?'dayPct':'candlePct')+') >= 3',enabled:true
}));
export function readRules():Rule[]{
  try{
    const saved=JSON.parse(localStorage.getItem(storage)||'null');
    if(Array.isArray(saved)&&saved.length<=20&&saved.every(r=>r&&typeof r.id==='string'&&typeof r.name==='string'&&typeof r.scope==='string'&&['day',...intervals].includes(r.frame)&&typeof r.enabled==='boolean'&&(!('levels' in r)||(Array.isArray(r.levels)&&r.levels.length<=2&&r.levels.every((v:unknown)=>typeof v==='string'&&compileIndicator(v))))&&compileIndicator(r.source)))return saved;
  }catch{}
  return defaults;
}
export function IndicatorEditor({rules,companies,onChange,children}:{children?:React.ReactNode;rules:Rule[];companies:{symbol:string}[];onChange:(r:Rule[])=>void}){
  const [editing,setEditing]=useState(false),[id,setId]=useState(''),[name,setName]=useState(''),[scope,setScope]=useState('*');
  const [frame,setFrame]=useState<Rule['frame']>('15m'),[source,setSource]=useState(''),[mode,setMode]=useState('threshold');
  const [direction,setDirection]=useState('either'),[limit,setLimit]=useState('3'),[notice,setNotice]=useState('');
  const [levels,setLevels]=useState<string[]>([]);
  function persist(next:Rule[]){
    onChange(next);
    try{localStorage.setItem(storage,JSON.stringify(next));setNotice('Rules saved on this device.')}
    catch{setNotice('Applied for this visit. Browser storage is unavailable.')}
  }
  function edit(rule?:Rule){
    setEditing(true);setNotice('');setId(rule?.id||'');setName(rule?.name||'');setScope(rule?.scope||'*');
    setFrame(rule?.frame||'15m');const thresholds=Array.isArray(rule?.thresholds)?rule.thresholds:undefined;
    setLevels(thresholds?thresholds.slice(1):rule?.levels??[]);setMode(rule&&!thresholds?'formula':'threshold');setDirection(rule?.direction||'either');setLimit(thresholds?.[0]||'3');
    setSource(rule?.source||'math.abs(candlePct) >= 3');
  }
  function save(){
    try{
      if(!id&&rules.length>=20)throw Error('Remove a rule before adding another (20 maximum).');
      const field=frame==='day'?'dayPct':'candlePct';
      const entries=mode==='threshold'?[limit,...levels]:[source,...levels];
      const formulas=entries.map((entry,index)=>{
        let formula=entry;
        if(mode==='threshold'){
          const n=Number(entry);
          if(!Number.isFinite(n)||n<=0)throw Error('Enter a positive percentage for every level.');
          if(index && n<=Number(entries[index-1]))throw Error('Each level needs a higher threshold than the previous one.');
          formula=direction==='either'?'math.abs('+field+') >= '+n:field+(direction==='gain'?' >= ':' <= -')+n;
        }
        compileIndicator(formula);
        return formula;
      });
      const rule={id:id||crypto.randomUUID(),name:name.trim()||(frame==='day'?'Daily':frame)+' signal',scope,frame,source:formulas[0],levels:formulas.slice(1),thresholds:mode==='threshold'?entries:undefined,direction,enabled:rules.find(r=>r.id===id)?.enabled??true};
      persist(id?rules.map(r=>r.id===id?rule:r):[...rules,rule]);setEditing(false);
    }catch(e){setNotice(e instanceof Error?e.message:'Invalid indicator')}
  }
  return <details className="indicator-editor"><summary className="indicator-toggle"><span aria-hidden="true" className="indicator-bars">▂▅▇</span> Indicators <span className="indicator-count">{rules.filter(r=>r.enabled).length} on</span></summary>
    {children}
    {rules.map((r,index)=><div className="rule-line" key={r.id}><label><input id={'indicator-enabled-'+r.id} type="checkbox" checked={r.enabled} onChange={e=>persist(rules.map(x=>x.id===r.id?{...x,enabled:e.target.checked}:x))}/>#{index+1} {r.name} <small>{r.scope==='*'?'All stocks':r.scope}</small></label>
      <button onClick={()=>edit(r)}>Edit</button><button aria-label={'Remove '+r.name} onClick={()=>{persist(rules.filter(x=>x.id!==r.id));if(id===r.id)setEditing(false)}}>Remove</button></div>)}
    {!editing?<button className="secondary" onClick={()=>edit()}>Add indicator</button>:<fieldset><legend>Indicator settings</legend>
      <label>Name<input id="indicator-name" value={name} maxLength={48} onChange={e=>setName(e.target.value)}/></label>
      <label>Apply to<select id="indicator-scope" value={scope} onChange={e=>setScope(e.target.value)}><option value="*">All watchlist stocks</option>{companies.map(c=><option key={c.symbol}>{c.symbol}</option>)}</select></label>
      <label>Signal timeframe<select id="indicator-timeframe" value={frame} onChange={e=>setFrame(e.target.value as Rule['frame'])}>{intervals.map(value=><option key={value} value={value}>Completed {value} candle</option>)}<option value="day">Day versus previous close</option></select></label>
      <label>Rule type<select id="indicator-type" value={mode} onChange={e=>{setMode(e.target.value);setLevels([])}}><option value="threshold">Percentage threshold</option><option value="formula">Formula / Pine subset</option></select></label>
      {mode==='threshold'?<><label>Direction<select id="indicator-direction" value={direction} onChange={e=>setDirection(e.target.value)}><option value="either">Gain or loss</option><option value="gain">Gain</option><option value="loss">Loss</option></select></label><label>Level 1 threshold (%)<input id="indicator-threshold" type="number" min="0.01" step="any" value={limit} onChange={e=>setLimit(e.target.value)}/></label></>:<>
        <p className="hint">Use dayPct, candlePct, price, or the selected timeframe’s candle open and close (15m for daily rules). Combine comparisons with and/or, arithmetic and math.abs. Simple Pine assignments and one alertcondition are supported. History lookups, ta.* and strategies are unsupported.</p>
        <label>Formula<textarea id="indicator-formula" value={source} maxLength={4000} rows={4} onChange={e=>setSource(e.target.value)}/></label>
        <a href="/examples/three-percent-candle.pine" download>Download example Pine rule</a>
        <label>Import .pine or .txt<input id="indicator-import" type="file" accept=".pine,.txt,text/plain" onChange={async e=>{
          const file=e.target.files?.[0];if(!file)return;
          try{if(file.size>16000)throw Error('The file is too large.');const code=await file.text();compileIndicator(code);setSource(code);setNotice('Imported. Save to apply.')}
          catch(err){setNotice(err instanceof Error?err.message:'Import failed.')}
        }}/></label></>}
      {levels.map((value,i)=><label key={i}>Level {i+2} {mode==='threshold'?'threshold (%)':'formula'}
        <textarea id={'indicator-level-'+(i+2)} rows={mode==='threshold'?1:2} value={value} maxLength={4000} onChange={e=>setLevels(levels.map((v,j)=>j===i?e.target.value:v))}/>
      </label>)}
      <div className="watch-actions">{levels.length<2&&<button onClick={()=>setLevels([...levels,''])}>Add level {levels.length+2}</button>}{levels.length>0&&<button onClick={()=>setLevels(levels.slice(0,-1))}>Remove level {levels.length+1}</button>}</div>
      <div className="watch-actions"><button className="primary" onClick={save}>Save rule</button><button onClick={()=>setEditing(false)}>Cancel</button></div></fieldset>}
    <small role="status">{notice}</small>
  </details>;
}
