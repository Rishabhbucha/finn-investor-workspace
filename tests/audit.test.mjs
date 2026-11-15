import test from 'node:test';
import assert from 'node:assert/strict';
import { digest, marketAlert, validateAnswer, retrieve } from '../lib/engine.mjs';
import { completedPrice } from '../lib/market.mjs';
import { synthesize } from '../lib/synthesis.mjs';
import { hasCallContent } from '../lib/transcripts.mjs';
import { updateStoredSnapshot, mergeMarketUpdate } from '../lib/storage.mjs';

test('an out-of-window duplicate cannot hide a current filing', () => {
  const recent = {symbol:'TCS',url:'a',priority:80,publishedAt:'2026-11-14T10:00:00Z'};
  const older = {...recent,publishedAt:'2025-01-01T00:00:00Z'};
  assert.deepEqual(digest([older,recent],{symbols:['TCS'],now:Date.parse('2026-11-14T11:00:00Z')}),[recent]);
});
test('missing volume stays unknown', () => {
  assert.equal(marketAlert({volume:null,averageVolume:50},{volume:2,price:3}).ratio,null);
});
test('a transcript availability notice is not a call', () => {
  assert.equal(hasCallContent([{text:'Dear investors, the transcript of the earnings call is available on our website.'}]),false);
});
test('20 prior observations plus the current day suffice', () => {
  const raw={chart:{result:[{timestamp:Array.from({length:21},(_,i)=>1735689600+i*86400),indicators:{quote:[{close:Array(21).fill(10),volume:Array(21).fill(50)}]}}]}};
  assert.equal(completedPrice('TEST',raw,new Date('2026-01-01')).averageVolume,50);
});
test('invalid model limitations and empty claims are rejected', () => {
  const answer={summary:'Review',claims:[{text:'Revenue rose',citations:['S1']}],limitations:[{}]};
  const refs=[{citation:'S1'}];
  assert.throws(()=>validateAnswer(answer,refs));
  assert.throws(()=>validateAnswer({...answer,limitations:[],claims:[{text:' ',citations:['S1']}]},refs));
});
test('question filler cannot turn irrelevant text into evidence', () => {
  const docs=[{id:'a',symbol:'ABC',type:'transcript',chunks:[{page:1,text:'There are other matters.'}]}];
  assert.deepEqual(retrieve(docs,'ABC','What are the risks to cash conversion?'),[]);
});

test('a competing document import survives a stale market refresh', async () => {
  const seed = {documents:[],prices:[],announcements:[],updatedAt:'2026-11-11',health:[]};
  let stored = structuredClone(seed), version = 1, writes = 0;
  const bucket = {
    async get() {const copy=structuredClone(stored); return {etag:String(version),json:async()=>copy}},
    async put(key,body,{onlyIf}) {
      if (++writes === 1) {stored.documents.push({id:'new'}); version++;}
      if (onlyIf.etagMatches!==String(version)) return null;
      stored=JSON.parse(body);return {etag:String(++version)};
    }
  };
  const incoming={...seed,updatedAt:'2026-11-12',prices:[{symbol:'TCS',date:'2026-11-12'}]};
  await updateStoredSnapshot(bucket,'snapshot',seed,current=>mergeMarketUpdate(current,incoming));
  assert.equal(writes,2);
  assert.equal(stored.documents[0].id,'new');
  assert.equal(stored.prices[0].symbol,'TCS');
});
test('gateway failures, malformed output and missing configuration preserve cited evidence', async () => {
  const input={symbol:'TCS',question:'Revenue?',evidence:[{citation:'S1'}]};
  const config={AI_GATEWAY_URL:'https://gateway.example',AI_GATEWAY_KEY:'test'};
  for (const result of [
    await synthesize({},input),
    await synthesize(config,input,async()=>{throw Error('timeout')}),
    await synthesize(config,input,async()=>Response.json({claims:[]}))
  ]) {
    assert.equal(result.mode,'evidence');
    assert.deepEqual(result.evidence,input.evidence);
  }
  const answer={summary:'Revenue',claims:[{text:'Source statement',citations:['S1']}],limitations:[]};
  assert.equal((await synthesize(config,input,async()=>Response.json(answer))).mode,'analysis');
});
