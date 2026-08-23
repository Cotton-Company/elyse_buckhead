"""
report.py — Renders the scored run into an email-safe HTML report and a
Markdown twin for the repo / PR comments.

Styling follows the brief's palette (cream, tan, moss, green, dark green,
foil used sparingly) and its tone: restrained, editorial, no exclamation
marks, no urgency. Inline styles and table layout only — Gmail strips
<style> blocks and does not support flex or grid reliably.
"""

from __future__ import annotations

from datetime import datetime

CREAM = "#F6F2E9"
TAN = "#D9CDB6"
MOSS = "#7C8A6B"
GREEN = "#4A5A46"
DARK = "#2C352A"
INK = "#1F2420"
FOIL = "#B08D57"
MUTED = "#6E7268"


def _band(v: float) -> str:
    if v >= 70:
        return GREEN
    if v >= 40:
        return FOIL
    return "#9A4A3C"


def _metric(label: str, value: str, note: str = "") -> str:
    return f"""
    <td width="25%" valign="top" style="padding:0 8px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:{CREAM};border:1px solid {TAN};">
        <tr><td style="padding:16px 14px;">
          <div style="font:400 10px/1.4 Montserrat,Helvetica,Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:{MUTED};">{label}</div>
          <div style="font:400 30px/1.15 Georgia,'Times New Roman',serif;color:{DARK};padding-top:6px;">{value}</div>
          <div style="font:400 11px/1.4 Montserrat,Helvetica,Arial,sans-serif;color:{MUTED};padding-top:4px;">{note}</div>
        </td></tr>
      </table>
    </td>"""


def _h2(text: str) -> str:
    return (f'<h2 style="font:400 20px/1.3 Georgia,\'Times New Roman\',serif;'
            f'color:{DARK};margin:36px 0 4px;">{text}</h2>'
            f'<div style="height:1px;background:{TAN};margin-bottom:14px;"></div>')


