import urllib.request, re

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
url = 'https://myinvestor.es/_next/static/chunks/1mg10z9q586ci.js'

req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req, timeout=5) as r:
    js = r.read().decode('utf-8', errors='ignore')

# find URL or fetch in this chunk
urls = re.findall(r'["\'](https?://[^"\']+|/[^"\']+)["\']', js)
print('URLs in chunk:')
for u in urls:
    if 'api' in u or 'fund' in u or 'search' in u or 'invers' in u:
        print('  ', u)

