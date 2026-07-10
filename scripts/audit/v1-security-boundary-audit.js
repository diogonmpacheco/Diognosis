#!/usr/bin/env node
import { readFileSync } from 'fs';
import { JSDOM, VirtualConsole } from 'jsdom';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const html = readFileSync('index.html', 'utf8');
const template = readFileSync('src/index.template.html', 'utf8');
const uiSource = [
  template,
  readFileSync('src/main.js', 'utf8'),
  ...[
    'renderCore.js', 'renderEvidence.js', 'renderWhyPath.js', 'renderAlternatives.js',
    'renderReview.js', 'renderGenotype.js', 'renderInteractions.js',
  ].map(file => readFileSync(`src/ui/${file}`, 'utf8')),
].join('\n');

assert(!/\son[a-z]+\s*=/i.test(template), 'HTML template must not contain inline event-handler attributes');
assert(!/["'`]\s+on[a-z]+\s*=/i.test(uiSource), 'UI source must not generate inline event-handler attributes');
assert(!/<[^>]+\son[a-z]+\s*=/i.test(html), 'Built HTML must not contain inline event-handler attributes');

const csp = html.match(/<meta\s+http-equiv=["']Content-Security-Policy["']\s+content=(["'])(.*?)\1/i)?.[2] || '';
assert(csp.includes("script-src-attr 'none'"), 'CSP must block inline script attributes');
assert(/script-src\s+'sha256-[A-Za-z0-9+/=]+'/.test(csp), 'CSP must authorize inline scripts by hash');
assert(!/script-src[^;]*'unsafe-inline'/.test(csp), 'CSP script-src must not allow unsafe-inline');
assert(csp.includes("connect-src 'none'"), 'CSP must block runtime network connections');

for (const file of ['index.html', 'medication-classes.html', 'medication-class-examples.html', 'data-views.html']) {
  const source = readFileSync(file, 'utf8');
  assert(
    !/href=["'][^"']*index\.html\?[^"']*(?:substances|drugs|medications|genotype)=/i.test(source),
    `${file} must not place medication or genotype state in an HTTP query string`
  );
}

async function loadPage(url) {
  const browserErrors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => browserErrors.push(error?.message || String(error)));
  virtualConsole.on('error', message => browserErrors.push(String(message)));
  const dom = new JSDOM(html, {
    runScripts:'dangerously',
    resources:'usable',
    pretendToBeVisual:true,
    virtualConsole,
    url,
  });
  await new Promise(resolve => setTimeout(resolve, 350));
  assert(browserErrors.length === 0, `Security page emitted browser errors: ${browserErrors.join('; ')}`);
  return dom.window;
}

const injection = encodeURIComponent('X" onmouseover="alert(1)" data-x="');
const injectedWindow = await loadPage(`http://localhost/index.html#substances=${injection}&tab=overview`);
assert(!injectedWindow.document.querySelector('[onmouseover], [onclick], [onerror]'), 'Shared state created an executable event attribute');
assert(!injectedWindow.eval('activeStack.join("|")').includes('"'), 'Unrecognized shared-state value retained attribute-breaking quotes');
injectedWindow.eval(`onSearch('X" onmouseover="alert(1)" data-x="')`);
assert(!injectedWindow.document.querySelector('#searchResults [onmouseover], #searchResults [onclick], #searchResults [onerror]'),
  'Search result rendering created an executable event attribute');

const queryWindow = await loadPage('http://localhost/index.html?substances=warfarin&genotype=CYP2C9:PM');
assert(queryWindow.eval('activeStack.length') === 0, 'Sensitive query-string selection state must be rejected');
assert(!/[?&](?:substances|drugs|medications|genotype)=/i.test(queryWindow.location.search),
  'Sensitive query-string state must be removed from the address after detection');

const malformedWindow = await loadPage('http://localhost/index.html#substances=%E0%A4%A&genotype=%ZZ');
assert(malformedWindow.eval('activeStack.length') === 0, 'Malformed shared state must fail closed');

const oversized = Array.from({ length:40 }, (_, index) => `unknown-${index}`).join(',');
const boundedWindow = await loadPage(`http://localhost/index.html#substances=${oversized}`);
assert(boundedWindow.eval('activeStack.length') <= boundedWindow.eval('INPUT_LIMITS.selectedSubstances'),
  'Shared medication state must enforce the selection limit');

console.log('V1 security boundary audit passed: CSP hashes, event delegation, fragment-only sensitive state, hostile-input handling, and input bounds verified.');
