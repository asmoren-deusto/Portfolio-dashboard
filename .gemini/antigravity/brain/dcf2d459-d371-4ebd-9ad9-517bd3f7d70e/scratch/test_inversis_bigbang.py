import urllib.request, re

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
url = 'https://www.inversis.com/servlet/Satellite?cid=1113209502057&pagename=bigbang/Page/TplFondosMasSolicitados&pid=1080719264902&c=Page&versionAntigua=S'

req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req, timeout=10) as r:
    html = r.read().decode('utf-8', errors='ignore')
    print('Len:', len(html))
    # look for form actions or links to fund detail
    links = re.findall(r'href=[\'"]([^\'"]*ficha[^\'"]*|/servlet/Satellite[^\'"]*)[\'"]', html)
    print('Links found:', links[:10])
    # look for servlets
    servlets = set(re.findall(r'/servlet/[a-zA-Z0-9_\?=&]+', html))
    print('Servlets found:', list(servlets)[:10])