def render_html(summary: dict, scores: list, brand, run_date: str) -> str:
    rows = []
    for s in sorted(scores, key=lambda x: (x.stage, -x.score)):
        marks = []
        if s.owned_citation:
            marks.append("owned")
        if s.partner_citation:
            marks.append("partner")
        if s.facts_wrong:
            marks.append(f"{len(s.facts_wrong)} wrong")
        rows.append(f"""
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid {TAN};font:400 13px/1.45 Montserrat,Helvetica,Arial,sans-serif;color:{INK};">
            {s.query_text}
            <div style="font-size:11px;color:{MUTED};padding-top:3px;text-transform:uppercase;letter-spacing:.08em;">{s.stage}</div>
          </td>
          <td align="center" style="padding:10px 8px;border-bottom:1px solid {TAN};font:400 13px Montserrat,Helvetica,Arial,sans-serif;color:{INK};">
            {'Yes' if s.mentioned else '&mdash;'}
          </td>
          <td align="center" style="padding:10px 8px;border-bottom:1px solid {TAN};font:400 12px Montserrat,Helvetica,Arial,sans-serif;color:{MUTED};">
            {', '.join(marks) or '&mdash;'}
          </td>
          <td align="right" style="padding:10px 12px;border-bottom:1px solid {TAN};font:400 15px Georgia,serif;color:{_band(s.score)};">
            {s.score:.0f}
          </td>
        </tr>""")

    fact_rows = []
    for fid, f in sorted(summary["fact_stats"].items(),
                         key=lambda kv: (-kv[1]["wrong"], -kv[1]["missing"])):
        if f["correct"] == 0 and f["wrong"] == 0 and f["missing"] == 0:
            continue
        state = ("Contradicted" if f["wrong"] else
                 "Absent" if f["correct"] == 0 else "Stated correctly")
        colour = ("#9A4A3C" if f["wrong"] else
                  FOIL if f["correct"] == 0 else GREEN)
        fact_rows.append(f"""
        <tr>
          <td style="padding:9px 12px;border-bottom:1px solid {TAN};font:400 13px Montserrat,Helvetica,Arial,sans-serif;color:{INK};">{f['label']}</td>
          <td style="padding:9px 12px;border-bottom:1px solid {TAN};font:400 13px Montserrat,Helvetica,Arial,sans-serif;color:{MUTED};">{f['value']}</td>
          <td align="right" style="padding:9px 12px;border-bottom:1px solid {TAN};font:400 12px Montserrat,Helvetica,Arial,sans-serif;color:{colour};">{state}<br><span style="color:{MUTED};">right in {f['correct']} of {f['correct']+f['wrong']+f['missing']} answers</span></td>
        </tr>""")

    comp_rows = "".join(
        f"""<tr>
          <td style="padding:8px 12px;border-bottom:1px solid {TAN};font:400 13px Montserrat,Helvetica,Arial,sans-serif;color:{INK};">{name}</td>
          <td align="right" style="padding:8px 12px;border-bottom:1px solid {TAN};font:400 13px Georgia,serif;color:{MUTED};">{count}</td>
        </tr>"""
        for name, count in summary["competitor_mentions"].items()
    ) or f'<tr><td style="padding:10px 12px;font:400 13px Montserrat,sans-serif;color:{MUTED};">No competitors named in this run.</td></tr>'

    domain_rows = "".join(
        f"""<tr>
          <td style="padding:7px 12px;border-bottom:1px solid {TAN};font:400 12px Montserrat,Helvetica,Arial,sans-serif;color:{INK};">{d}</td>
          <td align="right" style="padding:7px 12px;border-bottom:1px solid {TAN};font:400 12px Georgia,serif;color:{MUTED};">{c}</td>
        </tr>"""
        for d, c in summary["top_domains"].items()
    )

    stage_rows = "".join(
        f"""<tr>
          <td style="padding:8px 12px;border-bottom:1px solid {TAN};font:400 13px Montserrat,Helvetica,Arial,sans-serif;color:{INK};text-transform:capitalize;">{stage}</td>
          <td align="right" style="padding:8px 12px;border-bottom:1px solid {TAN};font:400 13px Georgia,serif;color:{MUTED};">{b['presence_rate']}%</td>
          <td align="right" style="padding:8px 12px;border-bottom:1px solid {TAN};font:400 13px Georgia,serif;color:{_band(b['avg_score'])};">{b['avg_score']}</td>
        </tr>"""
        for stage, b in summary["by_stage"].items()
    )

    tone_note = ", ".join(summary["tone_discouraged"]) or "none detected"

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Elyse Buckhead &mdash; Citation Report</title>
</head>
<body style="margin:0;padding:0;background:{CREAM};">
<table width="100%" cellpadding="0" cellspacing="0" style="background:{CREAM};">
<tr><td align="center" style="padding:32px 16px;">
<table width="720" cellpadding="0" cellspacing="0" style="max-width:720px;background:#FFFFFF;border:1px solid {TAN};">

  <tr><td style="background:{DARK};padding:34px 32px;">
    <div style="font:400 11px/1 Montserrat,Helvetica,Arial,sans-serif;letter-spacing:.28em;text-transform:uppercase;color:{TAN};">Elyse Buckhead</div>
    <div style="font:400 30px/1.2 Georgia,'Times New Roman',serif;color:{CREAM};padding-top:10px;">Answer Engine Citation Report</div>
    <div style="font:400 12px Montserrat,Helvetica,Arial,sans-serif;color:{MOSS};padding-top:8px;">{run_date} &middot; {summary['queries_run']} queries &middot; model {scores[0].__dict__.get('model', '')}</div>
  </td></tr>

  <tr><td style="padding:26px 24px 6px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      {_metric("Visibility", f"{summary['visibility_score']:.0f}", "composite, 0&ndash;100")}
      {_metric("Presence", f"{summary['presence_rate']:.0f}%", "queries naming the brand")}
      {_metric("Owned cites", f"{summary['owned_citation_rate']:.0f}%", "own domains in sources")}
      {_metric("Share of voice", f"{summary['share_of_voice']:.0f}%", "vs. tracked competitors")}
    </tr></table>
  </td></tr>

  <tr><td style="padding:0 32px 32px;">

    {_h2("Where the brand stands by funnel stage")}
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:6px 12px;font:400 10px Montserrat,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:{MUTED};">Stage</td>
        <td align="right" style="padding:6px 12px;font:400 10px Montserrat,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:{MUTED};">Presence</td>
        <td align="right" style="padding:6px 12px;font:400 10px Montserrat,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:{MUTED};">Avg score</td>
      </tr>
      {stage_rows}
    </table>
    <p style="font:400 13px/1.6 Montserrat,Helvetica,Arial,sans-serif;color:{MUTED};margin:14px 0 0;">
      Branded queries should sit near 100. Discovery is the number that matters:
      it measures whether the engines surface Elyse to a buyer who has not yet
      heard the name.
    </p>

    {_h2("Fact integrity")}
    <p style="font:400 13px/1.6 Montserrat,Helvetica,Arial,sans-serif;color:{MUTED};margin:0 0 12px;">
      {summary['hallucinations']} contradicted statement(s) across this run. A
      contradiction is a fact the engine asserted incorrectly &mdash; these are
      the items to correct at source first.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0">{''.join(fact_rows)}</table>

    {_h2("Competitive share of voice")}
    <table width="100%" cellpadding="0" cellspacing="0">{comp_rows}</table>

    {_h2("Sources the engines are drawing on")}
    <table width="100%" cellpadding="0" cellspacing="0">{domain_rows}</table>

    {_h2("Query-level detail")}
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:6px 12px;font:400 10px Montserrat,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:{MUTED};">Query</td>
        <td align="center" style="padding:6px 8px;font:400 10px Montserrat,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:{MUTED};">Named</td>
        <td align="center" style="padding:6px 8px;font:400 10px Montserrat,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:{MUTED};">Signals</td>
        <td align="right" style="padding:6px 12px;font:400 10px Montserrat,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:{MUTED};">Score</td>
      </tr>
      {''.join(rows)}
    </table>

    {_h2("Language drift")}
    <p style="font:400 13px/1.6 Montserrat,Helvetica,Arial,sans-serif;color:{MUTED};margin:0;">
      Off-voice vocabulary appearing in engine descriptions: {tone_note}.
      On-voice vocabulary present: {', '.join(summary['tone_preferred']) or 'none detected'}.
      Where the engines reach for language the brief avoids, the correction is
      upstream &mdash; in the published copy they are summarising.
    </p>

  </td></tr>

  <tr><td style="background:{CREAM};border-top:1px solid {TAN};padding:20px 32px;">
    <div style="font:400 11px/1.6 Montserrat,Helvetica,Arial,sans-serif;color:{MUTED};">
      Generated automatically from config/brand.yaml and config/queries.yaml.
      Figures describe machine-generated answers at a point in time and will
      vary between runs. Internal use only &mdash; not for distribution to
      prospective purchasers.
    </div>
  </td></tr>

