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
window.addDrug('Codeine');
window.addDrug('Fluoxetine');
window.renderEvidenceExplorer();

const document = window.document;
const countText = document.getElementById('evidenceCount')?.textContent || '';
const notice = document.querySelector('.ev-review-notice');
const ledger = document.getElementById('evidenceLadderLedger');
const cards = [...document.querySelectorAll('#evCardsContainer .ev-explorer-card')];
const pendingCards = cards
  .filter((card) => card.querySelector('.ev-review-badge.needs-review'));

assert(browserErrors.length === 0, `Evidence UI emitted browser errors: ${browserErrors.join('; ')}`);
assert(/all pending professional review/i.test(countText), `Evidence count must present one pending-review trust status, got "${countText}"`);
assert(notice, 'Evidence explorer must render the panel-level professional-review notice');
assert(/no entry below has been reviewed by a licensed pharmacist or physician/i.test(notice.textContent || ''), 'Evidence review notice lost professional-review wording');
assert(ledger, 'Evidence explorer must render the evidence ladder ledger');
assert(/pending review/i.test(ledger.textContent || ''), 'Evidence ladder ledger must expose pending-review status');
assert(/Evidence Browser \/ Evidence Ledger/i.test(ledger.textContent || ''), 'Evidence ladder ledger title is missing');
assert(cards.length > 0, 'Expected representative stack to expose evidence cards');
assert(pendingCards.length === cards.length, `Expected every evidence card to show pending professional review, found ${pendingCards.length}/${cards.length}`);
assert(!document.querySelector('.ev-review-toggle'), 'Collapsed review-queue toggle should not return');
assert(!document.querySelector('#evReviewCards'), 'Hidden review-queue container should not return');
assert(!/show review queue/i.test(document.getElementById('evidenceBody')?.textContent || ''), 'Evidence explorer should not hide pending evidence behind a review queue');

console.log(`Evidence review UI audit passed: ${pendingCards.length} evidence cards all pending professional review.`);
