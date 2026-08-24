// prompts.js — Elyse Buckhead weekly citation prompt library.
// 25 prompts across 5 clusters. Edit freely; the report groups by `cluster`.
// priority: 1 = core tracking prompt, 2 = secondary/expansion prompt.
'use strict';

const PROMPTS = [
  // ── Buckhead discovery ──────────────────────────────────────
  // Unbranded, high-intent. The buyer has not heard the name yet.
  // These are the hardest to win and the most valuable.
  {
    text: 'What are the best new luxury condo developments in Buckhead, Atlanta?',
    cluster: 'Buckhead discovery',
    priority: 1,
  },
  {
    text: 'What new construction condominiums in Buckhead Atlanta are selling pre-construction right now?',
    cluster: 'Buckhead discovery',
    priority: 1,
  },
  {
    text: 'What is being built next to the St. Regis Atlanta on West Paces Ferry Road?',
    cluster: 'Buckhead discovery',
    priority: 1,
  },
  {
    text: 'What new high-rise residential towers are coming to Atlanta in 2028?',
    cluster: 'Buckhead discovery',
    priority: 2,
  },
  {
    text: 'Which new Atlanta residential towers were designed by Rule Joy Trammell + Rubio?',
    cluster: 'Buckhead discovery',
    priority: 2,
  },

  // ── Buyer intent ────────────────────────────────────────────
  // The audience profile from the brief, phrased the way they would ask.
  {
    text: 'We are empty nesters selling our house in Atlanta and want a lock-and-leave high-rise in Buckhead. What should we look at?',
    cluster: 'Buyer intent',
    priority: 1,
  },
  {
    text: 'What new condos in Atlanta are priced between $1 million and $6 million?',
    cluster: 'Buyer intent',
    priority: 1,
  },
  {
    text: 'Which Atlanta condo buildings have the best amenities — spa, resort pool, pickleball, guest suites?',
    cluster: 'Buyer intent',
    priority: 1,
  },
  {
    text: 'Best walkable Atlanta neighborhoods for a luxury pied-a-terre with easy access to PDK airport',
    cluster: 'Buyer intent',
    priority: 2,
  },
  {
    text: 'Where should I buy a condo in Atlanta if I want to be near private schools like Westminster and Pace Academy?',
    cluster: 'Buyer intent',
    priority: 2,
  },

  // ── Competitive ─────────────────────────────────────────────
  {
    text: 'Compare Elyse Buckhead and Veridian Buckhead. Which is the better purchase?',
    cluster: 'Competitive',
    priority: 1,
  },
  {
    text: 'Should I buy new at Elyse Buckhead or a resale unit at The Dillon or Graydon Buckhead?',
    cluster: 'Competitive',
    priority: 1,
  },
  {
    text: 'Who is Kolter Urban and what is their track record with condominium developments in the Southeast?',
    cluster: 'Competitive',
    priority: 1,
  },
  {
    text: 'What is the price per square foot for new construction condos in Buckhead compared to Midtown Atlanta?',
    cluster: 'Competitive',
    priority: 2,
  },
  {
    text: 'Which Buckhead condominium offers the most amenity square footage?',
    cluster: 'Competitive',
    priority: 2,
  },

  // ── Branded ─────────────────────────────────────────────────
  // The brand should win these outright. Anything below full marks here
  // is a technical retrievability problem, not a messaging one.
  {
    text: 'Tell me about Elyse Buckhead.',
    cluster: 'Branded',
    priority: 1,
  },
  {
    text: 'What are prices and floor plans at Elyse Buckhead in Atlanta?',
    cluster: 'Branded',
    priority: 1,
  },
  {
    text: 'What amenities does Elyse Buckhead offer?',
    cluster: 'Branded',
    priority: 1,
  },
  {
    text: 'When will Elyse Buckhead be completed and when is groundbreaking?',
    cluster: 'Branded',
    priority: 1,
  },
  {
    text: 'Who is the architect, interior designer, and builder for Elyse Buckhead?',
    cluster: 'Branded',
    priority: 2,
  },
  {
    text: 'How do I contact the sales gallery for Elyse Buckhead and where is it located?',
    cluster: 'Branded',
    priority: 2,
  },

  // ── Objections ──────────────────────────────────────────────
  // Straight from the Barriers / Objections section of the brief.
  {
    text: 'Is it risky to buy a pre-construction condo in Atlanta that does not deliver until 2028?',
    cluster: 'Objections',
    priority: 1,
  },
  {
    text: 'Are Buckhead condo values holding up, or should I wait for prices to drop?',
    cluster: 'Objections',
    priority: 1,
  },
  {
    text: 'What are the downsides or complaints about Kolter Urban condominium buildings?',
    cluster: 'Objections',
    priority: 2,
  },
  {
    text: 'How much do HOA fees typically run in new Buckhead luxury high-rises?',
    cluster: 'Objections',
    priority: 2,
  },
];

module.exports = { PROMPTS };
