import sys
p = sys.argv[1] if len(sys.argv) > 1 else "index.html"
h = open(p, encoding="utf-8").read()
if "function purchaseFlow" in h: sys.exit("already patched")
helpers = r"""var BUY_RE=/\b(buy|purchase|afford|worth it|should i get|price of)\b/i;
function baseOf(c){return{currency:S.cur,income:S.income,day:c.day,dim:c.dim,expenses:c.ex.map(function(e){return{category:e.c,amount:e.a}}),bills:S.bills.map(function(b){return{name:b.n,amount:b.a,frequency:b.fr,category:b.c}})}}
function purchaseReply(j,c){
 if(j.error==='unknown_product')return 'I do not have a price source for that product yet. Add it to products.json. Products I can check now: '+(j.known&&j.known.length?j.known.join(', '):'none')+'.';
 if(j.error==='no_sources')return 'products.json has no store URLs for '+j.product+' yet. Add a product page URL from a shop you trust.';
 if(!j.best)return 'I could not read a price for '+j.product+'. '+(j.errors||[]).map(function(e){return (e.store||'store')+': '+e.reason}).join('; ')+'.';
 var h=j.history||{};
 var p=computePurchase(baseOf(c),{name:j.product,store:j.best.store,stores:j.offers.length,converted:j.best.converted,price:j.best.price_user,lowest_before:h.lowest_before,n_before:h.n_before||0});
 var others=j.offers.filter(function(o){return o!==j.best}).map(function(o){return o.store+' '+f(o.price_user)}).join(', ');
 return purchaseText(p)+(others?'\nOther stores: '+others+'.':'')}
function purchaseFlow(t,c){
 var a={role:'assistant',content:'Checking prices online...'};chat.push(a);busy=true;paintChat();
 fetch('/api/price?cur='+encodeURIComponent(S.cur)+'&q='+encodeURIComponent(t)).then(function(r){return r.json()}).then(function(j){a.content=purchaseReply(j,c)}).catch(function(){a.content='I could not reach the price service. Make sure serve_local.py is running.'}).then(function(){busy=false;paintChat()})}
"""
hook_old = "var la=localAnswer(t,c);if(la){chat.push({role:'assistant',content:la});paintChat();return}"
for old, new in [("function ask(t){", helpers + "function ask(t){"), (hook_old, hook_old + "\n if(BUY_RE.test(t)){purchaseFlow(t,c);return}")]:
    if old not in h: sys.exit("pattern not found: " + old[:40])
    h = h.replace(old, new, 1)
if '<script src="facts.js"></script>' not in h: sys.exit("facts.js script tag missing")
open(p, "w", encoding="utf-8").write(h)
print("patched")
