import urllib.request, re

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
url = 'https://myinvestor.es/inversion/fondos-inversion/buscador'

req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req, timeout=10) as r:
    html = r.read().decode('utf-8', errors='ignore')

# look for page chunks in script tags
chunks = re.findall(r'/_next/static/chunks/pages/[^"\']+\.js', html)
print('Page chunks:', chunks)
chunks_all = re.findall(r'/_next/static/chunks/[^"\']+\.js', html)
print('All chunks count:', len(chunks_all))
