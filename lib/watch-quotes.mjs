const lifetime = 60_000;
const cache = new Map();
const pending = new Map();
const positive = value => Number.isFinite(value) && value > 0;

export function lastCompletedCandle(series, now = Date.now() / 1000, minutes = 15) {
  const meta = series?.meta;
  const bars = series?.indicators?.quote?.[0];
  const times = series?.timestamp;
  if (meta?.dataGranularity !== '15m' || !bars || !Array.isArray(times)) return null;
  const session = meta.currentTradingPeriod?.regular;
  const quoteTime = meta.regularMarketTime;
  // A closed session can end after its final trade. During a session, use
  // the provider's trade time to avoid treating a delayed partial bar as final.
  const sessionFinished = session && now >= session.end && quoteTime >= session.start && quoteTime <= session.end;
  const cutoff = Math.min(now, sessionFinished ? session.end : quoteTime);
  if (!Number.isFinite(cutoff)) return null;
  for (let i = times.length - 1; i >= 0; i--) {
    const start = times[i], end = start + minutes * 60;
    if (minutes !== 15) {
      // Align buckets to the regular NSE session, 09:15–15:30 IST.
      const offset = (start + 19800) % 86400 - 33300;
      if (offset < 0 || offset % (minutes*60) || offset + minutes*60 > 22500) continue;
    }
    if (!positive(start) || (start + 19800) % 900 !== 0 || end > cutoff) continue;
    const count = minutes / 15;
    for (let j=0; j<count; j++) {
      if (times[i+j] !== start+j*900 || !positive(bars.open?.[i+j]) || !positive(bars.close?.[i+j])) return null;
    }
    const open = bars.open[i], close = bars.close[i+count-1];
    if (!positive(open) || !positive(close)) return null;
    return {start:new Date(start*1000).toISOString(),end:new Date(end*1000).toISOString(),
      open,close,change:(close-open)/open*100};
  }
  return null;
}

export function parseQuote(raw, symbol) {
  const meta = raw?.chart?.result?.[0]?.meta;
  if (meta?.symbol !== symbol + '.NS' || meta.currency !== 'INR' ||
      !positive(meta.regularMarketPrice) || !positive(meta.regularMarketTime)) {
    throw Error('No exchange quote available');
  }
  const previous = positive(meta.previousClose) ? meta.previousClose :
    meta.range === '1d' ? meta.chartPreviousClose : null;
  return {
    symbol, price:meta.regularMarketPrice,
    change:positive(previous) ? (meta.regularMarketPrice - previous) / previous * 100 : null,
    asOf:new Date(meta.regularMarketTime * 1000).toISOString(),
    candle:lastCompletedCandle(raw.chart.result[0]),
    candles:Object.fromEntries([['30m',30],['1h',60],['3h',180]].map(([key,minutes])=>
      [key,lastCompletedCandle(raw.chart.result[0],Date.now()/1000,minutes)]))
  };
}

export async function getQuote(symbol) {
  const saved = cache.get(symbol);
  if (saved && Date.now()-saved.checked < lifetime) return saved.result;
  if (pending.has(symbol)) return pending.get(symbol);
  const request = (async () => {
    let result;
    try {
      const url = 'https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(symbol+'.NS') + '?range=5d&interval=15m';
      const response = await fetch(url, {headers:{Accept:'application/json','User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(8000)});
      if (!response.ok) throw Error('Quote source unavailable');
      result = {...parseQuote(await response.json(),symbol), status:'quoted'};
    } catch {
      result = saved?.result.price ? {...saved.result,status:'cached'} : {symbol,status:'unavailable'};
    }
    cache.set(symbol,{checked:Date.now(),result});
    return result;
  })();
  pending.set(symbol,request);
  try { return await request; } finally { pending.delete(symbol); }
}
