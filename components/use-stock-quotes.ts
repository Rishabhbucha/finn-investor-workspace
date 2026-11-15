'use client';
import {useState,useEffect} from 'react';
import type {Observation as Quote} from './candle-movement';

export function useStockQuotes(symbols:string[]){
  const [quotes,setQuotes] = useState<Record<string,Quote>>({});
  useEffect(()=>{
    if (!symbols.length) return;
    const controller = new AbortController();
    let fetching = false;
    async function poll(){
      if(fetching || document.hidden) return;
      fetching = true;
      try{
        const response = await fetch('/api/quotes?'+new URLSearchParams({symbols:symbols.join(',')}),{signal:controller.signal,cache:'no-store'});
        if(!response.ok)throw Error('Quotes unavailable');
        const data = await response.json() as {quotes:Quote[]};
        if(!controller.signal.aborted)setQuotes(prev=>{
          const next={...prev};
          for(const item of data.quotes)next[item.symbol]=item.price || !prev[item.symbol]?.price ? item : {...prev[item.symbol],status:'cached'};
          return next;
        });
      }catch{
        if(!controller.signal.aborted)setQuotes(prev=>Object.fromEntries(Object.entries(prev).map(([s,q])=>[s,{...q,status:'cached'}])));
      }finally{fetching=false}
    }
    void poll();
    const timer = window.setInterval(poll,60_000);
    document.addEventListener('visibilitychange',poll);
    return ()=>{controller.abort();clearInterval(timer);document.removeEventListener('visibilitychange',poll)};
  },[symbols]);

  return quotes;
}
