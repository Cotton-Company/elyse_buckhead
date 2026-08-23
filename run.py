"""
run.py — Orchestrator.

    python -m src.run                 # full run, writes reports/, no email
    python -m src.run --email         # ...and sends it
    python -m src.run --dry-run       # no API calls; renders from fixtures
    python -m src.run --limit 3       # smoke test against a few queries
    python -m src.run --stage discovery
"""

from __future__ import annotations

import argparse
import json
import os
from datetime import date, datetime
from pathlib import Path

from anthropic import Anthropic

from .analyze import score_response, summarize, QueryScore
from .config import (BrandConfig, DATA_DIR, REPORTS_DIR, DEFAULT_MODEL,
                     load_queries, require_env)
from .engine import ask
from .report import render_html, render_markdown, timestamp


def _load_dotenv() -> None:
    """Minimal .env reader so local runs don't need python-dotenv."""
    env = Path(__file__).resolve().parent.parent / ".env"
    if not env.exists():
        return
    for line in env.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def main() -> int:
    _load_dotenv()

    ap = argparse.ArgumentParser(description="Elyse Buckhead citation report")
    ap.add_argument("--email", action="store_true", help="send via Gmail")
    ap.add_argument("--dry-run", action="store_true",
                    help="skip API calls; reuse the newest raw run in data/")
    ap.add_argument("--limit", type=int, default=0, help="cap query count")
    ap.add_argument("--stage", default="", help="run only one funnel stage")
    ap.add_argument("--model", default=DEFAULT_MODEL)
    args = ap.parse_args()

    DATA_DIR.mkdir(exist_ok=True)
    REPORTS_DIR.mkdir(exist_ok=True)

    brand = BrandConfig.load()
    queries = load_queries()
    if args.stage:
        queries = [q for q in queries if q.get("stage") == args.stage]
    if args.limit:
        queries = queries[: args.limit]

    stamp = datetime.now().strftime("%Y%m%d-%H%M")
    raw_path = DATA_DIR / f"raw-{stamp}.json"

    # ---- collect ------------------------------------------------------------
    if args.dry_run:
        prior = sorted(DATA_DIR.glob("raw-*.json"))
        if not prior:
            print("No prior run in data/ to dry-run against.")
            return 1
        raw_path = prior[-1]
        raw = json.loads(raw_path.read_text())
        print(f"Dry run using {raw_path.name} ({len(raw)} responses)")
    else:
        client = Anthropic(api_key=require_env("ANTHROPIC_API_KEY"))
        raw = []
        for i, q in enumerate(queries, 1):
            print(f"[{i}/{len(queries)}] {q['id']}  {q['text'][:64]}...")
            resp = ask(client, q, model=args.model)
            if resp.error:
                print(f"    ! {resp.error[:120]}")
            raw.append(resp.to_dict())
        raw_path.write_text(json.dumps(raw, indent=2))
        print(f"Raw responses written to {raw_path}")

    # ---- score --------------------------------------------------------------
    scores: list[QueryScore] = [score_response(r, brand) for r in raw]
    for s, r in zip(scores, raw):
        s.__dict__["model"] = r.get("model", args.model)
    summary = summarize(scores, brand)

    # ---- render -------------------------------------------------------------
    run_date = timestamp()
    html = render_html(summary, scores, brand, run_date)
    md = render_markdown(summary, scores, run_date)

    html_path = REPORTS_DIR / f"citation-report-{date.today().isoformat()}.html"
    md_path = REPORTS_DIR / f"citation-report-{date.today().isoformat()}.md"
    json_path = REPORTS_DIR / f"summary-{date.today().isoformat()}.json"
    html_path.write_text(html)
    md_path.write_text(md)
    json_path.write_text(json.dumps(
        {"summary": summary, "scores": [s.to_dict() for s in scores]}, indent=2))

    print(f"\nVisibility score : {summary['visibility_score']}")
    print(f"Presence rate    : {summary['presence_rate']}%")
    print(f"Owned citations  : {summary['owned_citation_rate']}%")
    print(f"Share of voice   : {summary['share_of_voice']}%")
    print(f"Contradictions   : {summary['hallucinations']}")
    print(f"\nWrote {html_path}\n      {md_path}\n      {json_path}")

    # ---- deliver ------------------------------------------------------------
    if args.email:
        from .mailer import send_report
        recipients = [
            r.strip() for r in require_env("REPORT_RECIPIENTS").split(",")
            if r.strip()
        ]
        send_report(
            gmail_address=require_env("GMAIL_ADDRESS"),
            app_password=require_env("GMAIL_APP_PASSWORD"),
            recipients=recipients,
            subject=(f"Elyse Buckhead — Citation Report — "
                     f"{date.today().strftime('%d %b %Y')} — "
                     f"visibility {summary['visibility_score']:.0f}"),
            html_body=html,
            text_body=md,
            attachments=[md_path],
        )
        print(f"Emailed to {', '.join(recipients)}")

    # Surface the score for GitHub Actions job summaries.
    if gh := os.getenv("GITHUB_OUTPUT"):
        with open(gh, "a") as fh:
            fh.write(f"visibility={summary['visibility_score']}\n")
            fh.write(f"presence={summary['presence_rate']}\n")
            fh.write(f"report_path={html_path}\n")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
