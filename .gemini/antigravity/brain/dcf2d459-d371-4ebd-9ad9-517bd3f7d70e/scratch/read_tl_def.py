import urllib.request

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
url = 'https://myinvestor.es/_next/static/chunks/0-4zqlnoo7sof.js'

req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req, timeout=5) as r:
    js = r.read().decode('utf-8', errors='ignore')

idx = js.find('a2e8e18ad26a079c576038f0ad4fa18ce0d9e415f5bf6f43f89cf3831a0e4685__')
print(js[max(0, idx-600):idx+100])
