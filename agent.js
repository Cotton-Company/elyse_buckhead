// agent.js — citation research engine.
//
// Two API calls per prompt:
//   1. Ask the question with live web search on, exactly as a real buyer would.
//   2. Analyze that answer for brand status, sources, competitors, and whether
//      the facts it stated match the creative brief.
//
// Splitting these apart matters: if you ask the model to answer AND self-grade
// in one call, it becomes aware it is being measured and the answer skews.
'use strict';

const { CONFIG } = require('./config');

const API_URL = 'https://api.anthropic.com/v1/messages';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function callClaude(apiKey, body, attempt = 1) {
  let res;
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });
  } catch (networkErr) {
    if (attempt < 3) {
      await sleep(3000 * attempt);
      return callClaude(apiKey, body, attempt + 1);
    }
    throw networkErr;
  }

  // 429 and 5xx are transient. Back off and retry.
  if ((res.status === 429 || res.status >= 500) && attempt < 3) {
    const retryAfter = Number(res.headers.get('retry-after')) || attempt * 5;
    await sleep(retryAfter * 1000);
    return callClaude(apiKey, body, attempt + 1);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${detail.slice(0, 300)}`);
  }

  return res.json();
}

// ── Step 1: ask the question the way a buyer would ────────────
async function askQuestion(apiKey, promptText) {
  const data = await callClaude(apiKey, {
    model: CONFIG.model,
    max_tokens: CONFIG.maxTokens,
    system:
      'You are a web-connected assistant answering a consumer real estate ' +
      'question. Search the web before answering. Be specific: name buildings, ' +
      'prices, developers and timelines where you can verify them. If a detail ' +
      'is uncertain, say so rather than guessing. Answer in 200-400 words.',
    messages: [{ role: 'user', content: promptText }],
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 4 }],
  });

  let answer = '';
  const sources = new Map();

  for (const block of data.content || []) {
    if (block.type === 'text') {
      answer += block.text;
      for (const c of block.citations || []) {
        if (c.url && !sources.has(c.url)) {
          sources.set(c.url, { url: c.url, title: c.title || '' });
        }
      }
    } else if (block.type === 'web_search_tool_result') {
      for (const r of block.content || []) {
        if (r.url && !sources.has(r.url)) {
          sources.set(r.url, { url: r.url, title: r.title || '' });
        }
      }
    }
  }

  return { answer, sources: [...sources.values()] };
}

// ── Step 2: grade the answer ──────────────────────────────────
async function analyzeAnswer(apiKey, promptText, answer, sources) {
  const factList = CONFIG.facts
    .map((f) => `- ${f.label}: ${f.value}`)
    .join('\n');

  const data = await callClaude(apiKey, {
    model: CONFIG.model,
    max_tokens: 1200,
    system:
      'You grade AI-generated answers for brand visibility. Respond with a ' +
      'single JSON object and nothing else — no preamble, no markdown fences.',
    messages: [
      {
        role: 'user',
        content: `Grade this answer for the brand "${CONFIG.brand}".

QUESTION ASKED:
${promptText}

ANSWER GIVEN:
${answer}

SOURCES THE ANSWER DREW ON:
${sources.map((s) => s.url).join('\n') || '(none)'}

VERIFIED FACTS about ${CONFIG.brand}:
${factList}

COMPETITORS to watch for: ${CONFIG.competitors.join(', ')}

Return JSON with exactly these keys:
{
  "status": "cited" | "mentioned" | "absent",
  "position": integer or null,
  "factsCorrect": [array of fact labels the answer stated correctly],
  "factsWrong": [array of {"label": string, "stated": string} for facts the answer got WRONG],
  "competitorsNamed": [array of competitor names appearing in the answer],
  "sentiment": "positive" | "neutral" | "negative" | "n/a",
  "note": "one short sentence on why the brand did or did not appear"
}

Definitions:
- "cited" = the brand is named AND at least one source in the list above backs it up.
- "mentioned" = the brand is named but no source backs it up.
- "absent" = the brand does not appear.
- "position" = if the answer lists multiple properties or firms, the brand's rank in that list (1 = first). Null if not a list or absent.
- factsWrong is the important field. Only include a fact if the answer asserted something that CONTRADICTS the verified value. Omission is not an error.`,
      },
    ],
  });

  const text = (data.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .replace(/```json|```/g, '')
    .trim();

  try {
    return JSON.parse(text);
  } catch {
    // Salvage the first {...} block if the model wrapped it in prose.
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch { /* fall through */ }
    }
    return {
      status: 'absent',
      position: null,
      factsCorrect: [],
      factsWrong: [],
      competitorsNamed: [],
      sentiment: 'n/a',
      note: 'Could not parse grader output.',
    };
  }
}

// ── Local checks that do not need the model ───────────────────
function domainOf(url) {
  try {
    const h = new URL(url).hostname.toLowerCase();
    return h.startsWith('www.') ? h.slice(4) : h;
  } catch {
    return '';
  }
}

function matchesAny(domain, list) {
  return list.some((d) => domain === d || domain.endsWith('.' + d));
}

function voiceCheck(answer) {
  const lower = (answer || '').toLowerCase();
  return {
    preferred: CONFIG.voice.preferred.filter((w) => lower.includes(w)),
    avoid: CONFIG.voice.avoid.filter((w) => lower.includes(w)),
  };
}

// ── Run the whole prompt library ──────────────────────────────
async function runAll(apiKey, prompts, onProgress) {
  const results = [];

  for (let i = 0; i < prompts.length; i++) {
    const p = prompts[i];
    if (onProgress) onProgress(i + 1, prompts.length, p.text);

    try {
      const { answer, sources } = await askQuestion(apiKey, p.text);
      const analysis = await analyzeAnswer(apiKey, p.text, answer, sources);

      const domains = [...new Set(sources.map((s) => domainOf(s.url)).filter(Boolean))];

      results.push({
        prompt: p.text,
        cluster: p.cluster,
        priority: p.priority,
        answer,
        sources,
        domains,
        ownedCitation: domains.some((d) => matchesAny(d, CONFIG.ownedDomains)),
        partnerCitation: domains.some((d) => matchesAny(d, CONFIG.partnerDomains)),
        voice: voiceCheck(answer),
        ...analysis,
        error: null,
      });
    } catch (err) {
      results.push({
        prompt: p.text,
        cluster: p.cluster,
        priority: p.priority,
        answer: '',
        sources: [],
        domains: [],
        ownedCitation: false,
        partnerCitation: false,
        voice: { preferred: [], avoid: [] },
        status: 'absent',
        position: null,
        factsCorrect: [],
        factsWrong: [],
        competitorsNamed: [],
        sentiment: 'n/a',
        note: '',
        error: String(err.message || err),
      });
      console.error(`  ! ${String(err.message || err).slice(0, 140)}`);
    }

    if (i < prompts.length - 1) await sleep(CONFIG.delayMs);
  }

  return results;
}

// ── Roll up into the numbers that go at the top of the report ──
function summarize(results) {
  const live = results.filter((r) => !r.error);
  const n = live.length || 1;

  const cited = live.filter((r) => r.status === 'cited').length;
  const mentioned = live.filter((r) => r.status === 'mentioned').length;

  const competitorCounts = {};
  for (const r of live) {
    for (const c of r.competitorsNamed || []) {
      competitorCounts[c] = (competitorCounts[c] || 0) + 1;
    }
  }

  const domainCounts = {};
  for (const r of live) {
    for (const d of r.domains) domainCounts[d] = (domainCounts[d] || 0) + 1;
  }

  const factErrors = {};
  for (const r of live) {
    for (const f of r.factsWrong || []) {
      const key = f.label || String(f);
      if (!factErrors[key]) factErrors[key] = { count: 0, examples: [] };
      factErrors[key].count += 1;
      if (
        f.stated &&
        factErrors[key].examples.length < 3 &&
        !factErrors[key].examples.includes(f.stated)
      ) {
        factErrors[key].examples.push(f.stated);
      }
    }
  }

  const byCluster = {};
  for (const r of live) {
    const b = (byCluster[r.cluster] ||= { total: 0, cited: 0, visible: 0 });
    b.total += 1;
    if (r.status === 'cited') b.cited += 1;
    if (r.status !== 'absent') b.visible += 1;
  }
  for (const b of Object.values(byCluster)) {
    b.citationRate = Math.round((100 * b.cited) / b.total);
    b.visibilityRate = Math.round((100 * b.visible) / b.total);
  }

  const brandHits = cited + mentioned;
  const compTotal = Object.values(competitorCounts).reduce((a, b) => a + b, 0);

  return {
    totalPrompts: results.length,
    failed: results.length - live.length,
    cited,
    mentioned,
    absent: live.filter((r) => r.status === 'absent').length,
    citationRate: Math.round((100 * cited) / n),
    visibilityRate: Math.round((100 * brandHits) / n),
    ownedWins: live.filter((r) => r.ownedCitation).length,
    ownedRate: Math.round((100 * live.filter((r) => r.ownedCitation).length) / n),
    partnerRate: Math.round((100 * live.filter((r) => r.partnerCitation).length) / n),
    shareOfVoice:
      brandHits + compTotal > 0
        ? Math.round((100 * brandHits) / (brandHits + compTotal))
        : 0,
    competitorCounts,
    domainCounts: Object.fromEntries(
      Object.entries(domainCounts).sort((a, b) => b[1] - a[1]).slice(0, 15)
    ),
    factErrors,
    factErrorCount: Object.values(factErrors).reduce((a, b) => a + b.count, 0),
    byCluster,
    voiceAvoid: [...new Set(live.flatMap((r) => r.voice.avoid))],
    voicePreferred: [...new Set(live.flatMap((r) => r.voice.preferred))],
  };
}

module.exports = { runAll, summarize };
