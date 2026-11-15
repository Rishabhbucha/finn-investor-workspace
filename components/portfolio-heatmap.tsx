'use client';
import {useMemo,useState} from 'react';
import type {Snapshot} from '../lib/snapshot';
import type {Observation} from './candle-movement';
import {useStockQuotes} from './use-stock-quotes';
import PriceMovement from './price-movement';

const time=new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hour12:false});
function band(change?:number|null){
  if(change==null)return 'missing';
  if(change===0)return 'flat';
  const size=Math.abs(change);
  return (change>0?'up':'down')+' level-'+(size<1?1:size<3?2:size<5?3:4);
}
type Props={companies:Snapshot['companies'];prices:Snapshot['prices'];selected?:string;onSelect:(move:Observation)=>void};
export default function PortfolioHeatmap({companies,prices,selected,onSelect}:Props){
  const [query,setQuery]=useState('');
  const symbols=useMemo(()=>companies.map(c=>c.symbol),[companies]);
  const quotes=useStockQuotes(symbols);
  const visible=companies.filter(c=>[c.name,c.symbol,c.sector].some(v=>v.toLowerCase().includes(query.trim().toLowerCase())));
  const sectors=[...new Set(visible.map(c=>c.sector))].sort();
  return <section aria-label="Portfolio heatmap">
    <input id="portfolio-search" className="portfolio-search" aria-label="Search portfolio" placeholder="Search by company, symbol or sector…" value={query} onChange={e=>setQuery(e.target.value)}/>
    <div className="heat-key"><strong>Daily move</strong>{['<1%','1–<3%','3–<5%','5%+'].map((v,i)=><span key={v}><i className={'swatch level-'+(i+1)}/>{v}</span>)}</div>
    <p className="hint">Equal tiles represent stocks. Deeper color means a larger daily move.</p>
    {!visible.length&&<p role="status">No portfolio company matches your search.</p>}
    <div className="sector-map">{sectors.map(sector=><section className="sector-group" key={sector}><h2>{sector}</h2><div className="sector-tiles">
      {visible.filter(c=>c.sector===sector).map(c=>{
        const q=quotes[c.symbol],close=prices.find(p=>p.symbol===c.symbol);
        const move:Observation=q?.price!=null?q:{symbol:c.symbol,status:close?'saved':'unavailable',asOf:close?.date,price:close?.close,change:close&&close.previousClose>0?(close.close-close.previousClose)/close.previousClose*100:null};
        return <button id={'tile-'+c.symbol} key={c.symbol} className={'heat-tile '+band(move.change)} aria-pressed={selected===c.symbol} onClick={()=>onSelect({...move})}>
          <strong>{c.symbol}</strong><span className="tile-name">{c.name}</span>
          <span>Day {move.change==null?'—':<PriceMovement value={move.change}/>}</span>
          <small>{move.status==='saved'?'Saved close · '+move.asOf:move.asOf?(move.status==='cached'?'Cached · ':'')+time.format(new Date(move.asOf))+' IST':'Quote unavailable'}</small>
        </button>;
      })}
    </div></section>)}</div>
  </section>;
}
