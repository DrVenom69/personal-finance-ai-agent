# Add-ons for finance-llm-v3: live price lookup and WeChat bridge

Unzip into the v3 folder (overwrite facts.js, facts_cli.js, serve_local.py), then:

    python3 patch_purchase.py index.html      # adds "should I buy ...?" to the web app; prints: patched
    # edit products.json: put real product page URLs from shops you trust
    python3 pricing.py "iphone"               # shows what the scraper reads (prices, or the reason it failed)
    python3 serve_local.py                    # restart the web app

WeChat (needs node and python3; the model server should be running for normal questions):

    python3 wechat_server.py --cli            # try the chat logic in the terminal first
    WECHAT_TOKEN=... WECHAT_APPID=... WECHAT_SECRET=... python3 wechat_server.py    # port 8080, callback path /wechat

Files: pricing.py (scraper + cache + history), products.json (your product list), wechat_server.py (bridge),
facts.js / facts_cli.js (adds purchase advice; computeFacts is unchanged, so the trained model still matches),
serve_local.py (adds /api/price), patch_purchase.py (web app change).

Limits: prices are read only from pages listed in products.json and only if the HTML carries structured price data;
robots.txt is obeyed; replies are English only; WeChat users' figures are stored in wechat_users.db on your machine.

## Pricing update (discovery)
pricing.py can now find product pages itself: BRAVE_API_KEY (Brave Search API) if set, otherwise DuckDuckGo's HTML endpoint
if its robots.txt allows automated searches. Discovered pages are filtered for relevance and price outliers; answers carry a
confidence level, a caution note and the source URL. Pages listed in products.json are still used first and always trusted.
Apply the page change with:  python3 patch_sources.py index.html   (after patch_purchase.py)
Environment: PRICE_CURRENCY (for the command-line test), PRICE_MAX_PAGES (6), PRICE_BUDGET seconds (25), PRICE_UA (identify yourself).
