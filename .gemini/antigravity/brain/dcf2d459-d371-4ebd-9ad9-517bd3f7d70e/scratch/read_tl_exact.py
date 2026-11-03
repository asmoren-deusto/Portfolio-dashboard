import urllib.request

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
url = 'https://myinvestor.es/_next/static/chunks/0-4zqlnoo7sof.js'

req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req, timeout=5) as r:
    js = r.read().decode('utf-8', errors='ignore')

idx = js.find('tl({tipo:')
print('Found tl({tipo: at', idx)
print(js[max(0, idx-400):idx+400])

