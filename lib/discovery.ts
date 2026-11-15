import {extractText,getDocumentProxy} from 'unpdf';
import {updateSnapshot,type Snapshot} from './snapshot';
import {normalizeFilings} from './market.mjs';
import {hasCallContent} from './transcripts.mjs';
const MAX_BYTES=4*1024*1024;
async function boundedPDF(url:string){
 const u=new URL(url);if(u.origin!=='https://nsearchives.nseindia.com'||!u.pathname.startsWith('/corporate/'))throw Error('Only exchange-hosted documents are accepted.');
 const r=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(20000)});
 if(!r.ok||!r.body)throw Error('Exchange document is unavailable.');
 if(Number(r.headers.get('content-length'))>MAX_BYTES)throw Error('Document exceeds the 4 MB prototype limit.');
 const reader=r.body.getReader();const parts:Uint8Array[]=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>MAX_BYTES)throw Error('Document exceeds the 4 MB prototype limit.');parts.push(value);}}finally{await reader.cancel();}
 const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}return bytes;
}
export async function discover(symbol:string){
 const end=new Date();const start=new Date(end.getTime()-180*86400000);const fmt=(d:Date)=>d.toISOString().slice(0,10).split('-').reverse().join('-');
 const query=new URLSearchParams({index:'equities',symbol,from_date:fmt(start),to_date:fmt(end)});
 const r=await fetch('https://www.nseindia.com/api/corporate-announcements?'+query,{headers:{'User-Agent':'Mozilla/5.0','Accept':'application/json'},signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error('Company discovery source returned HTTP '+r.status);
 const filings=normalizeFilings(await r.json(),[symbol]).filter((a:{title:string})=>/transcript/i.test(a.title)).sort((a:{publishedAt:string},b:{publishedAt:string})=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)).slice(0,5);
 const docs:Snapshot['documents']=[];const failures:string[]=[];
 for(const filing of filings){
  if(docs.length>=2)break;
  try{
   const bytes=await boundedPDF(filing.url);const hash=await crypto.subtle.digest('SHA-256',bytes);const id=Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,20);
   const pdf=await getDocumentProxy(bytes,{maxImageSize:1000000});
   try{
    if(pdf.numPages>60)throw Error('Transcript exceeds the 60-page prototype limit.');
    const {text}=await extractText(pdf,{mergePages:false});const chunks:{page:number;text:string}[]=[];
    text.forEach((page:string,i:number)=>{for(let j=0;j<page.length;j+=1300){const part=page.slice(j,j+1600);if(part.trim().length>60)chunks.push({page:i+1,text:part});}});
    if(!chunks.length)throw Error('No text was extracted; this document may need OCR.');
    if(!hasCallContent(chunks))throw Error('The exchange attachment did not contain a verifiable earnings-call conversation.');
    docs.push({id,symbol,title:symbol+' earnings transcript',type:'transcript',period:'Reporting period unverified; filed '+filing.publishedAt.slice(0,10),url:filing.url,fetchedAt:new Date().toISOString(),chunks});
   }finally{await pdf.loadingTask.destroy();}
  }catch(e){failures.push(e instanceof Error?e.message:'Document extraction failed.');}
 }
 if(docs.length) await updateSnapshot(current => ({
   ...current, documents:[...new Map([...current.documents,...docs].map(d=>[d.id,d])).values()]
 }));
 return {documents:docs,failures:[...new Set(failures)]};
}
