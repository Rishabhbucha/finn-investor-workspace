import {z} from 'zod';
import {readSnapshot} from '../../../lib/snapshot';
import {symbolOf,retrieve} from '../../../lib/engine.mjs';
import {synthesize} from '../../../lib/synthesis.mjs';
import {env} from 'cloudflare:workers';
import {discover} from '../../../lib/discovery';
import {getChatGPTUser} from '../../chatgpt-auth';
export async function POST(request:Request){
 const user=await getChatGPTUser();const standalone=(env as unknown as Record<string,string>).FINN_STANDALONE==='1';if(!user&&!standalone)return Response.json({error:'Sign in to research companies.'},{status:401});
 try{
  const body=z.object({symbol:z.string().max(25),question:z.string().min(5).max(1000),period:z.string().max(100).optional()}).parse(await request.json());const symbol=symbolOf(body.symbol);const question=String(body.question||'').trim();
  if(question.length<5||question.length>1000)return Response.json({error:'Ask a question between 5 and 1000 characters.'},{status:400});
  let data=await readSnapshot();
  let discoveryNote='';
  if(user&&!data.documents.some(d=>d.symbol===symbol)){try{const found=await discover(symbol);data=await readSnapshot();discoveryNote=found.failures.join(' ');}catch(e){discoveryNote=e instanceof Error?e.message:'Discovery unavailable.';}}
  const documents=data.documents.filter(d=>d.symbol===symbol && (!body.period||d.period===body.period));
  const evidence=retrieve(documents,symbol,question,8);
  const metadata=data.documents.filter(d=>d.symbol===symbol).map(({chunks,...doc})=>({...doc,chunkCount:chunks.length}));
  if(!evidence.length)return Response.json({mode:'missing',symbol,evidence:[],documents:metadata,message:'No matching primary-source evidence is available for this company and question. '+discoveryNote});
  const config=env as unknown as Record<string,string>;
  const result=await synthesize(user?config:{},{symbol,question,evidence});
  return Response.json({...result, discoveryNote, documents:metadata});
 }catch(e){return Response.json({error:e instanceof Error?e.message:'Research failed.'},{status:400});}
}
