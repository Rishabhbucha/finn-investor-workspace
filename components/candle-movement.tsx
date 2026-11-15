export const intervals=['15m','30m','1h','3h'] as const;
export type Interval=typeof intervals[number];
export type Candle = {start:string; end:string; open:number; close:number; change:number};
export type Observation = {symbol:string; price?:number; change?:number|null; asOf?:string;
  interval?:Interval; candles?:Partial<Record<Interval,Candle|null>>; otherSignals?:string[]; dayRules?:string; candleRules?:string; status:'quoted'|'cached'|'saved'|'unavailable'; candle?:Candle|null};

const clock = new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit'});
const date = new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',day:'numeric',month:'short'});
export default function CandleMovement({candle,compact=false,matched='',interval='15m'}:{candle?:Candle|null;compact?:boolean;matched?:string;interval?:Interval}) {
  if(!candle) return <span className="watch-candle">{interval==='15m'?'15 min':interval} · unavailable</span>;
  const delta=candle.change;
  const direction=delta>0?'Gain':delta<0?'Loss':'Flat';
  const size=Math.abs(delta);
  const amount=size>0 && size<0.005?'<0.01':size.toFixed(2);
  if(compact) return <span className="compact-candle"><span>{interval==='15m'?'15 min':interval} · <span className={matched?'matched-value':undefined}><strong className={'candle-'+direction.toLowerCase()}>{delta>0?'+':delta<0?'−':''}{amount}%</strong>{matched&&<sup>{matched}</sup>}</span></span><span>{clock.format(new Date(candle.start))}–{clock.format(new Date(candle.end))} IST</span></span>;
  return <span className="watch-candle">
    <span>{interval==='15m'?'15 min':interval} · </span><strong className={'candle-'+direction.toLowerCase()}>{direction} {delta>0?'+':delta<0?'−':''}{amount}%</strong>
    <small>{date.format(new Date(candle.start))} · {clock.format(new Date(candle.start))}–{clock.format(new Date(candle.end))} IST</small>
  </span>;
}
