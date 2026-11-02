import urllib.request, re

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
url = 'https://myinvestor.es/fondos-inversion/'

req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req, timeout=10) as r:
    html = r.read().decode('utf-8', errors='ignore')

idx = html.find('2032')
while idx != -1:
    print('Context around 2032:', html[max(0, idx-50):idx+50])
    idx = html.find('2032', idx+1)

