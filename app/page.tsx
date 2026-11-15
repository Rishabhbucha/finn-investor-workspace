"use client";
import {useCallback,useEffect,useRef,useState} from 'react';
import SignalDesk from '../components/signal-desk';
import PortfolioHeatmap from '../components/portfolio-heatmap';
import MarketWatch from '../components/market-watch';
import CompanyMove from '../components/company-move';
import type {Observation} from '../components/candle-movement';
import GuidanceReview from '../components/guidance-review';
import Link from 'next/link';
import type {Snapshot} from '../lib/snapshot';
type SourceDocument=Omit<Snapshot['documents'][number],'chunks'> & {chunkCount:number};
type Workspace=Omit<Snapshot,'documents'|'announcements'|'health'> & {
 documents:SourceDocument[];
 announcements:Array<Snapshot['announcements'][number] & {priority:number;category:string}>;
 health:Array<{at:string;source:string;ok:boolean;count?:number;error?:string}>;
};
type Research={symbol:string;error?:string;mode:string;message:string;documents?:SourceDocument[];
 evidence:Array<{citation:string;title:string;period:string;page:number;text:string;url:string}>;
 answer?:{summary:string;claims:Array<{text:string;citations:string[]}>;limitations:string[]}};
const defaultPrefs={price:3,volume:2,autoRefresh:false};
function loadPreferences(){
 try {
   const value=JSON.parse(localStorage.getItem('finn.preferences')||'null');
   if(Number.isFinite(value?.price)&&value.price>=1&&value.price<=15&&Number.isFinite(value.volume)&&value.volume>=1&&value.volume<=6)
     return {price:Number(value.price),volume:Number(value.volume),autoRefresh:value.autoRefresh===true};
 }catch{}
 return defaultPrefs;
}
const tabs=['Dashboard','Research','Portfolio'];
const questions=['What did management guide for revenue growth and margins?','What are the risks to cash conversion?','What changed in demand and deal wins?'];
export default function Home(){
 const [marketSlot,setMarketSlot]=useState<HTMLSpanElement|null>(null);
 const [move,setMove]=useState<Observation|null>(null);
 useEffect(()=>{if(move)document.getElementById('selected-move')?.focus()},[move]);
 const [tab,setTab]=useState('Dashboard'),[data,setData]=useState<Workspace|null>(null),[error,setError]=useState(''),[symbol,setSymbol]=useState('INFY'),[question,setQuestion]=useState(questions[0]),[result,setResult]=useState<Research|null>(null),[busy,setBusy]=useState(false),[prefs,setPrefs]=useState(defaultPrefs),[saved,setSaved]=useState(false),[refreshing,setRefreshing]=useState(false),[refreshMessage,setRefreshMessage]=useState('');
 useEffect(()=>{
   fetch('/api/snapshot').then(async response=>{
     if(!response.ok)throw Error('Data could not be loaded.');
     const snapshot=await response.json() as Workspace;
     setData(snapshot);setPrefs(loadPreferences());
   }).catch(e=>setError(e.message));
 },[]);
 const refreshInFlight=useRef(false);
 const refreshData=useCallback(async ()=>{
   if(refreshInFlight.current)return;
   refreshInFlight.current=true;
   setRefreshing(true);setError('');setRefreshMessage('');
   try{
     const response=await fetch('/api/refresh',{method:'POST'});
     const status=await response.json() as {error?:string;message:string};
     if(!response.ok)throw Error(status.error);
     const next=await fetch('/api/snapshot');
     if(!next.ok)throw Error('Updated data could not be loaded.');
     setData(await next.json() as Workspace);setRefreshMessage(status.message);
   }catch(e){setError(e instanceof Error?e.message:'Refresh failed')}
   finally{refreshInFlight.current=false;setRefreshing(false)}
 },[]);
 useEffect(()=>{
   if(!prefs.autoRefresh)return;
   const interval=15*60*1000;
   let lastCheck=Date.now();
   function check(){
     if(document.visibilityState==='visible' && Date.now()-lastCheck>=interval){
       lastCheck=Date.now();void refreshData();
     }
   }
   const timer=window.setInterval(check,60*1000);
   document.addEventListener('visibilitychange',check);
   return ()=>{clearInterval(timer);document.removeEventListener('visibilitychange',check)};
 },[prefs.autoRefresh,refreshData]);
 const requestId=useRef(0);
 const [period,setPeriod]=useState('');
 function resetResearch(){requestId.current++;setResult(null);setBusy(false);setError('')}
 function chooseCompany(value:string){resetResearch();setMove(null);setSymbol(value);setPeriod('')}
 function changeResearchTicker(value:string){chooseCompany(value);setTab('Research')}
 async function research(q=question,s=symbol){
   const id=++requestId.current;
   setBusy(true);setResult(null);setError('');
   try{
     const response=await fetch('/api/research',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({symbol:s,question:q,period:period||undefined})});
     const answer=await response.json() as Research;
     if(id!==requestId.current)return;
     if(!response.ok)throw Error(answer.error);
     setResult(answer);
     const docs=answer.documents;
     if(docs)setData(prev=>prev ? {...prev,documents:[...prev.documents.filter(d=>d.symbol!==answer.symbol),...docs]} : prev);
   }catch(e){if(id===requestId.current)setError(e instanceof Error?e.message:'Research failed')}
   finally{if(id===requestId.current)setBusy(false)}
 }
 const date=(d:string)=>new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Kolkata'});
 function openCompany(s:string){chooseCompany(s);setTab('Research')}
 const coverage=data?.documents.filter(d=>d.symbol===symbol.trim() && (!period||d.period===period))??[];
 return <div className="shell">
 <header className="masthead"><div className="mast-inner"><Link className="brand" href="/" aria-label="FINN home">finn<span>.</span></Link>
 <nav aria-label="Workspace">{tabs.map(t=><button key={t} className={tab===t?'nav active':'nav'} aria-current={tab===t?'page':undefined} onClick={()=>{setTab(t);setMove(null);setError('')}}>{t}</button>)}</nav>
 <button className="header-refresh" onClick={refreshData} disabled={refreshing}>{refreshing?'Refreshing…':'Refresh data ↻'}</button></div></header>
 <div className="workspace"><main>
 <section className="page-heading"><div className="page-heading-row"><div className="eyebrow">Investor workspace / {tab}</div><span ref={setMarketSlot}/></div><h1>{tab==='Dashboard'?'Signal Desk':tab==='Research'?'Company Desk':'Your portfolio'}</h1></section>
 {refreshMessage&&<div role="status" className="notice">{refreshMessage}</div>}
 {error&&<div role="alert" className="notice error">{error}{error.includes('Sign in')&&<p><a href="/signin-with-chatgpt?return_to=/" target="_top">Sign in to FINN →</a></p>}</div>}
 {!data?<div className="panel">{error?'Reload the page to retry.':'Loading your workspace…'}</div>:<>
 <div className="snapshot"><span className="dot"/> Real-source snapshot · refreshed {date(data.updatedAt)}<span>Saved snapshot · refresh to check for updates.</span></div>
 {tab==='Portfolio'&&<PortfolioHeatmap companies={data.companies} prices={data.prices} selected={move?.symbol} onSelect={m=>{chooseCompany(m.symbol);setMove(m)}}/>}
 {tab==='Portfolio'&&move&&<button className="secondary back-map" onClick={()=>{document.getElementById('tile-'+move.symbol)?.focus();setMove(null)}}>↑ Back to heatmap</button>}
 {(tab==='Research'||tab==='Portfolio')&&move&&<CompanyMove move={move} name={data.companies.find(c=>c.symbol===move.symbol)?.name||move.symbol} close={data.prices.find(p=>p.symbol===move.symbol)} filings={data.announcements} prefs={prefs}/>}
 {tab==='Dashboard'&&<SignalDesk companies={data.companies} prices={data.prices} filings={data.announcements} documents={data.documents.length} prefs={prefs} onOpen={(s,m)=>{openCompany(s);if(m)setMove(m)}} onHealth={()=>{const health=document.querySelector<HTMLDetailsElement>('#data-health');if(health){health.open=true;health.scrollIntoView()}}}/>}
 {(tab==='Research'||(tab==='Portfolio'&&move))&&<section className="company-desk"><div className="panel research-form"><label htmlFor="ticker">Company / NSE symbol</label><input id="ticker" value={symbol} onChange={e=>{changeResearchTicker(e.target.value.toUpperCase())}} placeholder="e.g. INFY" maxLength={25}/><div className="chips">{[...new Set(data.documents.map((d)=>d.symbol))].map((s)=><button key={s} className="chip" onClick={()=>{changeResearchTicker(s)}}>{s}</button>)}</div><label htmlFor="period">Reporting period</label><select id="period" value={period} onChange={e=>{resetResearch();setPeriod(e.target.value)}}><option value="">All available periods</option>{[...new Set<string>(data.documents.filter((d)=>d.symbol===symbol).map((d)=>d.period))].map(value=><option key={value}>{value}</option>)}</select><p className="coverage-count">{coverage.length} primary {coverage.length===1?"document":"documents"} indexed for {period||"all periods"}</p><label htmlFor="question">What would you like to understand?</label><textarea id="question" value={question} onChange={e=>{resetResearch();setQuestion(e.target.value)}} maxLength={1000} rows={3}/><div className="question-chips">{questions.map((q,i)=><button key={q} className="chip" title={q} onClick={()=>{setQuestion(q);research(q)}}>{["Growth and margins","Cash conversion","Demand and deal wins"][i]}</button>)}</div><button className="primary analysis-primary" disabled={busy||question.trim().length<5||!symbol.trim()} onClick={()=>research()}>{busy?'Finding company documents…':'Research this company ↗'}</button><p className="hint">Primary sources only · source-linked passages · no outside company knowledge</p></div>
 {result&&<section aria-live="polite" className="desk-results">
   <h2>{result.answer?'Research findings':result.evidence.length?'Matching source passages':'Source coverage'}</h2>
   {result.answer?.claims.map((claim,i)=><article key={i} className="desk-claim"><p>{claim.text}</p>
     {claim.citations.map(id=><a className="citation" key={id} href={'#passage-'+id}>{id} · p. {result.evidence.find(e=>e.citation===id)?.page}</a>)}</article>)}
   {result.evidence.map(e=><article id={'passage-'+e.citation} className="desk-passage" key={e.citation}>
     <blockquote>{e.text}</blockquote><p><strong>{e.title}</strong> · {e.period}</p>
     <span className="citation">{e.citation} · PDF page {e.page}</span> <a className="filing-link" href={e.url.split('#')[0]+'#page='+e.page} target="_blank" rel="noreferrer">Original filing ↗</a>
   </article>)}
   <p className="hint">{result.message}</p>{result.answer?.limitations.map((item,i)=><p className="hint" key={i}>{item}</p>)}
 </section>}
 {coverage.length>0&&<details className="panel"><summary>Browse indexed documents ({coverage.length})</summary>{coverage.map(d=><a className="document" key={d.id} href={d.url} target="_blank" rel="noreferrer"><strong>{d.title} ↗</strong><small>{d.period} · {d.chunkCount} passages</small></a>)}</details>}
 {symbol.trim().toUpperCase()==='WIPRO'&&<GuidanceReview/>}
 </section>}
 {tab==='Dashboard'&&<details id="data-health" className="panel"><summary>Data health</summary>{data.health.map((h,i:number)=><div className="health" key={i}><span>{h.source}</span><span className={h.ok?'source-ok':'source-error'}>{h.ok?(h.count===0?'0 matches':'Fetched'):'Failed'}</span><small>{date(h.at)}{h.error&&" · "+h.error}</small></div>)}</details>}
 </>}
 </main>{data&&<MarketWatch mobileSlot={marketSlot} companies={data.companies} prices={data.prices} onOpen={observation=>{openCompany(observation.symbol);setMove({...observation})}}><details className="portfolio-settings"><summary>Portfolio closing indicators</summary><label htmlFor="price">Daily price move: ±{prefs.price}%</label><input id="price" type="range" min="1" max="15" step="0.5" value={prefs.price} onChange={e=>{setPrefs({...prefs,price:+e.target.value});setSaved(false)}}/><label htmlFor="volume">Volume: {prefs.volume}× prior 20-day average</label><input id="volume" type="range" min="1" max="6" step="0.25" value={prefs.volume} onChange={e=>{setPrefs({...prefs,volume:+e.target.value});setSaved(false)}}/><label className="refresh-option"><input id="auto-refresh" type="checkbox" checked={prefs.autoRefresh} onChange={e=>{setPrefs({...prefs,autoRefresh:e.target.checked});setSaved(false)}}/> Check for updates every 15 minutes while FINN is open</label><button className="primary" onClick={()=>{try{localStorage.setItem('finn.preferences',JSON.stringify(prefs));setSaved(true)}catch{setError('This browser could not save preferences.')}}}>{saved?'Saved ✓':'Save settings'}</button><p className="hint">Applied to completed sessions across your portfolio.</p></details></MarketWatch>}</div></div>
}
