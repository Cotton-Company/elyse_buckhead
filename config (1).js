// config.js — everything client-specific lives here.
// To re-point this agent at another property, change ONLY this file and prompts.js.
'use strict';

const CONFIG = {
  // ── Brand being measured ────────────────────────────────────
  brand: process.env.BRAND_NAME || 'Elyse Buckhead',
  brandDomain: process.env.BRAND_DOMAIN || 'elysebuckhead.com',

  // Alternate spellings that still count as a brand mention.
  aliases: [
    'Elyse Buckhead',
    'Elyse at Buckhead',
    '102 West Paces',
    '102 W Paces Ferry',
  ],

  // Domains the client controls. A citation here is the strongest outcome —
  // the engine is quoting your own material rather than an aggregator.
  ownedDomains: ['elysebuckhead.com', 'kolterurban.com', 'elysepresentation.com'],

  // Credible third parties carrying the narrative. Second-best outcome.
  partnerDomains: ['atlantafinehomes.com', 'sothebysrealty.com', 'rjtr.com'],

  // ── Competitors tracked for share of voice ──────────────────
  competitors: [
    process.env.COMPETITOR_1 || 'Veridian Buckhead',
    process.env.COMPETITOR_2 || 'The Dillon',
    process.env.COMPETITOR_3 || 'Graydon Buckhead',
    process.env.COMPETITOR_4 || 'The Charles',
  ].filter(Boolean),

  // ── Ground truth ────────────────────────────────────────────
  // `value`      — what is true today.
  // `superseded` — values that were accurate when published and are still
  //                circulating. These are graded as OUTDATED, not wrong.
  //                The remedy is publishing current material, not corrections.
  // `note`       — context the grader needs to avoid false positives.
  //
  // Last reviewed: August 2026.
  facts: [
    {
      label: 'Residences',
      value: '194',
      note: 'Consistent since launch. Any other figure is a genuine error.',
    },
    {
      label: 'Stories',
      value: '20',
    },
    {
      label: 'Starting price',
      value: '$1,099,000',
      superseded: [
        'mid-$900,000s (launch pricing, Sept 2025 press release)',
        'just below $1 million',
        'from $1 million (rounded, currently on elysebuckhead.com)',
      ],
      note:
        'Pre-construction pricing has risen since the September 2025 launch. ' +
        'The mid-$900,000s figure was accurate on its publication date.',
    },
    {
      label: 'Top-end price',
      value: '$6,799,000',
      superseded: ['approximately $6.5 million'],
    },
    {
      label: 'Square footage',
      value: '1,436 to 4,032 sq ft',
      superseded: ['1,200 to just over 4,000 sq ft (launch press release)'],
    },
    {
      label: 'Architect',
      value: 'Rule Joy Trammell + Rubio (RJTR)',
    },
    {
      label: 'Interior design (amenities)',
      value: 'CID Design Group',
    },
    {
      label: 'General contractor',
      value: 'Integra Construction',
    },
    {
      label: 'Development manager',
      value: 'Kolter Urban',
      note:
        'Kolter Urban is the development manager. Press commonly writes ' +
        '"developer" — that is not an error, only off-voice.',
    },
    {
      label: 'Sales representation',
      value: "Atlanta Fine Homes Sotheby's International Realty",
    },
    {
      label: 'Amenity space',
      value: '63,000 sq ft',
    },
    {
      label: 'Project address',
      value: '102 W Paces Ferry Road NW, Atlanta, GA 30305',
      note:
        'The TOWER is at 102 W Paces Ferry Road NW. Do not confuse with the ' +
        'sales gallery at 107. Skyrises.com incorrectly lists 102 EAST Paces ' +
        'Ferry — East instead of West is a genuine third-party error.',
    },
    {
      label: 'Sales gallery address',
      value: '107 W Paces Ferry Road NW, Suite 200, Atlanta, GA 30305',
      note:
        'Separate from the project address. An answer naming 107 as the ' +
        'GALLERY is correct. Only flag if 107 is given as the tower address.',
    },
    {
      label: 'Delivery',
      value: 'Q4 2028',
      superseded: ['late 2028 / early 2029 (Kolter\'s own stated range at launch)'],
      note:
        'Kolter publicly stated late 2028 / early 2029 at launch. An answer ' +
        'giving that range is outdated, not wrong.',
    },
    {
      label: 'Groundbreaking',
      value: 'Occurred April 2026',
      superseded: ['planned for Q2 2026', 'set to break ground in 2026'],
      note:
        'Groundbreaking has HAPPENED. April 2026 falls inside the originally ' +
        'announced Q2 2026 window, so both statements are correct. Only flag ' +
        'answers claiming it has not yet broken ground.',
    },
    {
      label: 'Adjacency',
      value: 'Directly adjacent to the St. Regis Atlanta',
    },
    {
      label: 'Sales phone',
      value: '404.777.6259',
    },
  ],

  // ── Brand voice, per the creative brief ─────────────────────
  // Tracks whether the engines describe the property in the language the
  // brief wants, or reach for words it explicitly avoids.
  voice: {
    preferred: ['timeless', 'refined', 'thoughtfully designed', 'quietly elevated',
                'composed', 'effortless', 'walkable', 'enduring', 'livable'],
    avoid: ['developer', 'exclusive', 'opulent', 'lavish', 'iconic',
            'world-class', 'unrivaled', 'ultra-luxury'],
  },

  // ── Model + pacing ──────────────────────────────────────────
  // claude-haiku-4-5-20251001 is the cost-efficient default.
  // Swap to claude-sonnet-5 for deeper answers at higher cost.
  model: process.env.MODEL || 'claude-haiku-4-5-20251001',
  delayMs: Number(process.env.DELAY_MS || 5000), // pause between prompts
  maxTokens: 1500,

  // ── Report branding (Elyse Buckhead palette) ────────────────
  palette: {
    darkGreen: '#2C352A',
    green: '#4A5A46',
    moss: '#7C8A6B',
    tan: '#D9CDB6',
    cream: '#F6F2E9',
    foil: '#B08D57',
    ink: '#1F2420',
    slate: '#6E7268',
    hairline: '#E5E0D4',
    positive: '#4A5A46',
    negative: '#9A4A3C',
  },

  reportTitle: 'Weekly AI Citation Report',

  // ── Email ───────────────────────────────────────────────────
  email: {
    from: process.env.EMAIL_FROM,
    to: process.env.EMAIL_TO,
    // Comma-separated list is supported in EMAIL_TO, e.g. "a@x.com,b@y.com"
    subjectPrefix: 'Elyse Buckhead — AI Citation Report',
  },

  // ── History ─────────────────────────────────────────────────
  historyFile: 'history.json',
  historyMaxRuns: 52,
};

module.exports = { CONFIG };
