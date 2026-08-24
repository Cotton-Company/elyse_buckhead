# Elyse Buckhead — AI Citation Agent

Measures how often Elyse Buckhead appears in AI-generated answers to the questions real Buckhead buyers ask, and emails a branded report every Monday.

Every Monday at 8:00 AM ET, the agent runs 25 buyer-realistic prompts through Claude with live web search, grades each answer, and sends an HTML report. It runs entirely on GitHub Actions — no server, no machine left on.

Same architecture as the Cotton & Company citation agent. If you have set that one up, this will feel identical: same file names, same secret names, same workflow.

---

## What it measures

| Metric | Definition |
|---|---|
| **Citation rate** | % of prompts where Elyse Buckhead is named **and** a source is credited |
| **Visibility rate** | % of prompts where the brand appears at all (cited + mentioned) |
| **Owned wins** | Prompts where `elysebuckhead.com` or `kolterurban.com` is one of the credited sources |
| **Share of voice** | Appearances vs. Veridian Buckhead, The Dillon, Graydon Buckhead, The Charles |
| **Fact integrity** | Details the engines asserted **incorrectly** — wrong unit count, wrong delivery year, wrong architect |
| **Language** | Whether engines use the brief's preferred vocabulary or the words it avoids |
| **Week-over-week delta** | Change vs. the previous run, from `history.json` |

**Cited vs. mentioned matters.** "Mentioned" means the model knows the name. "Cited" means it will point at a source that backs it up. Moving prompts from mentioned to cited is the whole point of the content program.

**Fact errors matter more than absence.** Absence means the engines have not found you yet, and that resolves as coverage accumulates. A contradiction means something wrong is circulating and being repeated — usually traceable to one stale listing.

---

## Files

| File | Purpose |
|---|---|
| `config.js` | **All client-specific settings** — brand, domains, competitors, verified facts, brand voice, palette, model. Change this file to re-point at another property. |
| `prompts.js` | The 25-prompt library, grouped into 5 clusters. Safe to edit anytime. |
| `agent.js` | Research engine. Two API calls per prompt: ask with web search, then grade the answer. Includes retry/backoff. |
| `report.js` | Builds the branded HTML email in the Elyse palette (dark green `#2C352A` / tan `#D9CDB6` / foil `#B08D57`). Table-based inline styles for email-client compatibility. |
| `index.js` | Entry point. Orchestrates the run, writes the report file, updates history, sends the email. |
| `package.json` | Node 20+, two dependencies: `dotenv`, `nodemailer`. |
| `.github/workflows/citation.yml` | The Monday schedule + manual trigger. No push trigger — commits do not start runs. |
| `.env.example` | Template for local runs. |
| `history.json` | Auto-generated results history, committed by the workflow each week. |

The five `.js` files sit at the repository root. Only `.github/workflows/` is nested. That flat layout is deliberate — it makes browser drag-and-drop upload work reliably.

---

## Setup

### 1. Create the repository

Private. `config.js` carries internal price context.

### 2. Add the four secrets

Repo → **Settings → Secrets and variables → Actions → New repository secret**.

| Secret | Value |
|---|---|
| `ANTHROPIC_API_KEY` | From console.anthropic.com |
| `EMAIL_FROM` | The Gmail address sending the report |
| `EMAIL_TO` | Comma-separated recipients |
| `GMAIL_APP_PASSWORD` | 16-character App Password, not your Google password |

Identical names to the Cotton & Company repo, so the same values work if you are sending from the same mailbox.

### 3. Gmail App Password

Google blocks plain-password SMTP. At **myaccount.google.com/apppasswords** (requires 2-Step Verification), create one named `Elyse Citation Agent` and copy the 16 characters. Strip the spaces.

### 4. Test locally first

```bash
npm install
cp .env.example .env      # paste your real values in
npm run test-run          # 3 prompts, no email, about 60 seconds
```

Open the generated `report-YYYY-MM-DD.html` in a browser. If it looks right:

```bash
node index.js             # full 25-prompt run, sends the email
```

### 5. Fire the workflow manually

**Actions → Weekly AI citation report → Run workflow.** When it finishes, the HTML report is attached under **Artifacts** and `history.json` is committed back to the repo.

### 6. Confirm the schedule

Mondays at 13:00 UTC. GitHub cron ignores daylight saving, so that lands at 8:00 AM EST in winter and 9:00 AM EDT in summer. Change the cron line to `0 12 * * 1` if you would rather have 8:00 AM in summer.

GitHub disables scheduled workflows in repos with no activity for 60 days. The weekly `history.json` commit keeps it awake on its own.

---

## Running it

```bash
node index.js                 # full run + email
node index.js --no-email      # full run, write report only
node index.js --limit 3       # smoke test
node index.js --dry-run       # rebuild the report from last-run.json, zero API calls
```

`--dry-run` is the one to know. It replays the last saved run through the scorer and renderer, so you can retune `config.js` or restyle the report without paying for a new round of queries.

---

## Cost

Two API calls per prompt, 50 calls per weekly run. On `claude-haiku-4-5` with web search, roughly **$0.30–$0.80 per run**. Switching `MODEL` to `claude-sonnet-5` gives richer answers at roughly 5× that.

---

## Adapting it

**New prompt.** Add an object to `prompts.js` with `text`, `cluster`, `priority`. Nothing else changes.

**Changed fact.** Update the `facts` array in `config.js`. The grader checks answers against whatever is in that list.

**New competitor.** Add to `competitors` in `config.js`, or override via the workflow's `COMPETITOR_*` env vars.

**Another property.** Copy the repo, rewrite `config.js` and `prompts.js`. None of the other files are Elyse-specific.

---

## Limitations

The agent queries the Anthropic API with server-side web search. That is a reasonable proxy for how retrieval-augmented answer engines behave and the only one with a stable API — but it is a proxy. ChatGPT, Perplexity and Google AI Overviews each run their own index and none offers a supported programmatic interface. Read the numbers as a directional signal of retrievability. Spot-check the branded prompts by hand monthly and note any divergence.

The grader is a language model reading another language model's output. It is consistent enough to trend, not precise enough to audit. Where a fact error looks surprising, open the saved `last-run.json` and read the actual answer.

Reports are internal. They quote machine-generated text that may be inaccurate and should not be circulated to prospective purchasers.
