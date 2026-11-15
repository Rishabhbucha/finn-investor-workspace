export function completedPrice(symbol, raw, now=new Date()) {
 const r=raw?.chart?.result?.[0];const q=r?.indicators?.quote?.[0];
 if(!r||!q)throw new Error('Price source returned no usable series.');
 const istDate=d=>new Date(d.getTime()+19800000).toISOString().slice(0,10);
 const local=new Date(now.getTime()+19800000);const today=istDate(now);
 const rows=r.timestamp.map((t,i)=>({date:istDate(new Date(t*1000)),close:q.close[i],volume:q.volume[i]})).filter(x=>Number.isFinite(x.close)&&x.close>0&&Number.isFinite(x.volume)&&x.volume>=0&&x.date<=today&&!(x.date===today&&local.getUTCHours()<16));
 if(rows.length<21)throw new Error('Not enough completed trading observations.');
 const last=rows.at(-1);return {symbol,...last,previousClose:rows.at(-2).close,averageVolume:rows.slice(-21,-1).reduce((n,x)=>n+x.volume,0)/20,fetchedAt:now.toISOString(),url:'https://finance.yahoo.com/quote/'+encodeURIComponent(symbol+'.NS')+'/history/'};
}
export function filingDate(value){
 const m=/^(\d{2})-([A-Za-z]{3})-(\d{4}) (\d{2}:\d{2}:\d{2})$/.exec(value||'');
 if(!m)return null;const month=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(m[2])+1;
 if(!month)return null;const iso=`${m[3]}-${String(month).padStart(2,'0')}-${m[1]}T${m[4]}+05:30`;
 return Number.isFinite(Date.parse(iso))?iso:null;
}
export function normalizeFilings(rows,symbols){
 if(!Array.isArray(rows))throw new Error('Exchange returned an unexpected response.');
 return rows.filter(a=>symbols.includes(a.symbol)).flatMap(a=>{
  const publishedAt=filingDate(a.an_dt);const url=a.attchmntFile;
  if(!publishedAt||typeof url!=='string'||!url.startsWith('https://nsearchives.nseindia.com/'))return [];
  return [{id:a.symbol+'|'+url,symbol:a.symbol,publishedAt,url,title:[a.desc,a.attchmntText].filter(Boolean).join(' — '),origin:'NSE live feed'}];
 });
}
export async function refreshSnapshot(data,fetcher=fetch,now=new Date()){
 const health=[];const prices=[...data.prices];
 const json=async url=>{const r=await fetcher(url,{headers:{'User-Agent':'Mozilla/5.0','Accept':'application/json'},signal:AbortSignal.timeout(15000)});if(!r.ok)throw new Error('Source returned HTTP '+r.status);return r.json();};
 for(let i=0;i<data.companies.length;i+=4){await Promise.all(data.companies.slice(i,i+4).map(async c=>{
  try{const raw=await json('https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(c.symbol+'.NS')+'?range=3mo&interval=1d');const p=completedPrice(c.symbol,raw,now);const idx=prices.findIndex(x=>x.symbol===c.symbol);if(idx>=0)prices[idx]=p;else prices.push(p);health.push({source:'Yahoo '+c.symbol,ok:true,at:now.toISOString()});}
  catch(e){health.push({source:'Yahoo '+c.symbol,ok:false,error:e.message,at:now.toISOString()});}
 }));}
 let announcements=data.announcements;
 try{
  const fmt=d=>{const x=new Date(d.getTime()+19800000).toISOString().slice(0,10).split('-');return x.reverse().join('-');};
  const rows=await json('https://www.nseindia.com/api/corporate-announcements?index=equities&from_date='+fmt(new Date(now.getTime()-30*86400000))+'&to_date='+fmt(now));
  const items=normalizeFilings(rows,data.companies.map(c=>c.symbol));const all=new Map([...announcements,...items].map(a=>[a.symbol+'|'+a.url,a]));announcements=[...all.values()];
  health.push({source:'NSE announcements',ok:true,count:items.length,at:now.toISOString()});
 }catch(e){health.push({source:'NSE announcements',ok:false,error:e.message,at:now.toISOString()});}
 return {...data,prices,announcements,health,updatedAt:now.toISOString()};
}
