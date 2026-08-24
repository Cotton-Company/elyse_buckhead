// report.js — builds the branded HTML email.
//
// Table-based layout with inline styles only. Gmail strips <style> blocks and
// does not reliably support flex or grid. Palette and tone follow the Elyse
// creative brief: cream, tan, moss, green, dark green, foil used sparingly.
'use strict';

const { CONFIG } = require('./config');

const P = CONFIG.palette;
const SERIF = "Georgia,'Times New Roman',serif";
const SANS = "Montserrat,Helvetica,Arial,sans-serif";

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

function delta(current, previous) {
  if (previous === null || previous === undefined) return '';
  const d = current - previous;
  if (d === 0) return `<span style="color:${P.slate};font-size:11px;"> no change</span>`;
  const color = d > 0 ? P.positive : P.negative;
  const arrow = d > 0 ? '&#9650;' : '&#9660;';
  return `<span style="color:${color};font-size:11px;"> ${arrow} ${Math.abs(d)} pt</span>`;
}

function metric(label, value, note, deltaHtml = '') {
  return `
  <td width="25%" valign="top" style="padding:0 6px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:${P.cream};border:1px solid ${P.tan};">
      <tr><td style="padding:16px 14px;">
        <div style="font:400 10px/1.4 ${SANS};letter-spacing:.12em;text-transform:uppercase;color:${P.slate};">${label}</div>
        <div style="font:400 30px/1.15 ${SERIF};color:${P.darkGreen};padding-top:6px;">${value}</div>
        ${deltaHtml ? `<div style="padding-top:3px;white-space:nowrap;">${deltaHtml}</div>` : ''}
        <div style="font:400 11px/1.4 ${SANS};color:${P.slate};padding-top:4px;">${note}</div>
      </td></tr>
    </table>
  </td>`;
}

function h2(text) {
  return `<h2 style="font:400 20px/1.3 ${SERIF};color:${P.darkGreen};margin:34px 0 4px;">${text}</h2>
          <div style="height:1px;background:${P.tan};margin-bottom:14px;"></div>`;
}

function statusChip(status) {
  const map = {
    cited: [P.green, 'Cited'],
    mentioned: [P.foil, 'Mentioned'],
    absent: [P.slate, 'Absent'],
  };
  const [color, label] = map[status] || map.absent;
  return `<span style="font:400 11px ${SANS};letter-spacing:.06em;text-transform:uppercase;color:${color};">${label}</span>`;
}

