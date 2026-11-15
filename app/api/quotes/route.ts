import seed from '../../../data/snapshot.json';
import {getQuote} from '../../../lib/watch-quotes.mjs';

const universe = new Set(seed.companies.map(c=>c.symbol));
export async function GET(request:Request) {
  const symbols = [...new Set((new URL(request.url).searchParams.get('symbols') || '').split(',').filter(Boolean))];
  if (!symbols.length || symbols.length > universe.size || symbols.some(symbol=>!universe.has(symbol))) {
    return Response.json({error:'Choose stocks from the portfolio.'},{status:400});
  }
  const quotes = [];
  for (let index=0; index<symbols.length; index+=6) {
    quotes.push(...await Promise.all(symbols.slice(index,index+6).map(getQuote)));
  }
  return Response.json({quotes},{headers:{'Cache-Control':'no-store'}});
}
