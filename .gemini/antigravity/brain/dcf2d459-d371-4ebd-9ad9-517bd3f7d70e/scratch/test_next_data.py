import urllib.request, json

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
build_id = 'ZhELwkLmBldNUI8JohNzQ'

paths = [
    f'https://myinvestor.es/_next/data/{build_id}/inversion/fondos-inversion.json',
    f'https://myinvestor.es/_next/data/{build_id}/es/inversion/fondos-inversion.json',
]

for p in paths:
    try:
        req = urllib.request.Request(p, headers=headers)
        with urllib.request.urlopen(req, timeout=5) as r:
            data = json.loads(r.read().decode('utf-8'))
            print('SUCCESS:', p)
            print('Keys:', list(data.keys()))
            props = data.get('pageProps', {})
            print('pageProps keys:', list(props.keys()))
            # Look for fund list
            s = json.dumps(data)
            print('Contains LU0302296495?', 'LU0302296495' in s)
            print('Contains DNB?', 'DNB' in s)
    except Exception as e:
        print('ERR', p, ':', e)
