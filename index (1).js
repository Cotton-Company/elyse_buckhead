// index.js — entry point.
//
//   node index.js            run the full library, write the report, email it
//   node index.js --no-email run and write the report, skip sending
//   node index.js --limit 3  smoke test against the first three prompts
//   node index.js --dry-run  rebuild the report from the last saved run, no API calls
'use strict';

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const { CONFIG } = require('./config');
const { PROMPTS } = require('./prompts');
const { runAll, summarize } = require('./agent');
const { buildReport } = require('./report');

const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const valueOf = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : null;
};

const LAST_RUN_FILE = 'last-run.json';

function loadHistory() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG.historyFile, 'utf8'));
  } catch {
    return [];
  }
}

function saveHistory(history, summary) {
  const entry = {
    date: new Date().toISOString(),
    citationRate: summary.citationRate,
    visibilityRate: summary.visibilityRate,
    ownedRate: summary.ownedRate,
    shareOfVoice: summary.shareOfVoice,
    factErrorCount: summary.factErrorCount,
    factOutdatedCount: summary.factOutdatedCount,
    cited: summary.cited,
    mentioned: summary.mentioned,
    absent: summary.absent,
    totalPrompts: summary.totalPrompts,
  };
  const next = [...history, entry].slice(-CONFIG.historyMaxRuns);
  fs.writeFileSync(CONFIG.historyFile, JSON.stringify(next, null, 2));
  return entry;
}

async function sendEmail(html, summary) {
  const { from, to } = CONFIG.email;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!from || !to || !pass) {
    console.log('Email skipped: EMAIL_FROM, EMAIL_TO or GMAIL_APP_PASSWORD not set.');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: from, pass },
  });

  const date = new Date().toLocaleDateString('en-US', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  await transporter.sendMail({
    from: `${CONFIG.brand} Reporting <${from}>`,
    to,
    subject: `${CONFIG.email.subjectPrefix} — ${date} — ${summary.citationRate}% citation rate`,
    html,
  });

  console.log(`Emailed to ${to}`);
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  let prompts = PROMPTS;
  const limit = valueOf('--limit');
  if (limit) prompts = prompts.slice(0, Number(limit));

  let results;

  if (has('--dry-run')) {
    if (!fs.existsSync(LAST_RUN_FILE)) {
      console.error(`No ${LAST_RUN_FILE} to rebuild from. Do a real run first.`);
      process.exit(1);
    }
    results = JSON.parse(fs.readFileSync(LAST_RUN_FILE, 'utf8'));
    console.log(`Dry run: rebuilding from ${results.length} saved results.`);
  } else {
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY is not set. Add it to .env or as a GitHub secret.');
      process.exit(1);
    }
    console.log(`${CONFIG.brand} — running ${prompts.length} prompts on ${CONFIG.model}\n`);
    results = await runAll(apiKey, prompts, (i, total, text) => {
      console.log(`[${i}/${total}] ${text.slice(0, 68)}${text.length > 68 ? '...' : ''}`);
    });
    fs.writeFileSync(LAST_RUN_FILE, JSON.stringify(results, null, 2));
  }

  const summary = summarize(results);
  const history = loadHistory();
  const previous = history.length ? history[history.length - 1] : null;

  const html = buildReport(results, summary, previous);

  const stamp = new Date().toISOString().slice(0, 10);
  const reportPath = path.join(process.cwd(), `report-${stamp}.html`);
  fs.writeFileSync(reportPath, html);

  if (!has('--dry-run')) saveHistory(history, summary);

  console.log('\n─────────────────────────────────');
  console.log(`Citation rate   ${summary.citationRate}%  (${summary.cited} of ${summary.totalPrompts})`);
  console.log(`Visibility      ${summary.visibilityRate}%`);
  console.log(`Owned wins      ${summary.ownedRate}%`);
  console.log(`Share of voice  ${summary.shareOfVoice}%`);
  console.log(`Fact errors     ${summary.factErrorCount}`);
  console.log(`Outdated facts  ${summary.factOutdatedCount}`);
  if (summary.failed) console.log(`Failed prompts  ${summary.failed}`);
  console.log('─────────────────────────────────');
  console.log(`\nReport written to ${reportPath}`);

  if (!has('--no-email') && !has('--dry-run')) {
    await sendEmail(html, summary);
  }
}

main().catch((err) => {
  console.error('Run failed:', err);
  process.exit(1);
});
