# Elyse Buckhead — Answer Engine Citation Report

An automated audit of how AI answer engines describe, cite, and rank **Elyse Buckhead**.

The creative brief lists *AEO and GEO articles* as a campaign deliverable and calls itself an *AI-Integrated Creative Brief*. This repository is the measurement layer under that: it asks the questions a real Buckhead buyer would ask an AI assistant, records what comes back, and scores the answer against the brief's own ground truth.

Runs weekly via GitHub Actions. Emails a formatted report through Gmail. Costs a few cents per run.

---

## What it measures

| Metric | What it tells you |
|---|---|
| **Visibility score** | Composite 0–100 across every query. The single number to trend. |
| **Presence rate** | Share of queries where the brand is named at all. |
| **Owned citation rate** | How often `elysebuckhead.com` or `kolterurban.com` appears in the engine's sources. The engine quoting your own material is the strongest possible outcome. |
| **Share of voice** | Brand mentions vs. Veridian Buckhead, The Dillon, Graydon Buckhead. |
| **Fact integrity** | Per-fact tally of correct / absent / **contradicted**. A contradiction is the engine confidently asserting something wrong — 22 stories instead of 20, delivery in 2027 instead of Q4 2028. These are the priority fixes. |
| **Language drift** | Whether the engines reach for the brief's preferred vocabulary (*timeless, refined, walkable, enduring*) or the words it avoids (*developer, exclusive, iconic, world-class*). |

Queries are split into four funnel stages. **Branded** queries should score near 100 — if they don't, your own site isn't being indexed properly. **Discovery** queries are the real prize: they measure whether an engine surfaces Elyse to someone who has never heard the name.

---

## Repository layout

```
elyse-citation-report/
├── config/
│   ├── brand.yaml            ← ground truth from the creative brief. Edit this, not the code.
│   └── queries.yaml          ← the 22-query test set. Add freely; the report scales.
├── src/
│   ├── config.py             loaders
│   ├── engine.py             Anthropic API + web search → answer + cited URLs
│   ├── analyze.py            presence, prominence, citations, accuracy, hallucinations
│   ├── report.py             HTML (email-safe) + Markdown renderers
│   ├── mailer.py             Gmail SMTP
│   └── run.py                orchestrator CLI
├── .github/workflows/
│   └── citation-report.yml   Monday 07:00 ET + manual trigger
├── data/                     raw JSON per run (gitignored — this is your history)
├── reports/                  rendered HTML / MD / JSON
├── requirements.txt
└── .env.example
```

`config/brand.yaml` is deliberately the only file you should need to touch as the project evolves. New price, new delivery date, new competitor — change it there and every score follows.

---

## Build it — step by step

### 1. Create the repository

```bash
gh repo create elyse-citation-report --private --clone
cd elyse-citation-report
```

Or make it in the GitHub UI, clone it, then copy these files in. **Keep it private** — `brand.yaml` contains internal pricing context and the presentation-site password lives in the brief.

### 2. Drop in the files and push

```bash
git add .
git commit -m "Citation report: brand ground truth, query set, scoring, weekly workflow"
git push -u origin main
```

### 3. Get a Gmail App Password

Your normal Google password will not authenticate over SMTP.

1. Go to **myaccount.google.com/security** and turn on **2-Step Verification** if it isn't already.
2. Go to **myaccount.google.com/apppasswords**.
3. Name it `Elyse Citation Report` and create it.
4. Copy the 16-character code. Google shows it once. Strip the spaces.

### 4. Add the four secrets

In the repo: **Settings → Secrets and variables → Actions → New repository secret**.

| Secret name | Value |
|---|---|
| `ANTHROPIC_API_KEY` | Your key from console.anthropic.com |
| `GMAIL_ADDRESS` | The Gmail account sending the report |
| `GMAIL_APP_PASSWORD` | The 16-character App Password from step 3 |
| `REPORT_RECIPIENTS` | Comma-separated list, e.g. `you@agency.com,ataulbee@kolter.com` |

