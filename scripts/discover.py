"""Discover recent NSE transcript filings for ANY symbol, then reuse the PDF importer.
Usage: python scripts/discover.py --symbol WIPRO --limit 3
Period remains explicitly unverified until checked against the document.
"""
import argparse,datetime,json,re
from types import SimpleNamespace
from ingest import FILE,get,document,now
p=argparse.ArgumentParser();p.add_argument('--symbol',required=True);p.add_argument('--limit',type=int,default=3);a=p.parse_args()
symbol=a.symbol.strip().upper().removesuffix('.NS')
if not re.fullmatch(r'[A-Z0-9&-]{1,25}',symbol): raise SystemExit('Invalid symbol')
end=datetime.datetime.now();start=end-datetime.timedelta(days=180)
from urllib.parse import urlencode
url='https://www.nseindia.com/api/corporate-announcements?'+urlencode({'index':'equities','symbol':symbol,'from_date':start.strftime('%d-%m-%Y'),'to_date':end.strftime('%d-%m-%Y')})
rows=json.loads(get(url));data=json.loads(FILE.read_text(encoding='utf-8'));count=0
for row in rows:
    if count>=max(1,min(a.limit,5)):break
    title=row.get('desc','')+' '+row.get('attchmntText','')
    link=row.get('attchmntFile','')
    if row.get('symbol')!=symbol or 'transcript' not in title.lower() or not link.startswith('https://nsearchives.nseindia.com/'): continue
    try:
        document(data,SimpleNamespace(symbol=symbol,period='Reporting period unverified; filed '+row['an_dt'],title=symbol+' earnings transcript',url=link,file=None,type='transcript'));count+=1
    except Exception as e: print('Import failed:',str(e))
data['updatedAt']=now();FILE.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8');print('Imported',count,'documents for',symbol)
