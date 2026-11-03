import urllib.request, re

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
url = 'https://myinvestor.es/inversion/fondos-inversion/'

req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req, timeout=10) as r:
    html = r.read().decode('utf-8', errors='ignore')
    print('Len:', len(html))
    # Look for API endpoints in scripts
    apis = set(re.findall(r'https?://[a-zA-Z0-9\.-]+/api/[a-zA-Z0-9_\/\?-]+', html))
    print('APIs found:', list(apis)[:10])
    # Look for any .json files or endpoints
    jsons = set(re.findall(r'https?://[a-zA-Z0-9\.-]+/[a-zA-Z0-9_\/\?-]+\.json', html))
    print('JSONs found:', list(jsons)[:10])
    # Look for script src
    scripts = re.findall(r'src=[\'"]([^\'"]*main[^\'"]*\.js|[^\'"]*app[^\'"]*\.js|[^\'"]*funds[^\'"]*\.js)[\'"]', html)
    print('Scripts found:', scripts[:5])

