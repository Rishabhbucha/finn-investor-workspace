import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {compileIndicator} from '../lib/watch-indicators.mjs';

test('gain and loss match at exactly 3%; incomplete bars and zero division do not match',()=>{
  const testRule=compileIndicator(readFileSync(new URL('../public/examples/three-percent-candle.pine',import.meta.url),'utf8'));
  for(const [open,close,expected] of [[100,103,true],[100,97,true],[100,98,false],[100,null,false],[0,1,false]])assert.equal(testRule({open,close}),expected);
});
test('compound rules respect operator precedence and missing data',()=>{
  const matches=compileIndicator('dayPct < -3 or candlePct >= 3 and price > 100');
  assert.equal(matches({dayPct:-4}),true);
  assert.equal(matches({dayPct:0,candlePct:4,price:99}),false);
  assert.equal(matches({dayPct:0,candlePct:4,price:101}),true);
  assert.equal(matches({dayPct:null,candlePct:null}),false);
});
test('unsupported code fails before activation',()=>{
  for(const src of ['ta.rsi(close,14) > 50','close[1] > 0','price + 1','1 and 2','price >=','a = 3','constructor()','while true'])assert.throws(()=>compileIndicator(src));
});
