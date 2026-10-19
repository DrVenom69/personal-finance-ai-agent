"""Live price lookup. Two ways to find product pages:
  1. curated: pages you list in products.json (always trusted);
  2. discovered: pages found through a search API (BRAVE_API_KEY) or DuckDuckGo's HTML endpoint, only if its robots.txt allows it.
Prices are read from structured data (JSON-LD / meta tags). Discovered pages are filtered for relevance and outliers, and the
answer carries a confidence level and the source URL. Honest user agent, robots.txt obeyed everywhere, cached, stdlib only."""
import concurrent.futures, html, ipaddress, json, os, re, socket, sqlite3, statistics, time
import urllib.error, urllib.parse, urllib.request, urllib.robotparser
from html.parser import HTMLParser

HERE = os.path.dirname(os.path.abspath(__file__))
REGISTRY = os.environ.get("PRODUCTS_FILE", os.path.join(HERE, "products.json"))
DB = os.environ.get("PRICE_DB", os.path.join(HERE, "prices.db"))
UA = os.environ.get("PRICE_UA", "FinanceAssistantPriceBot/1.0 (+personal budgeting tool)")
BRAVE_KEY = os.environ.get("BRAVE_API_KEY", ""); BRAVE_URL = os.environ.get("BRAVE_URL", "https://api.search.brave.com/res/v1/web/search")
DDG_URL = os.environ.get("DDG_URL", "https://html.duckduckgo.com/html/")
SEARCH_ENGINES = [e.strip() for e in os.environ.get("PRICE_SEARCH_ENGINES", "duckduckgo").lower().split(",") if e.strip()]
SEARCH_TIMEOUT = int(os.environ.get("PRICE_SEARCH_TIMEOUT", "10"))
MAX_PAGES = int(os.environ.get("PRICE_MAX_PAGES", "6"))       # product pages read per question
BUDGET = float(os.environ.get("PRICE_BUDGET", "25"))          # seconds allowed for all page reads
TTL = int(os.environ.get("PRICE_TTL", "1800")); ERR_TTL = int(os.environ.get("PRICE_ERR_TTL", "600"))
FX_URL = os.environ.get("FX_URL", "https://open.er-api.com/v6/latest/{base}")
ALLOW_PRIVATE = os.environ.get("PRICE_ALLOW_PRIVATE") == "1"   # tests only
MAX_BYTES = 2000000
SYM = {"$": "USD", "€": "EUR", "£": "GBP", "৳": "BDT", "₹": "INR", "¥": "JPY"}
SKIP_HOSTS = ("duckduckgo.com", "bing.com", "google.", "youtube.com", "facebook.com", "instagram.com", "pinterest.com", "reddit.com",
              "twitter.com", "x.com", "tiktok.com", "quora.com", "wikipedia.org")

def db():
    c = sqlite3.connect(DB, timeout=10)
    c.execute("CREATE TABLE IF NOT EXISTS cache(url TEXT PRIMARY KEY, ts REAL, price REAL, currency TEXT, name TEXT, err TEXT)")
    c.execute("CREATE TABLE IF NOT EXISTS history(product TEXT, store TEXT, currency TEXT, price REAL, ts REAL)")
    return c

def norm(s): return re.sub(r"[^a-z0-9]", "", str(s).lower())
def host_of(u): return (urllib.parse.urlparse(u).hostname or "").lower().removeprefix("www.")

def registry():
    try: return json.load(open(REGISTRY, encoding="utf-8"))["products"]
    except Exception: return []

# ---------- turning a chat message into a product name ----------
ARTICLES = r"^(?:an?|the|new|some|my|one)\s+"
JOINS = [(r"\bi\s+(phone|pad|pod|mac)\b", r"i\1"), (r"\bmac\s+book\b", "macbook"), (r"\bair\s+pods\b", "airpods")]
def clean_product_query(message):
    q = " ".join(str(message or "").split())
    m = re.search(r"\b(?:buy(?:ing)?|purchase|purchasing|get|afford|price of|cost of|prices? for|how much is|how much does)\s+(.+)", q, re.I)
    if m: q = m.group(1)
    elif len(q.split()) > 8: return ""
    q = re.split(r"\s+(?:right now|now|today|should|can|could|or|because|if|and)\b|[?,.!;]", q, maxsplit=1, flags=re.I)[0].strip()
    for _ in range(2): q = re.sub(ARTICLES, "", q, flags=re.I)
    for a, b in JOINS: q = re.sub(a, b, q, flags=re.I)
    q = " ".join(q.split()[:7])[:80]
    ask = {"where", "what", "how", "when", "why", "who", "which", "is", "are", "do", "does", "i", "it", "this", "that", "good", "worth"}
    return q if len(norm(q)) >= 2 and [t for t in tokens(q) if t not in ask] else ""

