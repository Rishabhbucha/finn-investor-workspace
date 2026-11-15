export function symbolOf(value) {
 const s=String(value||'').trim().toUpperCase().replace(/\.(NS|BO)$/, '');
 if(!/^[A-Z0-9&-]{1,25}$/.test(s)) throw new Error('Enter a valid NSE symbol.'); return s;
}
export function change(current,previous){return Number.isFinite(current)&&Number.isFinite(previous)&&previous>0?(current-previous)/previous*100:null;}
export function marketAlert(row, prefs){
 const price=change(row.close,row.previousClose);
 const ratio=Number.isFinite(row.volume)&&row.volume>=0&&Number.isFinite(row.averageVolume)&&row.averageVolume>0?row.volume/row.averageVolume:null;
 return {price,ratio,triggered:(price!==null&&Math.abs(price)>=prefs.price)||(ratio!==null&&ratio>=prefs.volume)};
}
export function classify(title){
 if(/^(copy of newspaper publication|ESOP\/ESOS|trading window)/i.test(title))return {category:'routine',priority:15};
 if(/change in management|retirement of (?:director|chief)|^retirement\b/i.test(title))return {category:'management_change',priority:80};
 if(/action\(s\) taken or orders passed/i.test(title))return {category:'litigation',priority:85};
 if(/(?:board meeting.*(?:intimat|notice|scheduled)|intimat.*board meeting)/i.test(title))return {category:'routine',priority:15};
 if(/schedule of (?:analyst|investor|meet)|investor meet.*schedule/i.test(title))return {category:'investor_meetings',priority:15};
 const rules=[['press_release',/bagging|receiving.*orders|order win/i,70],['management_change',/resign|appoint.*(?:chief|cfo|ceo|director)|management change/i,80],['results',/financial result|quarterly result|earnings release/i,90],['M&A',/acqui|merger|demerger|joint venture/i,85],['litigation',/penalty|litigation|regulatory order|default/i,85],['earnings_call',/transcript|earnings call|conference call/i,65],['dividend',/dividend/i,55],['credit_rating',/credit rating|rating.*(?:upgrade|downgrade)/i,65],['routine',/meeting|compliance|certificate|trading window/i,15]];
 const r=rules.find(x=>x[1].test(title)); return {category:r?.[0]||'other',priority:r?.[2]||40};
}
export function digest(rows,{symbols,hours=24,category='all',now=Date.now()}){
 const latest = new Map();
 for (const row of rows) {
   const at = Date.parse(row.publishedAt);
   if (!symbols.includes(row.symbol) || !Number.isFinite(at) || at > now || at < now-hours*3600000) continue;
   if (category !== 'all' && category !== row.category) continue;
   const key = row.symbol + '|' + row.url;
   if (!latest.has(key) || at > Date.parse(latest.get(key).publishedAt)) latest.set(key,row);
 }
 return [...latest.values()].sort((a,b)=>b.priority-a.priority || Date.parse(b.publishedAt)-Date.parse(a.publishedAt));
}
export function retrieve(documents,symbol,question,limit=8){
 const terms=[...new Set(question.toLowerCase().match(/[a-z]{3,}/g)||[])].filter(w=>!['the','and','did','what','this','company','with','from','does','its','for','was','are','has','have','how','who','which','about','can','tell','say','you','into','would','could'].includes(w));
 if(/guid|promise|deliver/.test(question.toLowerCase()))terms.push('guidance','expect','margin','growth');
 const perDocument=new Map();
 return documents.filter(d=>d.symbol===symbol&&['annual_report','transcript'].includes(d.type)).flatMap(d=>d.chunks.map(c=>({...c,documentId:d.id,title:d.title,url:d.url,period:d.period,type:d.type,score:terms.reduce((n,t)=>n+(c.text.toLowerCase().includes(t)?1:0),0)+(/guid|promise|deliver/i.test(question)&&/guidance|we expect|we anticipate/i.test(c.text)?5:0)}))).filter(c=>c.score>0).sort((a,b)=>b.score-a.score).filter(c=>{const n=perDocument.get(c.documentId)||0;if(n>=3)return false;perDocument.set(c.documentId,n+1);return true;}).slice(0,limit).map((c,i)=>({...c,citation:'S'+(i+1)}));
}
export function validateAnswer(value,evidence){
 if(!value||typeof value.summary!=='string'||!value.summary.trim()||!Array.isArray(value.claims))throw new Error('Provider returned an invalid response.');
 const ids=new Set(evidence.map(x=>x.citation));
 if(!value.claims.length||value.claims.some(c=>!c||typeof c.text!=='string'||!c.text.trim()||!Array.isArray(c.citations)||!c.citations.length||c.citations.some(id=>!ids.has(id))))throw new Error('Provider returned claims without valid source references.');
 if(value.limitations!==undefined && (!Array.isArray(value.limitations)||value.limitations.some(x=>typeof x!=='string')))throw Error('Invalid provider limitations.');
 return {summary:value.summary,claims:value.claims,limitations:Array.isArray(value.limitations)?value.limitations:[]};
}