function buildReport(results, summary, previous) {
  const prev = previous || {};
  const runDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  // ── cluster table ──
  const clusterRows = Object.entries(summary.byCluster)
    .map(
      ([name, b]) => `
    <tr>
      <td style="padding:9px 12px;border-bottom:1px solid ${P.tan};font:400 13px ${SANS};color:${P.ink};">${esc(name)}</td>
      <td align="right" style="padding:9px 12px;border-bottom:1px solid ${P.tan};font:400 13px ${SERIF};color:${P.slate};">${b.visibilityRate}%</td>
      <td align="right" style="padding:9px 12px;border-bottom:1px solid ${P.tan};font:400 13px ${SERIF};color:${b.citationRate >= 50 ? P.green : P.foil};">${b.citationRate}%</td>
      <td align="right" style="padding:9px 12px;border-bottom:1px solid ${P.tan};font:400 12px ${SANS};color:${P.slate};">${b.cited}/${b.total}</td>
    </tr>`
    )
    .join('');

  // ── fact errors ──
  const factRows = Object.entries(summary.factErrors)
    .sort((a, b) => b[1].count - a[1].count)
    .map(
      ([label, info]) => `
    <tr>
      <td style="padding:9px 12px;border-bottom:1px solid ${P.tan};font:400 13px ${SANS};color:${P.ink};">${esc(label)}</td>
      <td style="padding:9px 12px;border-bottom:1px solid ${P.tan};font:400 12px ${SANS};color:${P.negative};">${esc(info.examples.join('; ') || 'contradicted')}</td>
      <td align="right" style="padding:9px 12px;border-bottom:1px solid ${P.tan};font:400 13px ${SERIF};color:${P.negative};">${info.count}&times;</td>
    </tr>`
    )
    .join('');

  const outdatedRows = Object.entries(summary.factOutdated || {})
    .sort((a, b) => b[1].count - a[1].count)
    .map(
      ([label, info]) => `
    <tr>
      <td style="padding:9px 12px;border-bottom:1px solid ${P.tan};font:400 13px ${SANS};color:${P.ink};">${esc(label)}</td>
      <td style="padding:9px 12px;border-bottom:1px solid ${P.tan};font:400 12px ${SANS};color:${P.foil};">${esc(info.examples.join('; ') || 'earlier published value')}</td>
      <td align="right" style="padding:9px 12px;border-bottom:1px solid ${P.tan};font:400 13px ${SERIF};color:${P.foil};">${info.count}&times;</td>
    </tr>`
    )
    .join('');

  const factSection = `
    ${
      factRows
        ? `<p style="font:400 13px/1.6 ${SANS};color:${P.slate};margin:0 0 10px;">
             <strong style="color:${P.negative};">Genuine errors.</strong> Neither
             current nor previously published &mdash; a third party has this wrong.
             Worth an email to the source.
           </p>
           <table width="100%" cellpadding="0" cellspacing="0">${factRows}</table>`
        : `<p style="font:400 13px/1.6 ${SANS};color:${P.green};margin:0 0 10px;">
             <strong>No genuine errors this run.</strong> Nothing the engines
             stated was outright false.
           </p>`
    }
    ${
      outdatedRows
        ? `<p style="font:400 13px/1.6 ${SANS};color:${P.slate};margin:22px 0 10px;">
             <strong style="color:${P.foil};">Outdated, not wrong.</strong> These
             were accurate when published and are still circulating because they
             are the most specific figures available. The remedy is publishing
             current material with exact numbers and visible dates &mdash; not
             corrections.
           </p>
           <table width="100%" cellpadding="0" cellspacing="0">${outdatedRows}</table>`
        : ''
    }`;

  // ── competitors ──
  const compRows =
    Object.entries(summary.competitorCounts)
      .sort((a, b) => b[1] - a[1])
      .map(
        ([name, count]) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid ${P.tan};font:400 13px ${SANS};color:${P.ink};">${esc(name)}</td>
      <td align="right" style="padding:8px 12px;border-bottom:1px solid ${P.tan};font:400 13px ${SERIF};color:${P.slate};">${count}</td>
    </tr>`
      )
      .join('') ||
    `<tr><td style="padding:10px 12px;font:400 13px ${SANS};color:${P.slate};">No competitors named this run.</td></tr>`;

  // ── source domains ──
  const domainRows = Object.entries(summary.domainCounts)
    .map(
      ([d, c]) => `
    <tr>
      <td style="padding:7px 12px;border-bottom:1px solid ${P.tan};font:400 12px ${SANS};color:${
        CONFIG.ownedDomains.some((o) => d.endsWith(o)) ? P.green : P.ink
      };">${esc(d)}${CONFIG.ownedDomains.some((o) => d.endsWith(o)) ? ' &middot; owned' : ''}</td>
      <td align="right" style="padding:7px 12px;border-bottom:1px solid ${P.tan};font:400 12px ${SERIF};color:${P.slate};">${c}</td>
    </tr>`
    )
    .join('');

  // ── prompt detail ──
  const order = { cited: 0, mentioned: 1, absent: 2 };
  const promptRows = [...results]
    .sort((a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3))
    .map(
      (r) => `
    <tr>
      <td style="padding:11px 12px;border-bottom:1px solid ${P.tan};font:400 13px/1.45 ${SANS};color:${P.ink};">
        ${esc(r.prompt)}
        <div style="font:400 11px ${SANS};color:${P.slate};padding-top:3px;letter-spacing:.06em;text-transform:uppercase;">${esc(r.cluster)}${r.position ? ` &middot; ranked #${r.position}` : ''}</div>
        ${r.note ? `<div style="font:400 12px/1.5 ${SANS};color:${P.slate};padding-top:5px;font-style:italic;">${esc(r.note)}</div>` : ''}
      </td>
      <td align="right" valign="top" style="padding:11px 12px;border-bottom:1px solid ${P.tan};white-space:nowrap;">
        ${statusChip(r.status)}
        ${r.ownedCitation ? `<div style="font:400 10px ${SANS};color:${P.green};padding-top:3px;">owned source</div>` : ''}
        ${r.factsWrong && r.factsWrong.length ? `<div style="font:400 10px ${SANS};color:${P.negative};padding-top:3px;">${r.factsWrong.length} wrong</div>` : ''}
        ${r.factsOutdated && r.factsOutdated.length ? `<div style="font:400 10px ${SANS};color:${P.foil};padding-top:3px;">${r.factsOutdated.length} outdated</div>` : ''}
        ${r.error ? `<div style="font:400 10px ${SANS};color:${P.negative};padding-top:3px;">failed</div>` : ''}
      </td>
    </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(CONFIG.brand)} — ${esc(CONFIG.reportTitle)}</title>
