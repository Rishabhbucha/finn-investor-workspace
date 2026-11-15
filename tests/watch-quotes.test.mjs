import assert from 'node:assert/strict';
import test from 'node:test';
import {parseQuote,lastCompletedCandle} from '../lib/watch-quotes.mjs';
import {filingsAroundMove} from '../lib/move-filings.mjs';

const meta={symbol:'INFY.NS',currency:'INR',regularMarketPrice:105,previousClose:100,chartPreviousClose:98,regularMarketTime:1770000000};
const parse=(fields={})=>parseQuote({chart:{result:[{meta:{...meta,...fields}}]}},'INFY');
test('watch uses the last trade timestamp and prior close',()=>{
  assert.equal(parse().change,5);
  assert.equal(parse().asOf,new Date(1770000000000).toISOString());
  assert.equal(parse({previousClose:null,chartPreviousClose:0}).change,null);
});
test('rejects mismatched symbols, currency, empty prices and undated trades',()=>{
  for(const fields of [{symbol:'TCS.NS'},{currency:'USD'},{regularMarketPrice:null},{regularMarketTime:0}])assert.throws(()=>parse(fields));
});
test('15-minute move compares open to close and excludes a delayed unfinished bar',()=>{
  const t=Date.parse('2026-11-13T09:00:00Z')/1000;
  const series={meta:{dataGranularity:'15m',regularMarketTime:t+1200},timestamp:[t,t+900],
    indicators:{quote:[{open:[100,200],close:[101,199]}]}};
  assert.equal(lastCompletedCandle(series,t+2200).change,1);
  series.meta.regularMarketTime=t+1800;
  assert.equal(lastCompletedCandle(series,t+1800).change,-0.5);
  series.indicators.quote[0].close[1]=200;
  assert.equal(lastCompletedCandle(series,t+1800).change,0);
  series.indicators.quote[0].close[1]=null;
  assert.equal(lastCompletedCandle(series,t+1800),null);
});
test('after the closing bell a final bar can end after the last trade',()=>{
  const end=Date.parse('2026-11-13T10:00:00Z')/1000;
  const s={meta:{dataGranularity:'15m',regularMarketTime:end-70,currentTradingPeriod:{regular:{start:end-22500,end}}},
    timestamp:[end-900,end-70],indicators:{quote:[{open:[100,500],close:[105,510]}]}};
  assert.equal(lastCompletedCandle(s,end+20).change,5);
});
test('multi-day chart baseline never substitutes for previous daily close',()=>{
  assert.equal(parse({range:'5d',previousClose:null}).change,null);
});
test('surrounding filings use India dates, matching symbol and unique original URLs',()=>{
  const row=(date,url,symbol='INFY')=>({symbol,publishedAt:date,url});
  const rows=[row('2026-11-11T20:00:00Z','a'),row('2026-11-14T17:59:00Z','b'),row('2026-11-14T18:30:00Z','c'),row('2026-11-13T12:00:00Z','d','TCS'),row('2026-11-11T20:00:00Z','a')];
  assert.deepEqual(filingsAroundMove(rows,'INFY','2026-11-13',Date.parse('2026-11-16')).map(r=>r.url),['b','a']);
  assert.deepEqual(filingsAroundMove(rows,'INFY',undefined),[]);
});

test('aggregate complete NSE session buckets and exclude the closing stub',()=>{
  const start=Date.parse('2026-11-13T09:15:00+05:30')/1000;
  const times=Array.from({length:25},(_,i)=>start+i*900);
  const bars={open:times.map((_,i)=>100+i),close:times.map((_,i)=>101+i)};
  const end=start+25*900;
  const s={meta:{dataGranularity:'15m',regularMarketTime:end},timestamp:times,indicators:{quote:[bars]}};
  for(const [minutes,first] of [[30,22],[60,20],[180,12]]){
    const candle=lastCompletedCandle(s,end,minutes);
    assert.equal(candle.open,100+first);
    assert.equal(candle.close,124);
    assert.equal(Date.parse(candle.end)-Date.parse(candle.start),minutes*60000);
  }
  assert.equal(lastCompletedCandle(s,start+10799,180),null);
  bars.open[14]=null;
  assert.equal(lastCompletedCandle(s,end,180),null);
});
