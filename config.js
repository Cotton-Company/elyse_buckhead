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

  // ── Ground truth from the creative brief ────────────────────
  // The agent checks every answer against these. A wrong number stated
  // confidently is worse than an omission — it means bad data is circulating.
  facts: [
    { label: 'Residences', value: '194' },
    { label: 'Stories', value: '20' },
    { label: 'Price range', value: '$1,099,000 to $6,799,000' },
    { label: 'Square footage', value: '1,436 to 4,032 sq ft' },
    { label: 'Architect', value: 'Rule Joy Trammell + Rubio (RJTR)' },
    { label: 'Interior design (amenities)', value: 'CID Design Group' },
    { label: 'General contractor', value: 'Integra Construction' },
    { label: 'Development manager', value: 'Kolter Urban' },
    { label: 'Sales representation', value: "Atlanta Fine Homes Sotheby's International Realty" },
    { label: 'Amenity space', value: '63,000 sq ft' },
    { label: 'Address', value: '102 W Paces Ferry Road NW, Atlanta, GA 30305' },
    { label: 'Delivery', value: 'Q4 2028' },
    { label: 'Groundbreaking', value: 'Q2 2026' },
    { label: 'Adjacency', value: 'Directly adjacent to the St. Regis Atlanta' },
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
