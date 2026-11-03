import urllib.request, re

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
url = 'https://myinvestor.es/inversion/fondos-inversion/buscador'

req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req, timeout=10) as r:
    html = r.read().decode('utf-8', errors='ignore')

chunk_urls = re.findall(r'src=[\'"](/_next/static/chunks/[^"\']+\.js)[\'"]', html)

for c in chunk_urls:
    full_url = 'https://myinvestor.es' + c
    try:
        req = urllib.request.Request(full_url, headers=headers)
        with urllib.request.urlopen(req, timeout=5) as r:
            js = r.read().decode('utf-8', errors='ignore')
            if 'FundsDm' in js or 'getFunds' in js:
                print('FOUND in chunk:', c)
                idx = js.find('getFunds')
                print(js[max(0, idx-300):idx+500])
    except Exception as e:
        print('ERR on', c, e)

