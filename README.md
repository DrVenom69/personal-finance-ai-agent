# ProAct Personal Finance & Runway Assistant

> **"Code does the math, the model writes the words."**

ProAct Finance combines a high-performance React web application with a deterministic financial calculation engine (`facts.js`), live store price discovery (`pricing.py`), cryptographic audit trails (SHA-256 blockchain), and optional LLM integration.

All figures, savings targets, and purchase affordability verdicts are computed deterministically in code—the AI model only communicates the verified figures into natural explanations, eliminating hallucinations.

---

## Folder Layout

```text
.
├── api/                     # Vercel serverless backend
│   └── chat.js              # Serverless LLM proxy (supports vLLM and Anthropic)
├── facts.js                 # Universal deterministic finance engine (50/30/20 & purchase math)
├── facts_cli.js             # CLI wrapper for testing facts.js
├── pricing.py               # Live product pricing scraper & discovery (DuckDuckGo / Brave)
├── products.json            # Pinned product URLs and store overrides
├── serve_local.py           # Lightweight local Python server (serves web app + /api)
├── index.html               # Classic standalone single-file dashboard
├── vercel.json              # Vercel build & route deployment configuration
├── web/                     # Modern React UI (ProAct Finance)
│   ├── index.html           # React SPA entry point
│   ├── package.json         # React 19, Tailwind CSS v4, Lucide, Motion, Vite
│   ├── vite.config.ts       # Vite bundling and dev proxy configuration
│   └── src/
│       ├── App.tsx          # Main application wrapper
│       ├── components/      # Modular UI screens (Home, Purchase Check, Insights, Agent, Security)
│       ├── context/         # React FinanceContext state management
│       ├── services/        # Service layer
│       │   ├── api.ts       # Centralized API service with offline fallbacks
│       │   └── facts.ts     # TypeScript port of facts.js single-source-of-truth
│       └── types/           # TypeScript domain definitions
├── wechat_server.py         # Optional WeChat assistant bridge
├── train.py                 # LoRA fine-tuning training script
├── gen_data.py              # Training dataset generator (uses node + facts.js)
├── eval.py                  # Evaluation benchmark script
└── sample_preview.jsonl     # Sample synthetic dataset preview
```

---

## Mock vs Real Capabilities

To maintain full transparency, here is the exact breakdown of real calculations versus mock/simulated features:

| Feature | Status | Details |
| :--- | :--- | :--- |
| **Runway & Safe-to-Spend Math** | **Computed by code from demo data** | Computed deterministically via `calculateFinancialRunway` (`Cash - Committed Bills - Days × Baseline`). |
| **50/30/20 Budget Guidelines** | **Computed by code from demo data** | Computed via `facts.js` / `facts.ts` (`computeFacts`). Calculates needs, wants, savings rate, and 0–100 financial health score. |
| **Purchase Affordability Check** | **Real** | Computed via `computePurchase`. Compares after-purchase savings directly against 20% savings target to derive exact verdicts (`ok`, `stretch`, `wait`). |
| **Product Pricing & Discovery** | **Fallback only, no live price service deployed** | Scraper and discovery logic exists in `pricing.py`, but no live `/api/price` service is deployed in production; app uses offline pricing fallback. |
| **Cryptographic Audit Trail** | **Real** | Every log entry is hashed with Web Crypto API `crypto.subtle` SHA-256, chained to genesis block `000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f` with live tamper detection. |
| **AI Conversational Chat (`/chat`)** | **Hybrid** | Calls `/api/chat` (vLLM or Anthropic API) when configured. Instantly falls back to deterministic rule-based assistant if offline, unconfigured, or timed out. |
| **AI Provider Badge** | **Configurable** | Defaults to `Mock provider (demo mode)` requiring **no internet and no API key**. Displays active provider only when `VITE_AI_PROVIDER` is set. |
| **Prompt Injection Defense** | **Rule-based filter (exact phrases)** | Rule-based security shield catches override patterns (`ignore rules`, `transfer 2000`) before data reaches any model or database. |
| **Bank / SMS Import** | **Simulated** | Demonstrates multi-channel import, rule-based duplicate detection/merging, and untrusted payload filtering. |
| **Money Movement & Bill Pay** | **Simulated** | T3 sandbox transfers (capped at ¥500/day) and T4 draft bill payment with interactive PIN challenge modal. |

---

## Training Data & Hugging Face

> [!NOTE]
> Hugging Face datasets and trained model weights (`finance-llm-merged`) are used for offline model fine-tuning only. They are intentionally **not included** in this repository to keep the repository lightweight and self-contained. Training datasets can be generated locally via `python gen_data.py 6000`.

---

## How to Run

### 1. Modern React Web UI (Vite)

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The demo runs fully offline with zero external dependencies.

To verify production build and type safety:

```bash
cd web
npm run lint
npm run build
```

### 2. Standalone Python Server (Classic UI + /api)

```bash
python serve_local.py
```

Open [http://localhost:3000](http://localhost:3000) to view the classic single-file web app with live price lookup and model forwarding.

---

## How to Deploy to Vercel

The project includes a root `vercel.json` configured for single-command deployment:

```bash
vercel
```

Vercel automatically executes:
```bash
cd web && npm install && npm run build
```
and serves the production SPA from `web/dist`, while serverless functions under `api/` (such as `api/chat.js`) remain accessible under `/api/*`.

### Optional Environment Variables

If connecting to a live language model:
- `LLM_URL`: Base URL of OpenAI-compatible model server (e.g. `http://host:8000/v1` or vLLM).
- `LLM_MODEL`: Model name (default `finance-llm`).
- `LLM_KEY`: Optional Bearer authentication token.
- `ANTHROPIC_API_KEY`: Anthropic API key for fallback provider (`claude-sonnet-5-5`).
- `VITE_AI_PROVIDER`: Name of provider to show in UI badge (e.g. `Anthropic Claude Sonnet` or `Local vLLM`). If omitted, badge displays `Mock provider (demo mode)`.
