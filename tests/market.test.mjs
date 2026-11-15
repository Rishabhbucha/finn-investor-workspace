import test from 'node:test';
import assert from 'node:assert/strict';
import {completedPrice,filingDate,normalizeFilings,refreshSnapshot} from '../lib/market.mjs';
const raw={chart:{result:[{timestamp:Array.from({length:23},(_,i)=>Date.parse(`2026-10-${String(i+1).padStart(2,'0')}T03:45:00Z`)/1000),indicators:{quote:[{close:Array.from({length:23},(_,i)=>100+i),volume:Array.from({length:23},(_,i)=>i===22?5000:100)}]}}]}};
test('unfinished daily candle is excluded before 16 IST',()=>{const p=completedPrice('INFY',raw,new Date('2026-10-23T08:00:00Z'));assert.equal(p.close,121);assert.equal(p.volume,100)});
test('volume baseline excludes current day',()=>{const p=completedPrice('INFY',raw,new Date('2026-10-23T12:00:00Z'));assert.equal(p.volume,5000);assert.equal(p.averageVolume,100)});
test('NSE timestamps retain IST offset',()=>{assert.equal(filingDate('13-Nov-2026 12:30:00'),'2026-11-13T12:30:00+05:30');assert.equal(filingDate('not a date'),null)});
test('filings accept only the requested companies and exchange PDFs',()=>{const a={symbol:'INFY',an_dt:'13-Nov-2026 12:30:00',attchmntFile:'https://nsearchives.nseindia.com/corporate/report.pdf',desc:'Results'};assert.equal(normalizeFilings([a,{...a,symbol:'OTHER'},{...a,attchmntFile:'javascript:alert(1)'}],['INFY']).length,1)});
test('failed refresh retains last good values and records errors',async()=>{const data={companies:[{symbol:'INFY'}],prices:[{symbol:'INFY',close:999}],announcements:[{symbol:'INFY',url:'old'}],documents:[]};const out=await refreshSnapshot(data,async()=>{throw Error('unavailable')},new Date('2026-11-13T12:00:00Z'));assert.deepEqual(out.prices,data.prices);assert.deepEqual(out.announcements,data.announcements);assert.equal(out.health.filter(h=>!h.ok).length,2)});
