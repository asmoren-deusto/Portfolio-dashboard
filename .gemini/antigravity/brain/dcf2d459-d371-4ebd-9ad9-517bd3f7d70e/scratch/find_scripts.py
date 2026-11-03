import urllib.request, re

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
url = 'https://myinvestor.es/inversion/fondos-inversion/'

req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req, timeout=10) as r:
    html = r.read().decode('utf-8', errors='ignore')

scripts = re.findall(r'<script[^>]*src=[\'"]([^\'"]+)[\'"]', html)
print('All scripts:', len(scripts))
for s in scripts:
    if 'myinvestor' in s or s.startswith('/'):
        print('  Script:', s)

