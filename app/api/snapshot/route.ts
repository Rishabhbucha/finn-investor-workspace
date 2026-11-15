import {readSnapshot} from '../../../lib/snapshot';
import {classify} from '../../../lib/engine.mjs';
export async function GET(){ const data=await readSnapshot(); return Response.json({...data,documents:data.documents.map(({chunks,...d})=>({...d,chunkCount:chunks.length})),announcements:data.announcements.map(a=>({...a,...classify(a.title)}))}); }
