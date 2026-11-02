import urllib.request, re

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
url = 'https://myinvestor.es/inversion/fondos-inversion/buscador'

req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req, timeout=10) as r:
    html = r.read().decode('utf-8', errors='ignore')

# look for iframe
iframes = re.findall(r'<iframe[^>]*src=[\'"]([^\'"]+)[\'"]', html)
print('Iframes:', iframes)

# look for form actions
forms = re.findall(r'<form[^>]*action=[\'"]([^\'"]+)[\'"]', html)
print('Forms:', forms)

# look for search input or placeholder
inputs = re.findall(r'<input[^>]+>', html)
print('Inputs found:', len(inputs))
for inp in inputs:
    if 'busc' in inp.lower() or 'isin' in inp.lower() or 'placeholder' in inp.lower():
        print('  Input:', inp)
