import asyncio, httpx, re

H = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"}

async def main():
    async with httpx.AsyncClient(headers=H, follow_redirects=True, timeout=15) as c:
        r = await c.get("https://www.ariva.de/fonds/vanguard-u-s-500-stock-index-fund-eur-acc?utp=1")
        t = r.text
        i = t.find("83,868")
        print(re.sub(r"\s+", " ", t[max(0, i - 1500): i + 700]))
        print("=== json-ish ===")
        for m in re.finditer(r'(?i)(nav|ruecknahme|rücknahme|ausgabepreis|kursdatum|"date"|datetime)[^<]{0,120}', t):
            s = m.group(0)
            if "2026" in s or "12.11" in s or "83" in s:
                print(s[:160])

asyncio.run(main())

