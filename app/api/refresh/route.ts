import {readSnapshot,updateSnapshot} from '../../../lib/snapshot';
import {mergeMarketUpdate} from '../../../lib/storage.mjs';
import {refreshSnapshot} from '../../../lib/market.mjs';
import {getChatGPTUser} from '../../chatgpt-auth';
export async function POST(request:Request){
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Cross-origin update rejected.'},{status:403});
 const user=await getChatGPTUser();if(!user)return Response.json({error:'Sign in to refresh the workspace.'},{status:401});
 try{
  const current=await readSnapshot();
  if(current.health.some(h=>Date.now()-Date.parse(h.at)<60000))return Response.json({message:'A recent snapshot is already available.'});
  const updated=await refreshSnapshot(current);
  await updateSnapshot(latest => mergeMarketUpdate(latest,updated));
  const failed=updated.health.filter((h:{ok:boolean})=>!h.ok).length;
  return Response.json({message:failed?`Refresh saved. ${failed} sources failed; last good values were retained.`:'Latest available data saved.',failed});
 }catch(e){return Response.json({error:e instanceof Error?e.message:'Refresh failed.'},{status:503});}
}
