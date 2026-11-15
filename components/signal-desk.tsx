import {useEffect,useState} from 'react';
import {digest,marketAlert} from '../lib/engine.mjs';
import type {Snapshot} from '../lib/snapshot';
import type {Observation} from './candle-movement';

type Filing=Snapshot['announcements'][number]&{priority:number;category:string};
type Props={companies:Snapshot['companies'];prices:Snapshot['prices'];filings:Filing[];documents:number;
  prefs:{price:number;volume:number};onOpen:(symbol:string,move?:Observation)=>void;onHealth:()=>void};
type Item={id:string;symbol:string;title:string;at:number;kind:string;url:string;detail:string;move?:Observation};
const stamp=(i:Item)=>new Date(i.at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',day:'numeric',month:'short',year:'numeric',...(i.move?{}:{hour:'2-digit',minute:'2-digit',hour12:false})})+(i.move?' · closing session':' IST');

export default function SignalDesk({companies,prices,filings,documents,prefs,onOpen,onHealth}:Props){
  const [hours,setHours]=useState(24),[category,setCategory]=useState('all');
  const [now,setNow]=useState(Date.now);
  useEffect(()=>{
    const timer=window.setInterval(()=>setNow(Date.now()),60000);
    return ()=>window.clearInterval(timer);
  },[]);
  const matched:Filing[]=digest(filings,{symbols:companies.map(c=>c.symbol),hours,category,now});
  const disclosures=matched.filter(f=>f.priority>=40).map((f):Item=>({
    id:f.id,symbol:f.symbol,title:f.title,at:Date.parse(f.publishedAt),kind:f.category.replaceAll('_',' '),url:f.url,detail:'Exchange filing'
  }));
  const routine=matched.filter(f=>f.priority<40);
  const moves=prices.flatMap(p=>{
    const at=Date.parse(p.date+'T15:30:00+05:30');
    const {price,ratio,triggered}=marketAlert(p,prefs);
    if(category!=='all'||!triggered||at>now||at<now-hours*3600000)return [];
    const reasons=[];
    if(price!=null&&Math.abs(price)>=prefs.price)reasons.push((price>0?'+':'')+price.toFixed(2)+'% daily move (rule ±'+prefs.price+'%)');
    if(ratio!=null&&ratio>=prefs.volume)reasons.push(ratio.toFixed(2)+'× average volume (rule '+prefs.volume+'×)');
    const move:Observation={symbol:p.symbol,price:p.close,change:price,asOf:p.date,status:'saved'};
    return [{id:'close-'+p.symbol,symbol:p.symbol,title:reasons.join(' · '),kind:'Threshold alert',at,url:p.url,
      detail:'Completed session · volume baseline: previous 20 sessions',move,
      strength:Math.max(Math.abs(price??0)/prefs.price,(ratio??0)/prefs.volume)}];
  }).sort((a,b)=>b.strength-a.strength||b.at-a.at);
  const ranked:Item[]=[...moves,...disclosures],lead=ranked[0];
  const timeline=[...ranked].sort((a,b)=>b.at-a.at).slice(0,5);
  function links(item:Item){return <div className="desk-links"><button className="secondary" onClick={()=>onOpen(item.symbol,item.move)}>Investigate {item.symbol} →</button><a className="filing-link" href={item.url} target="_blank" rel="noreferrer">{item.move?'Price history':'Original filing'} ↗</a></div>}
  return <section className="signal-desk" aria-label="Signal Desk">
    <div className="desk-controls"><label>Window <select id="digest-window" aria-label="Digest window" value={hours} onChange={e=>setHours(+e.target.value)}>{[[24,'Last 24 hours'],[168,'Last 7 days'],[720,'Last 30 days'],[8760,'Last year']].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
      <label>Filing category <select id="filing-category" aria-label="Filing category" value={category} onChange={e=>setCategory(e.target.value)}><option value="all">All signals</option>{[...new Set(filings.map(f=>f.category))].sort().map(c=><option key={c} value={c}>{c.replaceAll('_',' ')} filings</option>)}</select></label></div>
    <article className="desk-lead"><div className="eyebrow">{lead?'Lead signal · '+lead.kind:'Quiet window'}</div>
      <h2>{lead?lead.symbol:'No priority signals in this view'}</h2>
      {lead?<><strong>{lead.title}</strong><p>{stamp(lead)} · {lead.detail}</p>{links(lead)}</>:<><p>No qualifying event in the stored observations for these filters.</p><button className="secondary" onClick={()=>{setCategory('all');setHours(hours<168?168:8760)}}>{hours<168?'Review the last 7 days':'Review the archive'}</button></>}
    </article>
    <p className="desk-counts">{companies.length} companies · {moves.length} threshold alerts · {disclosures.length} priority filings in view</p>
    {ranked.length>1&&<details className="panel"><summary>More signals by priority ({ranked.length-1})</summary>{ranked.slice(1).map(i=><article className="desk-row" key={i.id}><strong>{i.symbol} · {i.title}</strong><small>{stamp(i)}</small>{links(i)}</article>)}</details>}
    <h2>Recent activity</h2>{timeline.length?<ol className="desk-timeline">{timeline.map(i=><li key={i.id}><small>{stamp(i)} · {i.kind}</small><button onClick={()=>onOpen(i.symbol,i.move)}>{i.symbol} · {i.title} ↗</button></li>)}</ol>:<p>No priority events to plot in this window.</p>}
    {routine.length>0&&<details className="panel"><summary>{routine.length} routine filings</summary>{routine.map(f=><p key={f.id}><a className="filing-link" href={f.url} target="_blank" rel="noreferrer">{f.symbol} · {f.title} ↗</a></p>)}</details>}
    <div className="desk-links"><button className="text-button" onClick={()=>onOpen('WIPRO')}>Review Wipro’s four quarters →</button><button className="text-button" onClick={onHealth}>{documents} indexed documents · Data health →</button></div>
  </section>;
}
