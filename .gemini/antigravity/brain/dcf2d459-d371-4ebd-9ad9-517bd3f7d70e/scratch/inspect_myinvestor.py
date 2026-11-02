import urllib.request, re

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
url = 'https://myinvestor.es/fondos-inversion/'

req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req, timeout=10) as r:
    html = r.read().decode('utf-8', errors='ignore')

idx = html.find('LU0302296495')
if idx != -1:
    print('FOUND ISIN LU0302296495 in MyInvestor:')
    print(html[max(0, idx-200):idx+400])
else:
    print('ISIN LU0302296495 not found directly')

for match in re.finditer(r'2032[.,]\d+', html):
    print('Found 2032 match:', match.group(0), 'context:', html[max(0, match.start()-100):match.end()+100])

