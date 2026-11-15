"""Public-source snapshot refresh and generic primary PDF importer. Never fabricates fallback data."""
import argparse, json, hashlib, datetime, urllib.request, urllib.parse, concurrent.futures
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
FILE=ROOT/'data/snapshot.json'
def get(url):
    req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0','Accept':'application/json,text/html,application/pdf,*/*'})
    with urllib.request.urlopen(req,timeout=25) as r: return r.read()
def now(): return datetime.datetime.now(datetime.timezone.utc).isoformat()
def price(symbol):
    url='https://query1.finance.yahoo.com/v8/finance/chart/'+urllib.parse.quote(symbol+'.NS')+'?range=3mo&interval=1d'
    raw=json.loads(get(url)); r=raw['chart']['result'][0]; q=r['indicators']['quote'][0]
    rows=[(t,c,v) for t,c,v in zip(r['timestamp'],q['close'],q['volume']) if c is not None and v is not None]
    if len(rows)<21: raise ValueError('Insufficient trading-day history')
    ist=datetime.timezone(datetime.timedelta(hours=5,minutes=30));local=datetime.datetime.now(ist)
    rows=[row for row in rows if row[1]>0 and row[2]>=0 and (datetime.datetime.fromtimestamp(row[0],ist).date()<local.date() or (datetime.datetime.fromtimestamp(row[0],ist).date()==local.date() and local.hour>=16))]
    if len(rows)<21: raise ValueError('Insufficient completed trading-day history')
    t,c,v=rows[-1]; return {'symbol':symbol,'close':c,'previousClose':rows[-2][1],'volume':v,'averageVolume':sum(x[2] for x in rows[-21:-1])/20,'date':datetime.datetime.fromtimestamp(t,datetime.timezone.utc).date().isoformat(),'url':url,'fetchedAt':now()}
def refresh(data):
    health=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        futures={pool.submit(price,c['symbol']):c['symbol'] for c in data['companies']}
        for f,s in futures.items():
            try:
                item=f.result();data['prices']=[p for p in data['prices'] if p['symbol']!=s]+[item];health.append({'source':'Yahoo '+s,'ok':True,'at':now()})
            except Exception as e: health.append({'source':'Yahoo '+s,'ok':False,'error':str(e),'at':now()})
    try:
        end=datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=5,minutes=30)))
        start=end-datetime.timedelta(days=30)
        raw=json.loads(get('https://www.nseindia.com/api/corporate-announcements?index=equities&from_date='+start.strftime('%d-%m-%Y')+'&to_date='+end.strftime('%d-%m-%Y')))
        if not isinstance(raw,list): raise ValueError('Unexpected exchange response')
        portfolio={c['symbol'] for c in data['companies']}; count=0
        for a in raw:
            if a.get('symbol') not in portfolio: continue
            date=datetime.datetime.strptime(a['an_dt'],'%d-%b-%Y %H:%M:%S').replace(tzinfo=datetime.timezone(datetime.timedelta(hours=5,minutes=30))).isoformat()
            url=a.get('attchmntFile','');title=a.get('desc','')+' — '+a.get('attchmntText','')
            if not url.startswith('https://nsearchives.nseindia.com/'): continue
            data['announcements'].append({'id':hashlib.sha256(url.encode()).hexdigest()[:16],'symbol':a['symbol'],'title':title,'publishedAt':date,'url':url,'origin':'NSE live feed'});count+=1
        health.append({'source':'NSE announcements','ok':True,'count':count,'at':now()})
    except Exception as e: health.append({'source':'NSE announcements','ok':False,'error':str(e),'at':now()})
    data['announcements']=list({(a['symbol'],a['url']):a for a in data['announcements']}.values())
    data['health']=health

def document(data,args):
    import pymupdf
    if not args.symbol or not args.period or not args.title or not args.url: raise ValueError('Document requires symbol, period, title and original source URL')
    u=urllib.parse.urlparse(args.url)
    if u.scheme!='https': raise ValueError('Use an HTTPS primary-source URL')
    content=Path(args.file).read_bytes() if args.file else get(args.url)
    pdf=pymupdf.open(stream=content,filetype='pdf'); chunks=[]
    for i,page in enumerate(pdf):
        text=page.get_text().strip()
        for offset in range(0,len(text),1300):
            part=text[offset:offset+1600]
            if len(part)>60: chunks.append({'page':i+1,'text':part})
    if not chunks: raise ValueError('No extractable text; scanned document needs OCR')
    ident=hashlib.sha256(content).hexdigest()[:20]
    item={'id':ident,'symbol':args.symbol.upper().removesuffix('.NS'),'period':args.period,'title':args.title,'type':args.type,'url':args.url,'fetchedAt':now(),'chunks':chunks}
    data['documents']=[d for d in data['documents'] if d['id']!=ident]+[item]
    print('Imported',args.symbol,len(chunks),'chunks')

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--refresh',action='store_true');p.add_argument('--url');p.add_argument('--file');p.add_argument('--symbol');p.add_argument('--period');p.add_argument('--title');p.add_argument('--type',choices=['annual_report','transcript'],default='transcript');args=p.parse_args()
    data=json.loads(FILE.read_text(encoding='utf-8'))
    if args.refresh: refresh(data)
    if args.url: document(data,args)
    data['updatedAt']=now();FILE.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'prices':len(data['prices']),'announcements':len(data['announcements']),'documents':len(data['documents']),'health':data['health']}))
