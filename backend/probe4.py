import asyncio, httpx, re, sys
sys.path.insert(0, "backend")

H = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
     "Accept-Language": "de-DE,de;q=0.9,en;q=0.8"}

ISINS = ["IE0032126645", "ES0112611001", "LU0302296495", "LU0261952682",
         "IE00BYX5NH74", "IE000QAZP7L2", "LU0171307068", "IE00B03HD191", "LU1598719752"]

def num(s):
    s = s.replace("\xa0", " ").replace("&nbsp;", " ").replace("&euro;", "").replace("€", "").strip()
    s = s.replace(".", "").replace(",", ".") if "," in s else s
    return float(re.sub(r"[^\d\.\-+]", "", s))

async def one(c, isin):
    try:
        r = await c.get(f"https://www.ariva.de/search/search.m?searchname={isin}")
        t = r.text
        m_close = re.search(r'id="close_for_push_[^"]+">([\d\.]+)<', t)
        m_q = re.search(r'instrument-header-quote">\s*([\d\.,]+)', t)
        m_chg = re.search(r'instrument-header-abs-change">\s*<span[^>]*>\s*([\-\+]?[\d\.,]+)', t)
        m_d = re.search(r'instrument-header-last-time">\s*<span>([\d\.]+)</span>', t)
        m_mk = re.search(r'btn--md"[^>]*>\s*<div class="flex flex-nowrap">\s*<span[^>]*>\s*([^<]+?)\s*<', t)
        title = re.search(r"<title>([^<]+)", t)
        print(isin, "|", r.url.path[:60], "| close", m_close and m_close.group(1), "| quote", m_q and m_q.group(1),
              "| chg", m_chg and m_chg.group(1), "| date", m_d and m_d.group(1), "| mk", m_mk and m_mk.group(1),
              "|", title and title.group(1)[:50])
    except Exception as e:
        print(isin, "ERR", e)

async def main():
    async with httpx.AsyncClient(headers=H, follow_redirects=True, timeout=15) as c:
        for i in ISINS:
            await one(c, i)

asyncio.run(main())

