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
  if (!msg.includes('Could not load script: "https://cdnjs.cloudflare.com/ajax/libs/d3/')) {
    browserErrors.push(msg);
  }
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
const pendingMatch = countText.match(/(\d+)\s+pending review/);
const pendingCount = pendingMatch ? Number(pendingMatch[1]) : 0;
const notice = document.querySelector('.ev-review-notice');
const pendingCards = [...document.querySelectorAll('#evCardsContainer .ev-explorer-card')]
  .filter((card) => card.querySelector('.ev-review-badge.needs-review'));
const sourceLinkedCards = [...document.querySelectorAll('#evCardsContainer .ev-explorer-card')]
  .filter((card) => card.querySelector('.ev-review-badge.source-linked'));

assert(browserErrors.length === 0, `Evidence UI emitted browser errors: ${browserErrors.join('; ')}`);
assert(pendingCount > 0, `Expected representative stack to expose pending review evidence, got count "${countText}"`);
assert(notice, 'Evidence explorer must render the panel-level professional-review notice');
assert(/no entry below has been reviewed by a licensed pharmacist or physician/i.test(notice.textContent || ''), 'Evidence review notice lost professional-review wording');
assert(pendingCards.length === pendingCount, `Expected ${pendingCount} pending review cards with needs-review badges, found ${pendingCards.length}`);
assert(sourceLinkedCards.length > 0, 'Expected representative stack to keep source-linked cards inline before pending review cards');
assert(!document.querySelector('.ev-review-toggle'), 'Collapsed review-queue toggle should not return');
assert(!document.querySelector('#evReviewCards'), 'Hidden review-queue container should not return');
assert(!/show review queue/i.test(document.getElementById('evidenceBody')?.textContent || ''), 'Evidence explorer should not hide pending evidence behind a review queue');

console.log(`Evidence review UI audit passed: ${sourceLinkedCards.length} source-linked, ${pendingCards.length} pending review cards.`);
