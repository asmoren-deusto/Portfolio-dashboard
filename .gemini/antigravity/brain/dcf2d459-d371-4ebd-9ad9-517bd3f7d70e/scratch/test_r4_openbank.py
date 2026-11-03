import urllib.request, json, re

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

# 1. Renta 4
r4_urls = [
    'https://www.r4.com/fondos-inversion/ficha/LU0302296495',
    'https://www.r4.com/fondos/detalle/LU0302296495',
    'https://www.r4.com/buscador-fondos/ficha?isin=LU0302296495'
]

for u in r4_urls:
    try:
        req = urllib.request.Request(u, headers=headers)
        with urllib.request.urlopen(req, timeout=5) as r:
            html = r.read().decode('utf-8', errors='ignore')
            print(f'R4 OK {u}: status={r.status}, len={len(html)}')
            for n in ['2032', '2073', '2.032', '2.073']:
                if n in html:
                    print(f'   R4 FOUND {n}')
    except Exception as e:
        print(f'R4 ERR {u}: {e}')

# 2. Openbank
ob_urls = [
    'https://www.openbank.es/fondos-inversion/ficha/LU0302296495',
    'https://www.openbank.es/buscador-fondos/ficha/LU0302296495'
]
for u in ob_urls:
    try:
        req = urllib.request.Request(u, headers=headers)
        with urllib.request.urlopen(req, timeout=5) as r:
            html = r.read().decode('utf-8', errors='ignore')
            print(f'OB OK {u}: status={r.status}, len={len(html)}')
    except Exception as e:
        print(f'OB ERR {u}: {e}')

