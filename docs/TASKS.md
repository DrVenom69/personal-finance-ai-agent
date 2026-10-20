# ProAct Finance — Task List & Status

Legend: `[x]` done · `[~]` partial/in-progress · `[ ]` not started.

## Snapshot (where things stand)

- **Repo:** `DrVenom69/personal-finance-ai-agent` (origin) · `NOXUSTIC/FINTECH` (competition remote)
- **Live web app:** https://proact-finance.vercel.app (DeepSeek chat, ¥ currency, same-origin guard)
- **Backend:** `server/` — Node + Express + TypeScript + SQLite (`node:sqlite`), runs on `:4000`
- **Docs:** `docs/BACKEND_SPEC.md` (architecture), `docs/TECHNICAL_DOCUMENTATION.md`, `docs/SECURITY_SELF_ASSESSMENT.md`

---

## 1. Web app (hackathon — shipped)

- [x] UI screens: Home, Purchase Check, Insights, Agent, Security, Import
- [x] Deterministic engine (`facts.ts`): safe-to-spend, 50/30/20, purchase verdicts
- [x] Need-aware decision engine (Essential / Needed soon / Want + funding plan)
- [x] Permission tiers T0–T4 + blocked list + hash-chained audit log
- [x] SMS/CSV import (simulated) + duplicate merge + confidence
- [x] DeepSeek chat + mock fallback + provider badge + ¥ currency
- [x] Dark mode, 390px layout, tests (10/10), lint, build
- [x] Deployed to Vercel

## 2. Shared backend ("the next level")

- [x] Spec — `docs/BACKEND_SPEC.md` (one backend, three surfaces)
- [x] **P1** — skeleton: Express + `facts.ts` reuse; `/health`, `/runway`, `/purchase-check`, `/insights`
- [x] **P2** — SQLite + `/auth/*`, `/import` (parse + confidence + dedupe), `/audit` (hash chain), `/profile`
- [ ] **P3** — `/chat`: DeepSeek + number validator (`ok_answer`) + mock fallback
- [ ] **P4** — Native Android app (reads bank SMS → `POST /import`)
- [ ] **P5** — WeChat Mini Program (UI over the same endpoints + WeChat login)

## 3. Pricing / research layer (decision made, not built)

- [x] Decision: **code = confirmed price · DeepSeek = explanation · Grok = research (estimated only)**
- [ ] `POST /price` — deterministic (finish `pricing.py`; source URL + "checked at" timestamp)
- [ ] `POST /research` — Grok (discovery/where-to-buy/typical range), always labeled *estimated*
- [ ] UI: "Confirmed vs Estimated" badge + "verify before you buy"

## 4. Production / compliance ("for real stuff")

- [ ] Chinese business entity (unlocks business Mini Program + WeChat Pay + Service Account)
- [ ] ICP 备案 for the server domain
- [ ] WeChat Pay merchant account
- [ ] PIPL (personal data) compliance
- [ ] Host backend in mainland China / HK (WeChat latency + ICP)
- [ ] Real transaction ingestion (WeChat Pay statement / bank open API) — currently simulated

## 5. "Perfect advisor" features (trimmed during hackathon — the roadmap)

- [ ] Review queue (low-confidence → one-tap correction → becomes a rule)
- [ ] Why layer (infer spend purpose from merchant/time/recurrence)
- [ ] Cash trail (unexplained cash estimate, no alarm)
- [ ] New-payee anomaly flag (before any draft)
- [ ] Message drafts (ask landlord to move a bill date — draft only)
- [ ] Adaptive budget (medians, not percentages; low-income mode)
- [ ] Protected-spending guard (never suggest cutting rent/utilities/food/health/transport)

---

## Key decisions (don't re-litigate)

1. **Surfaces:** Native Android (reads SMS) + WeChat (display) + Web — all call ONE backend.
2. **SMS reality:** a WeChat Mini Program *cannot* read phone SMS; Android reads SMS on-device and sends only anonymized summaries.
3. **LLM:** DeepSeek = primary (China-reachable). Grok = research only. **No LLM is ever the source of a price.**
4. **Moat:** "code computes, the model writes the words" + permission tiers + audit log + number validator.

## Where to resume

**Next step is P3** — build `POST /chat` in `server/` (port the DeepSeek prompt + timeout + same-origin guard from `api/chat.js`, add the number validator, wire mock fallback). After that: P4 (Android) or P5 (WeChat).

To run the backend: `cd server && npm install && npm run start` (serves `:4000`).
