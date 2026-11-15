'use client';
import {createPortal} from 'react-dom';
import {useEffect,useMemo,useRef,useState} from 'react';
import {IndicatorEditor,readRules} from './watch-indicators';
import {compileIndicator} from '../lib/watch-indicators.mjs';
import {useStockQuotes} from './use-stock-quotes';
import PriceMovement from './price-movement';
import CandleMovement, {intervals,type Interval,type Observation} from './candle-movement';

type Company = {symbol:string; name:string};
type Close = {symbol:string; close:number; previousClose:number; date:string};

const defaults = ['RELIANCE','HDFCBANK','INFY','TCS'];
const key = 'finn.watchlist.v1';
const rupees = new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'});
const time = new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hour12:false});

export default function MarketWatch({companies,prices,onOpen,children,mobileSlot}:{mobileSlot:HTMLSpanElement|null;children?:React.ReactNode;companies:Company[];prices:Close[];onOpen:(move:Observation)=>void}) {
  const [symbols,setSymbols] = useState<string[]>(()=>{
    try {
      const stored:unknown = JSON.parse(localStorage.getItem(key) || 'null');
      if(Array.isArray(stored)) return [...new Set<string>(stored.filter(s=>companies.some(c=>c.symbol===s)))].slice(0,8);
    } catch {}
    return defaults;
  });
  const [interval,setIntervalChoice]=useState<Interval>(()=>{
    try{const value=localStorage.getItem('finn.watch.interval') as Interval;if(intervals.includes(value))return value}catch{}
    return '15m';
  });
  const drawer=useRef<HTMLDialogElement>(null);
  const [mobile,setMobile]=useState(false);
  useEffect(()=>{
    const media=window.matchMedia('(max-width:760px)');
    function sync(){
      if(!media.matches)drawer.current?.close();
      setMobile(media.matches);
    }
    sync();media.addEventListener('change',sync);
    return ()=>media.removeEventListener('change',sync);
  },[]);
  const [expanded,setExpanded] = useState(false);
  const [draft,setDraft] = useState<string[]|null>(null);
  const quotes=useStockQuotes(symbols);
  const [message,setMessage] = useState('');
  const [rules,setRules]=useState(readRules);
  const indicators=useMemo(()=>rules.filter(r=>r.enabled).map(r=>({...r,tests:[r.source,...(r.levels??[])].map(compileIndicator)})),[rules]);

  function save(){
    if(!draft)return;
    setSymbols(draft);setDraft(null);
    try{localStorage.setItem(key,JSON.stringify(draft));setMessage('Watchlist saved on this device.')}
    catch{setMessage('Updated for this visit. Device storage is unavailable.')}
  }
  const body=(
    <div className="watch-body" id="watch-body">
      <p className="watch-caption">Latest trades · updates every minute while open. Quotes may be delayed.</p>
      {draft===null ? <>
        <ul className="quotes">{symbols.map(symbol=>{
          const quote=quotes[symbol], close=prices.find(p=>p.symbol===symbol);
          const hasQuote=quote?.price!=null && !!quote.asOf;
          const price=hasQuote?quote.price:close?.close;
          const change=hasQuote?quote.change:close && close.previousClose>0?(close.close-close.previousClose)/close.previousClose*100:null;
          const when=hasQuote?(quote.status==='cached'?'Cached trade · ':'Last trade · ')+time.format(new Date(quote.asOf!))+' IST':close?'Saved close · '+close.date:'Quote unavailable';
          const observation:Observation=hasQuote?quote:{symbol,price,change,asOf:close?.date,status:close?'saved':'unavailable',candle:null};
          const candleFor=(frame:Interval)=>frame==='15m'?observation.candle:observation.candles?.[frame];
          const displayed=candleFor(interval);
          const hits=indicators.flatMap(r=>{
            const candle=candleFor(r.frame==='day'?'15m':r.frame);
          const values={dayPct:change,candlePct:candle?.change,price,open:candle?.open,close:candle?.close};
            if((r.scope!=='*'&&r.scope!==symbol)||(r.frame==='day'?change:candle?.change)==null)return [];
            const level=r.tests.reduce((highest,test,i)=>test(values)?i+1:highest,0);
            return level?[{...r,level}]:[];
          });
          const highest=Math.max(0,...hits.map(r=>r.level));
          const matched = (frame:Interval|'day') => hits.filter(r=>r.frame===frame)
            .map(r=>'#'+(rules.findIndex(rule=>rule.id===r.id)+1)).join(', ');
          const dayRules=matched('day'), candleRules=matched(interval);
          return <li key={symbol} className={highest?'indicator-hit level-'+highest:undefined}><button className="quote-open" title={when} aria-label={'Explore '+symbol+' move and filings'+(hits.length?' · '+hits.map(r=>r.name+' cleared level '+r.level).join(', '):'')} onClick={()=>{onOpen({...observation,interval,candle:displayed,dayRules,candleRules,otherSignals:hits.filter(r=>r.frame!=='day'&&r.frame!==interval).map(r=>r.name+' · '+r.frame+' · cleared level '+r.level)});drawer.current?.close()}}>
            <span className="quote-line"><strong>{symbol} <span className="stock-arrow" aria-hidden="true">↗</span></strong><b>{price==null?'—':rupees.format(price)}</b></span>
            <span className="quote-line"><span>{companies.find(c=>c.symbol===symbol)?.name}</span><span>Day <span className={dayRules?'matched-value':undefined}><PriceMovement value={change}/>{dayRules&&<sup>{dayRules}</sup>}</span></span></span>
            <CandleMovement interval={interval} candle={displayed} compact matched={candleRules}/>
            {hits.map(r=><small className="level-caption" key={r.id}>{r.name} · {r.frame} · cleared level {r.level}</small>)}
            {observation.status!=='quoted'&&<small>{when}</small>}
          </button></li>;
        })}</ul>
        {!symbols.length&&<p>Choose stocks to follow.</p>}
        <small className="watch-source">Source · Yahoo Finance</small>
        <footer className="watch-tools">
        <IndicatorEditor rules={rules} companies={companies} onChange={setRules}>{children}</IndicatorEditor>
        <label className="watch-interval">Candle interval <select id="candle-interval" value={interval} onChange={e=>{
          const value=e.target.value as Interval;setIntervalChoice(value);
          try{localStorage.setItem('finn.watch.interval',value)}catch{}
        }}>{intervals.map(value=><option key={value}>{value}</option>)}</select></label>
        <button className="watch-edit" onClick={()=>{setDraft([...symbols]);setMessage('')}}>Customize stocks</button>
        </footer>
      </> : <fieldset><legend>Choose up to 8 stocks · {draft.length}/8</legend>
        <div className="watch-options">{companies.map(c=><label key={c.symbol}><input id={'watch-stock-'+c.symbol} type="checkbox" checked={draft.includes(c.symbol)} disabled={!draft.includes(c.symbol)&&draft.length>=8} onChange={e=>setDraft(e.target.checked?[...draft,c.symbol]:draft.filter(s=>s!==c.symbol))}/>{c.symbol}</label>)}</div>
        <div className="watch-actions"><button className="primary" onClick={save}>Save watchlist</button><button className="text-button" onClick={()=>setDraft(null)}>Cancel</button></div>
      </fieldset>}
      {message&&<small role="status">{message}</small>}
    </div>
  );
  return <aside className="watch" aria-label="Market watch">
    <div className="watch-heading"><div><small>NSE · INR</small><h2>Market watch</h2></div>
      {mobile&&mobileSlot&&createPortal(<button className="mobile-toggle" aria-haspopup="dialog" aria-controls="market-drawer" aria-expanded={expanded} onClick={()=>{drawer.current?.showModal();setExpanded(true)}}>Open market ↗</button>,mobileSlot)}
    </div>
    {mobile?<dialog id="market-drawer" ref={drawer} className="market-drawer" aria-labelledby="market-drawer-title" onClose={()=>setExpanded(false)} onClick={e=>{if(e.target===e.currentTarget && e.clientX<e.currentTarget.getBoundingClientRect().left)e.currentTarget.close()}}>
      <header className="drawer-heading"><h2 id="market-drawer-title">Market watch</h2><button className="drawer-back" onClick={()=>drawer.current?.close()}>← Back</button></header>
      {body}
    </dialog>:body}
  </aside>;
}
