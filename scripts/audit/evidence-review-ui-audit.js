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
const ledger = document.getElementById('evidenceLadderLedger');
const cards = [...document.querySelectorAll('#evCardsContainer .ev-explorer-card')];
const reviewNeededCards = cards
  .filter((card) => card.querySelector('.ev-review-badge.needs-review'));
const findingCards = [...document.querySelectorAll('#findingBody .finding-card')];
const primaryFindingCards = [...document.querySelectorAll('#findingBody .primary-finding-card')];

assert(browserErrors.length === 0, `Evidence UI emitted browser errors: ${browserErrors.join('; ')}`);
assert(/clinical review needed/i.test(countText), `Evidence count must present one compact review-needed trust status, got "${countText}"`);
assert(notice, 'Evidence explorer must render the panel-level clinical-review notice');
assert(/source entries are linked for traceability and still need clinical review/i.test(notice.textContent || ''), 'Evidence review notice lost compact clinical-review wording');
assert(ledger, 'Evidence explorer must render the evidence ladder ledger');
assert(/review needed/i.test(ledger.textContent || ''), 'Evidence ladder ledger must expose compact review-needed status');
assert(/Evidence Browser \/ Evidence Ledger/i.test(ledger.textContent || ''), 'Evidence ladder ledger title is missing');
assert(cards.length > 0, 'Expected representative stack to expose evidence cards');
assert(reviewNeededCards.length === cards.length, `Expected every evidence card to show review-needed state, found ${reviewNeededCards.length}/${cards.length}`);
assert(findingCards.length > 0, 'Expected representative stack to expose normalized finding cards');
assert(primaryFindingCards.length > 0, 'Expected Overview to expose primary finding cards');
assert(primaryFindingCards.every((card) => ['What changed', 'Why it matters', 'What to review', 'Evidence'].every((label) => card.textContent.includes(label))), 'Primary finding cards must expose the four-part public explanation');
assert(!/pending professional review/i.test(document.getElementById('evidenceBody')?.textContent || ''), 'Evidence explorer should not repeat pending-professional-review copy');
assert(!document.querySelector('.ev-review-toggle'), 'Collapsed review-queue toggle should not return');
assert(!document.querySelector('#evReviewCards'), 'Hidden review-queue container should not return');
assert(!/show review queue/i.test(document.getElementById('evidenceBody')?.textContent || ''), 'Evidence explorer should not hide pending evidence behind a review queue');

console.log(`Evidence review UI audit passed: ${reviewNeededCards.length} evidence cards use compact review-needed labels.`);
