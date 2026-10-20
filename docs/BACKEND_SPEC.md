# ProAct Finance — Shared Backend Specification

> One brain, three surfaces. This document defines the central API that the
> **Native Android app**, **WeChat Mini Program**, and **Web app** all call.

## 1. Goal

Today the finance logic (safe-to-spend math, purchase check, permission tiers,
audit log) is duplicated: once in the browser (`web/src/services/`), once in the
Python WeChat bridge (`wechat_server.py` → `facts.js`), and the LLM in
`api/chat.js`. We consolidate it into **one backend**, so every surface gets the
same answers from the same data.

## 2. Architecture

```text
  ┌──────────────┐   ┌───────────────────┐   ┌──────────────┐
  │ Android app  │   │ WeChat Mini Prog. │   │   Web app    │
  │ (reads SMS)  │   │  (display + chat) │   │  (existing)  │
  └──────┬───────┘   └────────┬──────────┘   └──────┬───────┘
         │  HTTPS + auth      │  HTTPS + auth      │  HTTPS + auth
         └────────────────────┼────────────────────┘
                              ▼
                 ┌──────────────────────────┐
                 │      SHARED BACKEND      │
                 │  Node.js + TypeScript    │
                 │  ┌────────────────────┐  │
                 │  │ Deterministic math │  │   facts.ts (safe-to-spend,
                 │  │  (single source)   │  │   50/30/20, purchase verdicts)
                 │  ├────────────────────┤  │
                 │  │ Permission gate    │  │   T0–T4 + blocked list
                 │  ├────────────────────┤  │
                 │  │ Audit log (hash)   │  │   SHA-256 chained, tamper-evident
                 │  ├────────────────────┤  │
                 │  │ LLM layer          │  │   DeepSeek + number validator
                 │  └────────────────────┘  │
                 └──────────┬───────────────┘
                            │
                 ┌──────────▼───────────────┐
                 │       Database           │
                 │  SQLite (MVP) → Postgres │
                 └──────────────────────────┘
```

## 3. Tech stack

- **Runtime:** Node.js + TypeScript (run with `tsx`).
- **HTTP:** Express (minimal, well-known).
- **DB:** SQLite via built-in `node:sqlite` (MVP) → Postgres (production).
- **Engine:** reuse the existing `web/src/services/facts.ts` (deterministic math)
  and the logic in `web/src/services/api.ts`.
- **LLM:** DeepSeek (`LLM_URL` / `LLM_KEY` / `LLM_MODEL`), same as the live web app.
- **Auth:** WeChat `code2Session` (Mini Program / Official Account) and a simple
  device token for Android. One `user_id` per authenticated surface.

## 4. API endpoints

All endpoints are authenticated (except `/health`). Requests/response bodies are JSON.

| Method | Path | Purpose | From existing code |
|---|---|---|---|
| GET | `/health` | Liveness check | — |
| POST | `/auth/wechat` | WeChat code → session + `user_id` | — |
| POST | `/auth/device` | Android/device login → `user_id` | — |
| GET | `/runway` | Safe-to-spend, days, shortfall date | `getRunway` |
| POST | `/purchase-check` | Verdict + funding plan | `checkPurchase` |
| POST | `/import` | Ingest an SMS/CSV entry (+ confidence) | `importData` |
| GET | `/insights` | Category/bill analysis + reconciliation | `getInsights` |
| POST | `/chat` | Validated LLM answer (computed block only) | `sendChat` |
| POST | `/actions/approve` | Approve a T3/T4 action | `approveAction` |
| GET | `/audit` | Tamper-evident audit log | `getAuditLog` |
| PUT | `/profile` | Income, bills, goals, spending style | `FinanceContext` |

**`POST /purchase-check` request:**
```json
{ "item": "Winter coat", "price": 150, "needLevel": "essential", "isColdWeather": true }
```

**`POST /import` request (anonymized SMS summary from Android):**
```json
{ "source": "SMS", "rawText": "[Bank] spent 38.00 at Manner Coffee", "date": "2026-10-21" }
```

## 5. Data model

```text
users         (id, auth_provider, external_id, currency, monthly_income,
               spending_style, savings_goal, savings_pot, created_at)

bills         (id, user_id, name, amount, frequency, due_day, category,
               is_protected, previous_price)

transactions  (id, user_id, date, merchant, amount, category, source,
               confidence, merged_with, needs_review, is_flagged, raw_text)

audit_log     (id, user_id, timestamp, action, tier, rule_used, result,
               hash, prev_hash, details)
```

- `transactions.confidence`: `High | Medium | Low` — low goes to a review queue.
- `bills.is_protected`: rent/utilities/food/health/transport the agent never
  proposes cutting.
- `audit_log.hash`: SHA-256 chained, genesis-linked, tamper-evident.

## 6. Permission tiers (server-side)

Same taxonomy as the app, now enforced on the server so no surface can bypass it:

| Tier | May | Control |
|---|---|---|
| T0 | Read ledger / runway / summaries | own data only |
| T1 | Suggest budgets / funding plans / verdicts | no state change |
| T2 | Reversible write (recategorize, tag, alert) | undo, within user rules |
| T3 | Sandbox money move (savings pot) | one-tap approval + daily cap |
| T4 | Payment / external (bill pay, message) | draft only + PIN |
| Blocked | Change credentials, disable audit, raise own tier, export raw | always refused + flagged |

Text from SMS / merchant names / bill names is **data, never an instruction**.

## 7. LLM layer (DeepSeek + validation)

- `/chat` sends **only** the computed-numbers block + the user's question.
- The system prompt: use only computed numbers, never invent, never claim to
  execute actions, decline investing/loan/tax advice, `< 120 words`, ¥ currency.
- A **validator** rejects any figure the model didn't derive from the computed
  block (the `ok_answer` concept in `wechat_server.py`), falling back to the
  deterministic answer.
- Timeout → deterministic fallback → badge `Mock provider (demo mode)`.

## 8. SMS ingestion flow (Android)

1. Android app receives the bank SMS (permission-scoped, Android only).
2. Parses amount / merchant / date **on-device** (no raw text leaves the phone).
3. Sends only the anonymized summary to `POST /import`.
4. Backend dedupes (amount + merchant + time window), scores confidence, and
   flags low-confidence entries for review.
5. WeChat Mini Program / Web display the same ledger from the same backend.

## 9. Build plan (phased)

1. **P1 — Backend skeleton:** server + `/health`, `/runway`, `/purchase-check`,
   `/insights`, SQLite, ported `facts.ts`.
2. **P2 — Auth + import + audit:** `/auth/*`, `/import` (dedupe/confidence),
   `/audit` hash chain, `/profile`.
3. **P3 — Chat:** `/chat` with DeepSeek + validator + fallback.
4. **P4 — Android app:** SMS reader → `/import` → display runway/verdicts.
5. **P5 — WeChat Mini Program:** UI over the same endpoints + WeChat login.
