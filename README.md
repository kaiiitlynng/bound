# bound.

**Affirming is a promise. We track whether it's kept.**

Bound is a referral tool for LGBTQ health centers. It ranks providers by whether queer women actually *received* cervical screening, not by whether a provider calls itself affirming.

## Run it

```bash
npm install
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local
npm run dev        # http://localhost:3000
```

## Demo script (~90s)

1. Maya types a need: *"uninsured, overdue Pap, works days so needs evenings, no car, prefers Spanish"* → **Find providers**. Claude Haiku 5.5 turns it into filters, and code ranks the providers.
2. **Rainbow Women's Wellness** is listed as affirming but ranks low: ⚠ *Affirming, but clients often don't receive screening*.
3. **Log referral** on it, then in the check-in panel click **Told no Pap** → **Record reply**. Claude extracts the outcome, the care-completed score drops live, and the pattern count and funder strip update.
4. Optional: **Why + booking script** (Claude Sonnet 5.5) writes the reason, a call script and a client explainer, using only the numbers it's given.

## How it works

| Piece | Where |
|---|---|
| Scoring (code, never the model) | `lib/score.ts` |
| Claude calls: structured outputs via zod | `lib/claude.ts` |
| API routes | `app/api/{parse-need,checkin,explain}` |
| UI | `app/page.tsx`, `components/` |

Scores: `completion = (done+1)/(n+2)`, `affirming = avg(respect)/5 − 0.2·share(had to explain)`, and `score = 0.6·completion + 0.4·affirming + fit`. A provider is *verified* at 5 or more outcomes. The gap flag means affirming ≥ 75% while completion < 50%.

## Data

- **Real providers:** the CMS NPI Registry for San Francisco (`node scripts/fetch-providers.mjs` writes `data/npi-raw.json`).
- **Curation + simulated outcomes:** `node scripts/build-data.mjs` writes `data/providers.json` and `data/outcomes.json`.
- Insurance, hours, language and transit are **demo attributes**. **All outcomes are simulated** and badged in the UI. Only the *fictional* provider is given the "affirming but fails" story. Real providers are kept at 55% or higher simulated completion.

## Privacy

No client identity is stored anywhere. Outcomes are recorded per provider, and the intake text is cleared if Claude detects identifying details. Crisis language in a check-in triggers a staff hand-off and records nothing. Claude never gives medical advice.