</head>
<body style="margin:0;padding:0;background:${P.cream};">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${P.cream};">
<tr><td align="center" style="padding:30px 14px;">
<table width="720" cellpadding="0" cellspacing="0" style="max-width:720px;background:#FFFFFF;border:1px solid ${P.tan};">

  <tr><td style="background:${P.darkGreen};padding:34px 30px;">
    <div style="font:400 11px/1 ${SANS};letter-spacing:.28em;text-transform:uppercase;color:${P.tan};">${esc(CONFIG.brand)}</div>
    <div style="font:400 30px/1.2 ${SERIF};color:${P.cream};padding-top:10px;">${esc(CONFIG.reportTitle)}</div>
    <div style="font:400 12px ${SANS};color:${P.moss};padding-top:8px;">${runDate} &middot; ${summary.totalPrompts} prompts &middot; ${esc(CONFIG.model)}</div>
  </td></tr>

  <tr><td style="padding:24px 22px 4px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      ${metric('Citation rate', `${summary.citationRate}%`, 'named with a source', delta(summary.citationRate, prev.citationRate))}
      ${metric('Visibility', `${summary.visibilityRate}%`, 'named at all', delta(summary.visibilityRate, prev.visibilityRate))}
      ${metric('Owned wins', `${summary.ownedRate}%`, 'own domain credited', delta(summary.ownedRate, prev.ownedRate))}
      ${metric('Share of voice', `${summary.shareOfVoice}%`, 'vs. competitors', delta(summary.shareOfVoice, prev.shareOfVoice))}
    </tr></table>
  </td></tr>

  <tr><td style="padding:0 30px 30px;">

    ${h2('Performance by cluster')}
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:6px 12px;font:400 10px ${SANS};letter-spacing:.12em;text-transform:uppercase;color:${P.slate};">Cluster</td>
        <td align="right" style="padding:6px 12px;font:400 10px ${SANS};letter-spacing:.12em;text-transform:uppercase;color:${P.slate};">Visible</td>
        <td align="right" style="padding:6px 12px;font:400 10px ${SANS};letter-spacing:.12em;text-transform:uppercase;color:${P.slate};">Cited</td>
        <td align="right" style="padding:6px 12px;font:400 10px ${SANS};letter-spacing:.12em;text-transform:uppercase;color:${P.slate};">Count</td>
      </tr>
      ${clusterRows}
    </table>
    <p style="font:400 13px/1.6 ${SANS};color:${P.slate};margin:14px 0 0;">
      Branded prompts should sit near 100 percent. Buckhead discovery is the
      number that matters most &mdash; it measures whether an engine surfaces
      Elyse to someone who has not yet heard the name.
    </p>

    ${h2('Fact accuracy and currency')}
    ${factSection}

    ${h2('Competitive share of voice')}
    <table width="100%" cellpadding="0" cellspacing="0">${compRows}</table>

    ${h2('Sources the engines credited')}
    <table width="100%" cellpadding="0" cellspacing="0">${domainRows}</table>

    ${h2('Prompt detail')}
    <table width="100%" cellpadding="0" cellspacing="0">${promptRows}</table>

    ${h2('Language')}
    <p style="font:400 13px/1.6 ${SANS};color:${P.slate};margin:0;">
      Off-voice vocabulary appearing in engine descriptions:
      <strong style="color:${summary.voiceAvoid.length ? P.negative : P.green};">${esc(summary.voiceAvoid.join(', ')) || 'none'}</strong>.
      On-voice vocabulary present:
      <strong style="color:${P.green};">${esc(summary.voicePreferred.join(', ')) || 'none'}</strong>.
      Where the engines reach for language the brief avoids, the correction is
      upstream, in the published copy they are summarising.
    </p>

  </td></tr>

  <tr><td style="background:${P.cream};border-top:1px solid ${P.tan};padding:18px 30px;">
    <div style="font:400 11px/1.6 ${SANS};color:${P.slate};">
      Generated automatically from config.js and prompts.js.
      ${summary.failed ? `${summary.failed} prompt(s) failed this run and were excluded. ` : ''}
      Figures describe machine-generated answers at a point in time and vary
      between runs. Internal use only &mdash; not for distribution to
      prospective purchasers.
    </div>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;
}

module.exports = { buildReport };