Names must match exactly — the workflow reads them literally.

### 5. Test locally first

Don't debug through Actions. Run it on your machine:

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env      # then paste your real values into .env
python -m src.run --limit 3
```

Three queries, roughly 20 seconds, a few cents. You'll see the score printed and files written to `reports/`. Open the HTML in a browser.

If that works, run the full set and email it to yourself:

```bash
python -m src.run --email
```

### 6. Fire the workflow manually

**Actions → Citation Report → Run workflow**. Leave *send email* checked. Watch the log. When it finishes, the job summary shows the headline score and the full report is attached as a build artifact under **Artifacts**.

### 7. Confirm the schedule

Once the manual run is clean, the cron takes over: **Mondays, 07:00 America/New_York**. GitHub cron is UTC-only and ignores daylight saving, so the workflow is pinned to 12:00 UTC — that's 07:00 EST in winter and 08:00 EDT in summer. Edit the `cron:` line if the summer hour matters.

Note that GitHub disables scheduled workflows in repositories with no activity for 60 days. If the report goes quiet, push any commit to wake it.

---

## Running it

```bash
python -m src.run                      # full run, writes reports/, no email
python -m src.run --email              # ...and sends it
python -m src.run --limit 3            # smoke test
python -m src.run --stage discovery    # one funnel stage only
python -m src.run --dry-run            # re-score and re-render the last run, zero API calls
python -m src.run --model claude-opus-5
```

`--dry-run` is the one to know. It replays the newest `data/raw-*.json` through the scorer, so you can tune regexes in `brand.yaml` or restyle the report without paying for a new round of queries.

---

## Reading the output

**A contradicted fact is worth more of your attention than a low presence rate.** Absence means the engines haven't found you yet — that resolves as the site ages and coverage accumulates. A contradiction means something wrong is circulating and being repeated, and it usually traces back to one syndicated listing or one early press item with a stale figure. Find that source and correct it.

**Check the source list before you conclude anything about the score.** If the engines are drawing on aggregator listings rather than `elysebuckhead.com`, the fix isn't more content — it's making the official site retrievable: clean headings, factual specificity, plain HTML rather than script-rendered text, a page per topic that matches how buyers actually phrase the question.

**Branded queries scoring below ~80 is a technical problem, not a messaging one.**

**Expect run-to-run variance.** These are non-deterministic systems with live retrieval. A five-point move is noise. Trend across four or five runs before drawing a line.

---

## Adapting it

**New query.** Add a block to `config/queries.yaml` with an `id`, `stage`, `pillar`, and `text`. Nothing else changes.

**Changed fact.** Update `value` and the `accept` patterns in `config/brand.yaml`. Add `contradicts` patterns for the wrong version if it's already in circulation — that's how you catch stale figures being repeated.

**New competitor.** Add to the `competitors` list. Share of voice recalculates automatically.

**Different scoring emphasis.** The weights live at the bottom of `brand.yaml`. If citation matters more to you than prominence for this campaign, move the numbers.

**Another project.** Fork it, replace the two YAML files. None of the Python is Elyse-specific.

---

## Notes and limitations

The report queries the Anthropic API with server-side web search enabled. That's a reasonable proxy for how retrieval-augmented answer engines behave, and it's the only one with a stable API — but it is a proxy. ChatGPT, Perplexity, and Google AI Overviews each have their own index and ranking, and none offers a supported programmatic interface for this. Read the numbers as a directional signal of retrievability, not as a literal reading of what any one consumer product says. If you want per-engine truth, spot-check the branded queries by hand each month and note the divergence.

Regex fact-matching is blunt. It will occasionally miss a correctly-stated fact that's phrased unusually. `--dry-run` exists so you can tighten patterns cheaply when you spot one.

Reports are internal. They quote machine-generated text that may be inaccurate and should not be circulated to prospective purchasers or attached to client-facing marketing decks without a note on methodology.
