import urllib.request

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
url = 'https://myinvestor.es/_next/static/chunks/0-4zqlnoo7sof.js'

req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req, timeout=5) as r:
    js = r.read().decode('utf-8', errors='ignore')

# find where module 665747 starts
idx = js.find('665747,')
print('First 665747:', idx)
idx2 = js.find('665747,', idx+1)
print('Second 665747:', idx2)
if idx2 != -1:
    print(js[idx2:idx2+3000])
else:
    print(js[idx:idx+3000])
