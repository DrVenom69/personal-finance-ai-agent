import os, sys
p = sys.argv[1] if len(sys.argv) > 1 else "index.html"
h = open(p, encoding="utf-8").read()
if "function purchaseFlow" not in h: sys.exit("run patch_purchase.py first")
if "j.best.url" in h: sys.exit("already patched")
pairs = [
 ("if(!j.best)return 'I could not read a price for '",
  "if(j.error==='no_results')return j.message+((j.errors||[]).length?' ('+j.errors.map(function(e){return e.store+': '+e.reason}).join('; ')+')':'');\n if(!j.best)return 'I could not read a price for '"),
 ("return purchaseText(p)+(others?'\\nOther stores: '+others+'.':'')}",
  "return purchaseText(p)+(others?'\\nOther stores: '+others+'.':'')+'\\nSource: '+j.best.url+(j.note?'\\n'+j.note:'')}"),
]
for old, new in pairs:
    if old not in h: sys.exit("pattern not found: " + old[:40])
    h = h.replace(old, new, 1)
open(p, "w", encoding="utf-8").write(h)
print("patched")
