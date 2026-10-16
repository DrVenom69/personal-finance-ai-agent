"""Checks that every number the model writes comes from the facts it was given."""
import json, re, torch
from transformers import AutoTokenizer, AutoModelForCausalLM
P = "finance-llm-merged"
tok = AutoTokenizer.from_pretrained(P)
m = AutoModelForCausalLM.from_pretrained(P, torch_dtype=torch.float16, device_map="auto")
nums = lambda s: {x.rstrip(",") for x in re.findall(r"\d[\d,]*", s)}
FIXED = {"20", "35", "30", "50", "100"}   # numbers that appear in fixed wording
rows = [json.loads(l) for l in open("val.jsonl", encoding="utf-8")][:100]
tot = ok = clean = 0; bad = []
for r in rows:
    prompt = r["messages"][0]["content"]
    facts = json.loads(prompt.rsplit("<finance_data>", 1)[1].split("</finance_data>")[0])["facts"]
    allowed = nums(" ".join(str(v) for v in facts.values())) | FIXED
    x = tok.apply_chat_template(r["messages"][:1], add_generation_prompt=True, return_tensors="pt").to(m.device)
    y = tok.decode(m.generate(x, max_new_tokens=300, do_sample=False)[0][x.shape[1]:], skip_special_tokens=True)
    a = nums(y); wrong = a - allowed
    tot += len(a); ok += len(a) - len(wrong)
    if wrong: bad.append((sorted(wrong), y, r["messages"][1]["content"]))
    else: clean += 1
print("numbers copied from facts: %.1f%%" % (100 * ok / max(tot, 1)))
print("answers with zero wrong numbers: %d / %d" % (clean, len(rows)))
for w, y, ref in bad[:3]:
    print("-" * 60); print("WRONG:", w); print("MODEL:", y); print("REF:", ref)

# Wordings the model never saw in training: read these answers yourself.
STRESS = ["what's your take on my money", "so how bad is it", "ok thanks", "make me a plan", "what should I do with my money", "explain my bills and spending"]
head = rows[0]["messages"][0]["content"].rsplit("Question:", 1)[0]
print("\n=== unseen phrasings ===")
for q in STRESS:
    x = tok.apply_chat_template([{"role": "user", "content": head + "Question: " + q}], add_generation_prompt=True, return_tensors="pt").to(m.device)
    y = tok.decode(m.generate(x, max_new_tokens=300, do_sample=False)[0][x.shape[1]:], skip_special_tokens=True)
    print("\nQ:", q, "\nA:", y)
