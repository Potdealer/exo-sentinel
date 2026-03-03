# ExoSentinel

**AI-powered onchain security intelligence.** Weekly briefs on smart contract exploits, bridge vulnerabilities, DeFi hacks, and emerging threats.

Live site: [potdealer.github.io/exo-sentinel](https://potdealer.github.io/exo-sentinel)

## What It Does

- Monitors crypto security events across 5 attack vectors: exchange hacks, bridge breaches, smart contract exploits, wallet theft, and flash loan attacks
- Generates AI-powered weekly intelligence briefs with severity scoring, trend analysis, and actionable recommendations
- Maintains a searchable archive of security incidents with source attribution
- Auto-updates weekly via GitHub Actions

## How It Works

1. **Data Collection** — [`scripts/api-call.js`](scripts/api-call.js) queries the CPW API across multiple crypto-specific entity/topic pairs, deduplicates results, and assigns severity ratings based on content analysis
2. **AI Analysis** — [`scripts/generate-brief.js`](scripts/generate-brief.js) feeds the week's events to GitHub Models (GPT-4o-mini) to produce structured intelligence briefs with highlights, trend analysis, and security recommendations
3. **Deployment** — GitHub Actions runs weekly, commits updated data, and deploys the static site to GitHub Pages

## Architecture

```
CPW API (5 query vectors)
    ↓
api-call.js (fetch, deduplicate, severity scoring)
    ↓
data/events.json (archive, max 500 events)
    ↓
generate-brief.js (GitHub Models AI analysis)
    ↓
data/brief.json + data/stats.json
    ↓
index.html (static site, client-side rendering)
    ↓
GitHub Pages
```

## Severity Scoring

Events are automatically classified:
- **Critical** — Bridge exploits, billion-dollar incidents, cross-chain attacks
- **High** — Flash loans, reentrancy, oracle manipulation, $1M+ losses
- **Medium** — Vulnerabilities, phishing campaigns, rug pulls, honeypots
- **Low** — Suspicious activity, minor imbalances, informational

## Setup

1. Clone this repo
2. Subscribe to [CPW API](https://rapidapi.com/CPWatch/api/cpw-tracker) (Basic plan — 100 free requests/month)
3. Add `RAPIDAPI_KEY` to repo Settings → Secrets → Actions
4. Enable GitHub Pages (Settings → Pages → Source: GitHub Actions)
5. Run the workflow manually or wait for the weekly schedule

## Built By

[potdealer](https://github.com/Potdealer) & [ollie](https://x.com/ollie_exo) — onchain builders, smart contract auditors, and AI agent developers.

Built on the [DN Institute Product Kit Template](https://github.com/1712n/product-kit-template). Powered by [CPW API](https://rapidapi.com/CPWatch/api/cpw-tracker) and [GitHub Models](https://docs.github.com/en/github-models).