</table>
</td></tr></table>
</body></html>"""


def render_markdown(summary: dict, scores: list, run_date: str) -> str:
    lines = [
        f"# Elyse Buckhead — Answer Engine Citation Report",
        f"_{run_date} · {summary['queries_run']} queries_",
        "",
        "| Metric | Value |",
        "|---|---|",
        f"| Visibility score | **{summary['visibility_score']}** / 100 |",
        f"| Presence rate | {summary['presence_rate']}% |",
        f"| Owned-domain citation rate | {summary['owned_citation_rate']}% |",
        f"| Partner-domain citation rate | {summary['partner_citation_rate']}% |",
        f"| Share of voice | {summary['share_of_voice']}% |",
        f"| Contradicted facts | {summary['hallucinations']} |",
        f"| Failed queries | {summary['queries_failed']} |",
        "",
        "## By stage",
        "",
        "| Stage | Presence | Avg score |",
        "|---|---|---|",
    ]
    for stage, b in summary["by_stage"].items():
        lines.append(f"| {stage} | {b['presence_rate']}% | {b['avg_score']} |")

    lines += ["", "## Fact integrity", "",
              "| Fact | Correct value | Correct | Wrong | Absent |",
              "|---|---|---|---|---|"]
    for f in summary["fact_stats"].values():
        lines.append(
            f"| {f['label']} | {f['value']} | {f['correct']} | {f['wrong']} | {f['missing']} |")

    lines += ["", "## Query detail", "",
              "| Query | Stage | Named | Owned cite | Wrong facts | Score |",
              "|---|---|---|---|---|---|"]
    for s in sorted(scores, key=lambda x: -x.score):
        lines.append(
            f"| {s.query_text} | {s.stage} | {'yes' if s.mentioned else 'no'} | "
            f"{'yes' if s.owned_citation else 'no'} | {len(s.facts_wrong)} | {s.score:.0f} |")

    lines += ["", "## Sources cited", ""]
    for d, c in summary["top_domains"].items():
        lines.append(f"- `{d}` — {c}")

    return "\n".join(lines) + "\n"


def timestamp() -> str:
    return datetime.now().strftime("%d %B %Y, %H:%M")
