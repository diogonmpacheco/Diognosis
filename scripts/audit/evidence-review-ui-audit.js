#!/usr/bin/env node
import { readFileSync } from 'fs';
import { JSDOM, VirtualConsole } from 'jsdom';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const html = readFileSync('index.html', 'utf8');
const browserErrors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', (err) => {
  const msg = err && err.message ? err.message : String(err);
  browserErrors.push(msg);
});
virtualConsole.on('error', (msg) => browserErrors.push(String(msg)));

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  resources: 'usable',
  pretendToBeVisual: true,
  virtualConsole,
  url: 'http://localhost/',
});

await new Promise((resolveReady) => setTimeout(resolveReady, 400));

const { window } = dom;
window.setAudienceMode('clinician', { render:false });
window.addDrug('Codeine');
window.addDrug('Fluoxetine');
window.renderAll();
window.renderEvidenceExplorer();

const document = window.document;
const countText = document.getElementById('evidenceCount')?.textContent || '';
const notice = document.querySelector('.ev-review-notice');
const atGlance = document.querySelector('.evidence-at-glance');
const ledger = document.getElementById('evidenceLadderLedger');
const cards = [...document.querySelectorAll('#evCardsContainer .ev-explorer-card')];
const additionalCards = [...document.querySelectorAll('#evAdditionalCardsContainer .ev-explorer-card')];
const provenanceCards = cards
  .filter((card) => card.querySelector('.ev-review-badge'));
const findingCards = [...document.querySelectorAll('#findingBody .finding-card')];
const primaryFindingCards = [...document.querySelectorAll('#findingBody .primary-finding-card')];

assert(browserErrors.length === 0, `Evidence UI emitted browser errors: ${browserErrors.join('; ')}`);
assert(/authority/i.test(countText) && /primary-literature/i.test(countText) && !/professional sign-off/i.test(countText), `Evidence count must present provenance categories without sign-off backlog wording, got "${countText}"`);
assert(notice, 'Evidence explorer must render the panel-level provenance notice');
assert(/Authority-linked means/i.test(notice.textContent || '') && /Primary-literature linked means/i.test(notice.textContent || '') && /no independent professional sign-off/i.test(notice.textContent || ''), 'Evidence notice lost authority/literature/sign-off boundary wording');
assert(atGlance, 'Evidence explorer must render the source-strength at-a-glance strip');
assert(/Evidence at a glance/i.test(atGlance.textContent || '') && /authority source/i.test(atGlance.textContent || '') && /linked finding/i.test(atGlance.textContent || ''), 'Evidence at-a-glance strip must summarize authority sources and linked findings');
assert(ledger, 'Evidence explorer must render the evidence ladder ledger');
assert(/authority-linked findings/i.test(ledger.textContent || '') && /modeled findings/i.test(ledger.textContent || ''), 'Evidence ladder ledger must expose authority-linked and modeled boundaries');
assert(/Evidence Browser \/ Evidence Ledger/i.test(ledger.textContent || ''), 'Evidence ladder ledger title is missing');
assert(cards.length > 0, 'Expected representative stack to expose evidence cards');
assert(additionalCards.length === 0, 'Standard Evidence tab should not render the broad stack-matched source browser by default');
assert(/Additional matching sources/i.test(document.getElementById('evidenceBody')?.textContent || ''), 'Standard Evidence tab should disclose additional stack-matched source count');
assert(provenanceCards.length === cards.length, `Expected every evidence card to show a provenance badge, found ${provenanceCards.length}/${cards.length}`);
assert(findingCards.length > 0, 'Expected representative stack to expose normalized finding cards');
assert(primaryFindingCards.length > 0, 'Expected Overview to expose primary finding cards');
assert(primaryFindingCards.every((card) => card.querySelectorAll('.finding-note').length >= 2 && !/What changed|Why it matters|Review focus|What to review/i.test(card.textContent || '')), 'Primary finding cards must expose compact unlabeled Overview notes and route source detail to Evidence');
assert(!/pending professional review/i.test(document.getElementById('evidenceBody')?.textContent || ''), 'Evidence explorer should not repeat pending-professional-review copy');
assert(!/pending\s+[\w/-]+(?:\s+[\w/-]+){0,4}\s+review/i.test(document.getElementById('evidenceBody')?.textContent || ''), 'Evidence explorer should not expose human-review queue wording');
assert(!document.querySelector('.ev-review-toggle'), 'Collapsed review-queue toggle should not return');
assert(!document.querySelector('#evReviewCards'), 'Hidden review-queue container should not return');
assert(!/show review queue/i.test(document.getElementById('evidenceBody')?.textContent || ''), 'Evidence explorer should not hide pending evidence behind a review queue');

console.log(`Evidence review UI audit passed: ${provenanceCards.length} evidence cards expose authority/literature provenance labels.`);