def match(message):
    nm, best, blen = norm(message), None, 0
    for p in registry():
        for a in [p.get("name", "")] + p.get("aliases", []):
            na = norm(a)
            if na and na in nm and len(na) > blen: best, blen = p, len(na)
    if best: return best
    q = clean_product_query(message)
    return {"name": q, "aliases": [], "urls": [], "_discovered": True} if q else None

STOP = {"a", "an", "the", "new", "some", "my", "buy", "price", "online", "of", "for"}
def tokens(s): return [t for t in re.findall(r"[a-z0-9]+", str(s or "").lower()) if t not in STOP and (len(t) > 1 or t.isdigit())]
def relevant(query, *texts):
    qt = tokens(query); words = set(tokens(" ".join(t or "" for t in texts))); flat = norm(" ".join(t or "" for t in texts))
    if not qt: return False
    hit = lambda t: t in words or (len(t) >= 4 and t in flat)
    return sum(map(hit, qt)) / len(qt) >= 0.6 and all(hit(t) for t in qt if t.isdigit())

# ---------- safe fetching ----------
def public_url(u):
    pu = urllib.parse.urlparse(u)
    if pu.scheme not in ("http", "https") or not pu.hostname: return False
    if ALLOW_PRIVATE: return True
    try: infos = socket.getaddrinfo(pu.hostname, None)
    except OSError: return False
    return all(ipaddress.ip_address(i[4][0]).is_global for i in infos)

_robots = {}
def robots_ok(url):
    pu = urllib.parse.urlparse(url); root = pu.scheme + "://" + pu.netloc
    ent = _robots.get(root)
    if not ent or time.time() - ent[0] > 3600:
        rp = urllib.robotparser.RobotFileParser(); ok = True; allow_all = False
        try:
            req = urllib.request.Request(root + "/robots.txt", headers={"User-Agent": UA})
            rp.parse(urllib.request.urlopen(req, timeout=5).read(MAX_BYTES).decode("utf-8", "replace").splitlines())
        except urllib.error.HTTPError as e: ok = allow_all = 400 <= e.code < 500    # no robots.txt: allowed; server error: stay away
        except Exception: ok = False
        ent = _robots[root] = (time.time(), rp, ok, allow_all)
    _, rp, ok, allow_all = ent
    return True if allow_all else (ok and rp.can_fetch(UA.split("/")[0], url))

