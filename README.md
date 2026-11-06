# bound.

**Affirming is a promise. We track whether it's kept.**

Bound is a referral tool for LGBTQ health centers. It ranks providers by whether queer women actually *received* cervical screening, not by whether a provider calls itself affirming.

## Run it

```bash
npm install
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local
npm run dev        # http://localhost:3000
```

## Demo script (~2 min)

The app has three tabs:

- **Workspace** (home) shows follow-ups that are due, the five-question outcome check-in, and the funder numbers.
- **New referral** is a step-by-step flow: the client's needs, then choosing a provider, then sending the referral and scheduling the follow-up.
- **Providers** is the full provider database: details, scores, patterns and a notes timeline built from check-ins and staff notes.

The demo:

1. **Workspace:** a referral to Rainbow Women's Wellness from a month ago is overdue for its check-in.
2. **New referral:** answer the six questions by tapping options, or use "describe it in a sentence" and Claude fills the form. Providers appear only once all six are answered.
3. Recommended providers are shown first. **Rainbow Women's Wellness** sits under "Not recommended": it's listed as affirming, but its care-completion rate is low.
4. **Choose** a provider. Claude Sonnet writes the reason and a call script. You can email the referral to the client or the provider (it opens your email app), then **Log referral**, which sets the reminder.
5. **Workspace:** on the Rainbow follow-up, click **Record reply**, then **Demo: Told no Pap**, then **Fill answers from reply**. Claude Haiku fills in the five questions; click **Save**. The care-completed score drops (shown in a banner), and the outcome is added to Rainbow's notes under **Providers**.

**Reset demo** (top right) restores the seed data. State is saved in the browser's localStorage, so it survives a page refresh.

## How it works

| Piece | Where |
|---|---|
| Scoring (code, never the model) | `lib/score.ts` |
| Claude calls: structured outputs via zod | `lib/claude.ts` |
| API routes | `app/api/{parse-need,checkin,explain}` |
| UI (3 tabs) | `app/page.tsx`, `components/{WorkspaceTab,ReferTab,ProvidersTab}.tsx` |
| Shared state (referrals, outcomes, staff notes) | `lib/store.tsx` |

Scores: `completion = (done+1)/(n+2)`, `affirming = avg(respect)/5 − 0.2·share(had to explain)`, and `score = 0.6·completion + 0.4·affirming + fit`. A provider is *verified* at 5 or more outcomes. The gap flag means affirming ≥ 75% while completion < 50%.

## Data

- **Real providers:** the CMS NPI Registry for San Francisco (`node scripts/fetch-providers.mjs` writes `data/npi-raw.json`).
- **Curation + simulated outcomes:** `node scripts/build-data.mjs` writes `data/providers.json` and `data/outcomes.json`.
- Insurance, hours, language and transit are **demo attributes**. **All outcomes are simulated** and badged in the UI. Only the *fictional* provider is given the "affirming but fails" story. Real providers are kept at 55% or higher simulated completion.

## Privacy

No client identity is stored anywhere. Outcomes are recorded per provider, and the intake text is cleared if Claude detects identifying details. Crisis language in a check-in triggers a staff hand-off and records nothing. Claude never gives medical advice.
