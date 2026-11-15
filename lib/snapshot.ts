import {env} from 'cloudflare:workers';
import seed from '../data/snapshot.json';
import {updateStoredSnapshot} from './storage.mjs';
import {isUsableDocument} from './transcripts.mjs';
export type Snapshot=typeof seed;
const KEY='finn/snapshot-v1.json';
function bucket(){return (env as unknown as {BUCKET?:R2Bucket}).BUCKET;}
export async function readSnapshot():Promise<Snapshot>{
 const object=await bucket()?.get(KEY);
 const data=object?await object.json<Snapshot>():structuredClone(seed);
 return {...data,documents:data.documents.filter(isUsableDocument)};
}
export async function updateSnapshot(merge:(current:Snapshot)=>Snapshot):Promise<Snapshot>{
 return updateStoredSnapshot(bucket(),KEY,seed,merge);
}