def fetch_html(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html,application/xhtml+xml", "Accept-Language": "en"})
    with urllib.request.urlopen(req, timeout=10) as r:
        if not public_url(r.geturl()): raise ValueError("redirected to a non-public address")
        raw = r.read(MAX_BYTES); enc = r.headers.get_content_charset() or "utf-8"
    return raw.decode(enc, "replace")

# ---------- reading prices ----------
def to_float(x):
    s = re.sub(r"[^\d,.\-]", "", str(x))
    if not re.search(r"\d", s): return None
    if "," in s and "." in s: s = s.replace(",", "") if s.rfind(".") > s.rfind(",") else s.replace(".", "").replace(",", ".")
    elif "," in s: s = s.replace(",", ".") if re.search(r",\d{1,2}$", s) else s.replace(",", "")
    try: v = float(s)
    except ValueError: return None
    return v if v > 0 else None

def walk(o):
    if isinstance(o, dict):
        yield o
        for v in o.values(): yield from walk(v)
    elif isinstance(o, list):
        for v in o: yield from walk(v)

def ld_offer(page):
    for m in re.finditer(r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', page, re.S | re.I):
        try: data = json.loads(m.group(1).strip())
        except ValueError: continue
        for node in walk(data):
            offers = node.get("offers")
            if offers is None: continue
            for of in (offers if isinstance(offers, list) else [offers]):
                if not isinstance(of, dict): continue
                spec = of.get("priceSpecification") if isinstance(of.get("priceSpecification"), dict) else {}
                price = to_float(of.get("price") or of.get("lowPrice") or spec.get("price") or "")
                cur = of.get("priceCurrency") or spec.get("priceCurrency")
                if price and cur: return {"name": node.get("name"), "price": price, "currency": str(cur).upper()}
    return None

def meta_offer(page):
    tags = {}
    for m in re.finditer(r"<meta\b[^>]*>", page, re.I):
        t = m.group(0); k = re.search(r'(?:property|name|itemprop)=["\']([^"\']+)["\']', t, re.I); v = re.search(r'content=["\']([^"\']*)["\']', t, re.I)
        if k and v: tags.setdefault(k.group(1).lower(), v.group(1))
    price = to_float(tags.get("product:price:amount") or tags.get("og:price:amount") or tags.get("price") or "")
    cur = tags.get("product:price:currency") or tags.get("og:price:currency") or tags.get("pricecurrency")
    return {"name": tags.get("og:title"), "price": price, "currency": cur.upper()} if price and cur else None

def parse_offer(page): return ld_offer(page) or meta_offer(page)

def get_offer(store, url):
    c = db(); now = time.time()
    row = c.execute("SELECT ts, price, currency, name, err FROM cache WHERE url=?", (url,)).fetchone()
    if row:
        ts, price, cur, name, err = row
        if err and now - ts < ERR_TTL: c.close(); return None, err
        if not err and now - ts < TTL: c.close(); return {"store": store, "price": price, "currency": cur, "name": name, "url": url, "checked_at": ts, "cached": True}, None
    err = off = None
    try:
        if not public_url(url): err = "address not allowed"
        elif not robots_ok(url): err = "blocked by the site's robots.txt"
        else:
            off = parse_offer(fetch_html(url))
            if not off: err = "no price found on the page"
    except urllib.error.HTTPError as e: err = "HTTP %d" % e.code
    except Exception as e: err = type(e).__name__
    if off:
        c.execute("INSERT OR REPLACE INTO cache VALUES(?,?,?,?,?,NULL)", (url, now, off["price"], off["currency"], off.get("name"))); c.commit(); c.close()
        return {"store": store, "price": off["price"], "currency": off["currency"], "name": off.get("name"), "url": url, "checked_at": now, "cached": False}, None
    c.execute("INSERT OR REPLACE INTO cache VALUES(?,?,?,?,?,?)", (url, now, None, None, None, err)); c.commit(); c.close()
    return None, err

# ---------- discovering pages ----------
class ResultParser(HTMLParser):
    def __init__(self): super().__init__(); self.results = []; self._href = None; self._text = []
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "a" and ("result__a" in a.get("class", "") or "result-link" in a.get("class", "")): self._href = a.get("href", ""); self._text = []
    def handle_data(self, d):
        if self._href is not None: self._text.append(d)
    def handle_endtag(self, tag):
        if tag == "a" and self._href is not None: self.results.append((" ".join("".join(self._text).split()), self._href)); self._href = None

def unwrap(href):
    href = urllib.parse.urljoin(DDG_URL, html.unescape(href).strip())
    qs = urllib.parse.parse_qs(urllib.parse.urlparse(href).query)
    return qs["uddg"][0] if "uddg" in qs else href

def ddg_search(query):
    url = DDG_URL + "?" + urllib.parse.urlencode({"q": query + " price"})
    if not robots_ok(url): raise PermissionError("robots.txt disallows automated searches")
    p = ResultParser(); p.feed(fetch_html(url))
    return [{"url": unwrap(h), "title": t} for t, h in p.results]

def brave_search(query):
    req = urllib.request.Request(BRAVE_URL + "?" + urllib.parse.urlencode({"q": query + " price", "count": 10}),
                                 headers={"Accept": "application/json", "X-Subscription-Token": BRAVE_KEY, "User-Agent": UA})
    data = json.load(urllib.request.urlopen(req, timeout=SEARCH_TIMEOUT))
    return [{"url": r["url"], "title": r.get("title", "")} for r in data.get("web", {}).get("results", []) if r.get("url")]

def search_candidates(query):
    found, errors = [], []
    if BRAVE_KEY:
        try: found = brave_search(query)
        except Exception as e: errors.append({"store": "brave", "reason": "search failed (%s)" % type(e).__name__})
    if not found and "duckduckgo" in SEARCH_ENGINES:
        try: found = ddg_search(query)
        except PermissionError as e: errors.append({"store": "duckduckgo", "reason": str(e)})
        except Exception as e: errors.append({"store": "duckduckgo", "reason": "search unavailable (%s)" % type(e).__name__})
    out, seen = [], set()
    for r in found:
        h = host_of(r["url"])
        if h and not any(s in h for s in SKIP_HOSTS) and r["url"] not in seen and public_url(r["url"]):
            seen.add(r["url"]); out.append({"store": h, "url": r["url"], "title": r.get("title", "")})
    return out[:MAX_PAGES], errors

_fx = {}
def fx(base, quote):
    if base == quote: return 1.0
    ent = _fx.get(base)
    if not ent or time.time() - ent[0] > 43200:
        try: rates = json.load(urllib.request.urlopen(FX_URL.format(base=base), timeout=8))["rates"]
        except Exception: rates = {}
        ent = _fx[base] = (time.time(), rates)
    r = ent[1].get(quote)
    return float(r) if r else None

def lookup(message, symbol="$", discover=True):
    p = match(message)
    if not p: return {"error": "unknown_product", "known": [x.get("name") for x in registry()]}
    product = p["name"]; key = norm(product)
    urls = [u for u in p.get("urls", []) if str(u.get("url", "")).startswith("http")]
    curated = bool(urls); errors = []
    if not urls and discover and p.get("_discovered"): urls, errors = search_candidates(product)
    if not urls:
        return {"error": "no_results" if p.get("_discovered") else "no_sources", "product": product, "errors": errors,
                "message": "I could not find usable product pages for %s. Name the exact model, or add a product page URL to products.json." % product}
    target = SYM.get(symbol, symbol if re.fullmatch(r"[A-Z]{3}", str(symbol or "")) else "USD")
    ex = concurrent.futures.ThreadPoolExecutor(max_workers=4)
    futs = {ex.submit(get_offer, u.get("store") or host_of(u["url"]), u["url"]): i for i, u in enumerate(urls)}
    got = {}
    try:
        for f in concurrent.futures.as_completed(futs, timeout=BUDGET): got[futs[f]] = f.result()
    except concurrent.futures.TimeoutError: pass
    ex.shutdown(wait=False, cancel_futures=True)
    offers = []
    for i, u in enumerate(urls):
        store = u.get("store") or host_of(u["url"]); o, err = got.get(i, (None, "timed out"))
        if err or not o: errors.append({"store": store, "reason": err or "no price"}); continue
        if not curated and not relevant(product, o.get("name"), u.get("title"), re.sub(r"[^a-z0-9]+", " ", urllib.parse.urlparse(u["url"]).path.lower())):
            errors.append({"store": store, "reason": "page does not look like this product"}); continue
        r = fx(o["currency"], target)
        if r is None: errors.append({"store": store, "reason": "no exchange rate %s to %s" % (o["currency"], target)}); continue
        offers.append(dict(o, store=store, converted=o["currency"] != target, price_user=round(o["price"] * r, 2)))
    if not curated and len(offers) >= 3:
        med = statistics.median(x["price_user"] for x in offers)
        kept = [x for x in offers if 0.5 * med <= x["price_user"] <= 2 * med]
        errors += [{"store": x["store"], "reason": "price far from the others, ignored"} for x in offers if x not in kept]; offers = kept
    n = len(offers); note = None
    if curated: conf = "high" if n else None
    else:
        lo = min((x["price_user"] for x in offers), default=1); hi = max((x["price_user"] for x in offers), default=1)
        conf = ("high" if n >= 3 and hi / lo <= 1.5 else "medium" if n >= 2 else "low") if n else None
        if n: note = ("Only one page matched, so treat this price with caution. " if n == 1 else "") + "Prices come from web search results and may be for a different model, storage size or condition."
    out = {"product": product, "currency": target, "offers": offers, "errors": errors, "best": None, "discovered": not curated, "confidence": conf, "note": note}
    if offers:
        out["best"] = min(offers, key=lambda x: x["price_user"])
        c = db(); cutoff = time.time() - 3600
        rows = c.execute("SELECT price, currency FROM history WHERE product=? AND ts<? AND ts>?", (key, cutoff, time.time() - 365 * 86400)).fetchall()
        c.executemany("INSERT INTO history VALUES(?,?,?,?,?)", [(key, x["store"], x["currency"], x["price"], x["checked_at"]) for x in offers if not x["cached"]]); c.commit(); c.close()
        conv = [pr * fx(cu, target) for pr, cu in rows if fx(cu, target)]
        out["history"] = {"n_before": len(conv), "lowest_before": round(min(conv), 2) if conv else None}
    return out

if __name__ == "__main__":
    import sys
    print(json.dumps(lookup(" ".join(sys.argv[1:]) or "iphone", os.environ.get("PRICE_CURRENCY", "$")), indent=2, ensure_ascii=False))
