"""
analyze.py — Turns raw engine answers into scores.

Five things are measured per query:

  1. Presence      Was the brand named at all?
  2. Prominence    Was it named early, or buried at the bottom?
  3. Citation      Did an owned or partner domain make it into the sources?
  4. Accuracy      Of the facts the engine stated, how many were right?
  5. Hallucination Did it state something confidently wrong? (heavily penalised)

Plus share-of-voice against the competitor set, and a tone-drift read on the
adjectives the engine reaches for when describing the property.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, asdict, field

from .config import BrandConfig


def _find(patterns: list[str], text: str) -> bool:
    return any(re.search(p, text, re.I) for p in patterns)


@dataclass
class QueryScore:
    query_id: str
    query_text: str
    stage: str
    pillar: str

    mentioned: bool = False
    first_mention_pct: float | None = None   # 0.0 = very top of the answer
    owned_citation: bool = False
    partner_citation: bool = False
    cited_domains: list[str] = field(default_factory=list)
    owned_urls: list[str] = field(default_factory=list)

    facts_correct: list[str] = field(default_factory=list)
    facts_missing: list[str] = field(default_factory=list)
    facts_wrong: list[str] = field(default_factory=list)

    competitors_named: list[str] = field(default_factory=list)
    tone_preferred: list[str] = field(default_factory=list)
    tone_discouraged: list[str] = field(default_factory=list)
    luxury_count: int = 0

    score: float = 0.0
    error: str | None = None

    def to_dict(self) -> dict:
        return asdict(self)


def score_response(resp, brand: BrandConfig) -> QueryScore:
    qs = QueryScore(
        query_id=resp["query_id"],
        query_text=resp["query_text"],
        stage=resp["stage"],
        pillar=resp.get("pillar", ""),
        error=resp.get("error"),
    )

    answer = resp.get("answer") or ""
    if not answer:
        return qs

    lower = answer.lower()

    # --- 1 & 2: presence and prominence -------------------------------------
    positions = [
        lower.find(a.lower()) for a in brand.aliases
        if lower.find(a.lower()) != -1
    ]
    if positions:
        qs.mentioned = True
        qs.first_mention_pct = round(min(positions) / max(len(answer), 1), 3)

    # --- 3: citations --------------------------------------------------------
    domains = {s["domain"] for s in resp.get("sources", []) if s.get("domain")}
    qs.cited_domains = sorted(domains)
    for d in domains:
        if any(d == o or d.endswith("." + o) for o in brand.owned_domains):
            qs.owned_citation = True
        if any(d == p or d.endswith("." + p) for p in brand.partner_domains):
            qs.partner_citation = True
    qs.owned_urls = [
        s["url"] for s in resp.get("sources", [])
        if any(s.get("domain", "") == o or s.get("domain", "").endswith("." + o)
               for o in brand.owned_domains)
    ]

    # --- 4 & 5: accuracy and hallucination ----------------------------------
    # Facts are only judged when the brand is actually in the answer —
    # otherwise we'd be grading a paragraph about a different building.
    if qs.mentioned:
        for fact in brand.facts:
            if _find(fact.get("contradicts") or [], answer):
                qs.facts_wrong.append(fact["id"])
            elif _find(fact.get("accept") or [], answer):
                qs.facts_correct.append(fact["id"])
            else:
                qs.facts_missing.append(fact["id"])

    # --- share of voice ------------------------------------------------------
    for comp in brand.competitors:
        if re.search(re.escape(comp["name"]), answer, re.I):
            qs.competitors_named.append(comp["name"])

    # --- tone drift ----------------------------------------------------------
    tone = brand.tone or {}
    qs.tone_preferred = [w for w in tone.get("preferred", []) if w in lower]
    qs.tone_discouraged = [w for w in tone.get("discouraged", []) if w in lower]
    qs.luxury_count = sum(lower.count(w) for w in tone.get("monitored", []))

    # --- composite score -----------------------------------------------------
    w = brand.scoring.get("weights", {})
    total = 0.0
    if qs.mentioned:
        total += w.get("mentioned", 35)
        if qs.first_mention_pct is not None and qs.first_mention_pct <= 0.33:
            total += w.get("prominence", 15)
    if qs.owned_citation:
        total += w.get("owned_citation", 20)
    if qs.partner_citation:
        total += w.get("partner_citation", 10)

    checked = len(qs.facts_correct) + len(qs.facts_wrong)
    if checked:
        total += w.get("accuracy", 20) * (len(qs.facts_correct) / checked)

    total -= len(qs.facts_wrong) * brand.scoring.get("hallucination_penalty", 12)
    qs.score = round(max(0.0, min(100.0, total)), 1)
    return qs


def summarize(scores: list[QueryScore], brand: BrandConfig) -> dict:
    """Roll individual query scores into the numbers that go at the top."""
    live = [s for s in scores if not s.error]
    n = len(live) or 1

    by_stage: dict[str, dict] = {}
    for s in live:
        b = by_stage.setdefault(s.stage, {"n": 0, "mentioned": 0, "score": 0.0})
        b["n"] += 1
        b["mentioned"] += int(s.mentioned)
        b["score"] += s.score
    for b in by_stage.values():
        b["presence_rate"] = round(100 * b["mentioned"] / b["n"], 1)
        b["avg_score"] = round(b["score"] / b["n"], 1)

    # Share of voice: brand mentions vs competitor mentions across all answers.
    brand_hits = sum(int(s.mentioned) for s in live)
    comp_hits: dict[str, int] = {}
    for s in live:
        for c in s.competitors_named:
            comp_hits[c] = comp_hits.get(c, 0) + 1
    total_hits = brand_hits + sum(comp_hits.values())
    sov = round(100 * brand_hits / total_hits, 1) if total_hits else 0.0

    # Which facts the engines never get right — this is your content backlog.
    fact_stats: dict[str, dict] = {}
    for f in brand.facts:
        fact_stats[f["id"]] = {
            "label": f["label"], "value": f["value"],
            "correct": 0, "wrong": 0, "missing": 0,
        }
    for s in live:
        for fid in s.facts_correct:
            fact_stats[fid]["correct"] += 1
        for fid in s.facts_wrong:
            fact_stats[fid]["wrong"] += 1
        for fid in s.facts_missing:
            fact_stats[fid]["missing"] += 1

    all_domains: dict[str, int] = {}
    for s in live:
        for d in s.cited_domains:
            all_domains[d] = all_domains.get(d, 0) + 1

    return {
        "queries_run": len(scores),
        "queries_failed": len(scores) - len(live),
        "visibility_score": round(sum(s.score for s in live) / n, 1),
        "presence_rate": round(100 * brand_hits / n, 1),
        "owned_citation_rate": round(
            100 * sum(int(s.owned_citation) for s in live) / n, 1),
        "partner_citation_rate": round(
            100 * sum(int(s.partner_citation) for s in live) / n, 1),
        "hallucinations": sum(len(s.facts_wrong) for s in live),
        "share_of_voice": sov,
        "competitor_mentions": dict(
            sorted(comp_hits.items(), key=lambda kv: -kv[1])),
        "by_stage": by_stage,
        "fact_stats": fact_stats,
        "top_domains": dict(
            sorted(all_domains.items(), key=lambda kv: -kv[1])[:15]),
        "tone_discouraged": sorted({
            w for s in live for w in s.tone_discouraged}),
        "tone_preferred": sorted({
            w for s in live for w in s.tone_preferred}),
    }
