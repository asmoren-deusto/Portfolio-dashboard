import urllib.request, re

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
url = 'https://myinvestor.es/_next/static/ZhELwkLmBldNUI8JohNzQ/_buildManifest.js'

req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req, timeout=5) as r:
    text = r.read().decode('utf-8', errors='ignore')
    # find page routes
    pages = re.findall(r'"(/[^"]+)"', text)
    fund_pages = [p for p in pages if 'fondo' in p or 'invest' in p or 'buscad' in p]
    print('Fund pages found in build manifest:')
    for p in fund_pages:
        print('  ', p)
