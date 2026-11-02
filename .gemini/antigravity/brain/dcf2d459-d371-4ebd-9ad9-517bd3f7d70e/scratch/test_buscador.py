import urllib.request, re

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
url = 'https://myinvestor.es/inversion/fondos-inversion/buscador'

req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req, timeout=10) as r:
    html = r.read().decode('utf-8', errors='ignore')
    print('Len:', len(html))
    # Look for API calls, fetch or axios in the html or scripts
    fetch_calls = re.findall(r'(?:https?://[^"\']+|/[^"\']+(?:api|funds|search|v1|v2)[^"\']*)', html)
    print('Fetch/API candidates:', [f for f in fetch_calls if 'static' not in f and 'font' not in f and 'img' not in f][:15])
