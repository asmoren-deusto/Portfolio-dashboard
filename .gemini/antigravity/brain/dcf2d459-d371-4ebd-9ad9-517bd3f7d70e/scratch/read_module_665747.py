import urllib.request

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
url = 'https://myinvestor.es/_next/static/chunks/0-4zqlnoo7sof.js'

req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req, timeout=5) as r:
    js = r.read().decode('utf-8', errors='ignore')

# find where module 665747 is registered
idx = js.find(',665747,')
if idx == -1:
    idx = js.find('665747:')
print('idx:', idx)
print(js[max(0, idx-500):idx+1200])

