import type {Snapshot} from '../lib/snapshot';
import {filingsAroundMove} from '../lib/move-filings.mjs';
import {marketAlert} from '../lib/engine.mjs';
import CandleMovement, {type Observation} from './candle-movement';
import PriceMovement from './price-movement';

const stamp = (v:string)=>new Date(v).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false});
type Props={move:Observation;name:string;close?:Snapshot['prices'][number];filings:Snapshot['announcements'];prefs:{price:number;volume:number}};

export default function CompanyMove({move,name,close,filings,prefs}:Props) {
  const nearby:Snapshot['announcements']=filingsAroundMove(filings,move.symbol,move.asOf);
  const windowDate=(offset:number)=>new Date(Date.parse(move.asOf!)+offset*86400000).toLocaleDateString('en-IN',{timeZone:'Asia/Kolkata',day:'numeric',month:'short',year:'numeric'});
  const eod=close?marketAlert(close,prefs):null;
  const dailyHit=eod?.price!=null && Math.abs(eod.price)>=prefs.price;
  const volumeHit=eod?.ratio!=null && eod.ratio>=prefs.volume;
  return <section className="panel company-move" aria-label="Selected market move">
    <h2 tabIndex={-1} id="selected-move">{name} · {move.symbol}</h2>
    <p>{move.status==='saved'?'Saved close':move.status==='cached'?'Cached trade':'Observed price'} · {move.price!=null?'₹'+move.price.toLocaleString('en-IN',{minimumFractionDigits:2}):'Unavailable'}
      {move.asOf&&' · '+(move.status==='saved'?move.asOf:stamp(move.asOf)+' IST')}</p>
    <p>Daily change <span className={move.dayRules?"matched-value":undefined}><PriceMovement value={move.change}/>{move.dayRules}</span></p>
    <div className={move.candleRules?"observed-trigger":undefined}><CandleMovement interval={move.interval} candle={move.candle} compact matched={move.candleRules}/></div>
    {move.otherSignals?.map((signal,i)=><small key={i}>{signal}</small>)}
    {move.candle&&<small>Open ₹{move.candle.open.toFixed(2)} → Close ₹{move.candle.close.toFixed(2)}</small>}
    <details><summary>Completed-session and daily thresholds</summary>
    {move.change!=null&&move.status!=='saved'&&<p>At the observed trade, the daily move was {Math.abs(move.change)>=prefs.price?'at or beyond':'inside'} your ±{prefs.price}% price threshold.</p>}
    {close&&eod?<><p>Completed session · {close.date}</p><ul>
      <li>Price · <PriceMovement value={eod.price}/> · {eod.price==null?'Unavailable':dailyHit?'Threshold met':'Inside threshold'} (±{prefs.price}%)</li>
      <li>Volume · {eod.ratio==null?'Unavailable':eod.ratio.toFixed(2)+'× the prior 20-session average · '+(volumeHit?'Threshold met':'Below threshold')} ({prefs.volume}× rule)</li>
    </ul></>:<p>Completed-session data unavailable.</p>}
    </details><h3>Filings around this move</h3>
    <p>{move.asOf?'The observation date in India and one calendar day on either side. Timing alone does not establish a cause.':'A dated observation is needed to match filings.'}</p>
    {nearby.length?<ul className="filing-timeline">{nearby.map(row=><li className={/transcript/i.test(row.title)?'transcript-event':undefined} key={row.url}><small>{stamp(row.publishedAt)} IST</small><a className="filing-link" href={row.url} target="_blank" rel="noreferrer">{row.title} ↗</a></li>)}</ul>:move.asOf&&<p>No matching filings in the saved exchange feed for {windowDate(-1)} – {windowDate(1)} (IST).</p>}
  </section>;
}
