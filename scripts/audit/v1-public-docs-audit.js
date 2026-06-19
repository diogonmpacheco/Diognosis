#!/usr/bin/env node
import { existsSync, readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { collectStats } from '../collect-stats.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..', '..');
const stats = collectStats();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(path) {
  return readFileSync(resolve(root, path), 'utf8');
}

function assertIncludes(label, text, expected) {
  assert(text.includes(expected), `${label} is missing expected text: ${expected}`);
}

function localMarkdownLinks(markdown) {
  return [...markdown.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)]
    .map(match => match[1].trim())
    .filter(href =>
      href &&
      !href.startsWith('#') &&
      !/^[a-z][a-z0-9+.-]*:/i.test(href)
    )
    .map(href => href.split('#')[0]);
}

const readme = read('README.md');
const publicTrust = read('docs/PUBLIC_TRUST.md');
const launchQa = read('docs/LAUNCH_QA_MATRIX.md');
const launchTrust = read('docs/LAUNCH_DATA_TRUST_AUDIT.md');
const technical = read('docs/TECHNICAL.md');
const pagesWorkflowPath = '.github/workflows/pages.yml';
const pagesWorkflow = existsSync(resolve(root, pagesWorkflowPath)) ? read(pagesWorkflowPath) : '';
const ciWorkflow = read('.github/workflows/ci.yml');
const gitignore = read('.gitignore');
const pkg = JSON.parse(read('package.json'));

const missingLinks = localMarkdownLinks(readme)
  .filter(href => !existsSync(resolve(root, href)));
assert(missingLinks.length === 0, `README has missing local links: ${missingLinks.join(', ')}`);
for (const [label, text] of [
  ['README', readme],
  ['Public Trust', publicTrust],
  ['Technical Notes', technical],
]) {
  assert(!/\bpre-v1\b/i.test(text), `${label} should not describe the active public V1 candidate as pre-v1`);
}

assert(pkg.scripts?.['launch:qa'] === 'node scripts/launch-qa-audit.js', 'package.json should expose npm run launch:qa');
assert(pkg.scripts?.['pages:check'] === 'node scripts/pages-check.js', 'package.json should expose npm run pages:check');
assert(pkg.scripts?.['release:check'] === 'node scripts/release-check.js', 'package.json should expose npm run release:check');
assert(pkg.scripts?.['security:audit'] === 'npm audit --audit-level=low', 'package.json should expose npm run security:audit');
assert(pkg.engines?.node === '>=24', 'package.json should declare the supported Node.js runtime');
assert(/\/index\.html/.test(gitignore), 'Generated root index.html should remain ignored when Pages deploys workflow artifacts');
assert(pagesWorkflow, 'GitHub Pages must use a workflow artifact deploy because generated index.html is ignored');
assert(/npm run pages:check/.test(pagesWorkflow), 'GitHub Pages workflow must run npm run pages:check');
assert(/cancel-in-progress:\s*true/.test(pagesWorkflow), 'GitHub Pages workflow should cancel stale in-progress deploys');
assert(/node-version:\s*["']24["']/.test(pagesWorkflow), 'GitHub Pages workflow should use Node.js 24');
assert(!/node-version:\s*["']20["']/.test(pagesWorkflow), 'GitHub Pages workflow should not use deprecated Node.js 20');
assert(/actions\/checkout@v7/.test(pagesWorkflow), 'GitHub Pages workflow should use the current checkout action major');
assert(/actions\/setup-node@v6/.test(pagesWorkflow), 'GitHub Pages workflow should use the current setup-node action major');
assert(/actions\/configure-pages@v6/.test(pagesWorkflow), 'GitHub Pages workflow should use the current configure-pages action major');
assert(/actions\/upload-pages-artifact@v5/.test(pagesWorkflow), 'GitHub Pages workflow should use the current upload-pages-artifact action major');
assert(/actions\/deploy-pages@v5/.test(pagesWorkflow), 'GitHub Pages workflow should use the current deploy-pages action major');
assert(/npm run security:audit/.test(ciWorkflow), 'CI workflow must run dependency security audit');
assert(/node-version:\s*["']24["']/.test(ciWorkflow), 'CI workflow should use Node.js 24');
assert(!/node-version:\s*["']20["']/.test(ciWorkflow), 'CI workflow should not use deprecated Node.js 20');
assert(/actions\/checkout@v7/.test(ciWorkflow), 'CI workflow should use the current checkout action major');
assert(/actions\/setup-node@v6/.test(ciWorkflow), 'CI workflow should use the current setup-node action major');
assert(/Node\.js-24%2B/.test(readme), 'README Node.js badge should advertise the current supported runtime');

assertIncludes('Public Trust', publicTrust, '<!-- PUBLIC_TRUST_STATS_START -->');
assertIncludes('Public Trust', publicTrust, `**${stats.sourceLinkedStudies} \`STUDY_DB\` entries** have public source identifiers.`);
assertIncludes('Public Trust', publicTrust, `**${stats.pendingProfessionalReviewStudies} entries** are pending professional review.`);
assertIncludes('Public Trust', publicTrust, `**${stats.professionalReviewedStudies} entries** are professionally reviewed.`);
assertIncludes('Public Trust', publicTrust, `**${stats.internalReviewRequiredEntries} entries** are currently marked \`reviewRequired:true\``);
assert(/not medical advice|not a clinical decision support system|does not replace a licensed clinician or pharmacist/i.test(publicTrust),
  'Public Trust must preserve medical-boundary wording');
assert(/privacy-preserving GitHub issue drafts/i.test(publicTrust) && /do not include the current medication list, genotype settings, share URL, browser URL/i.test(publicTrust),
  'Public Trust must preserve feedback-link privacy wording');

assertIncludes('Launch Data Trust Audit', launchTrust, '<!-- LAUNCH_DATA_TRUST_STATS_START -->');
assertIncludes('Launch Data Trust Audit', launchTrust, `| Drugs in \`DRUG_DB\` | ${stats.drugs} |`);
assertIncludes('Launch Data Trust Audit', launchTrust, `| Evidence entries in \`STUDY_DB\` | ${stats.studies} |`);
assertIncludes('Launch Data Trust Audit', launchTrust, `| Source-linked evidence entries | ${stats.sourceLinkedStudies} |`);
assertIncludes('Launch Data Trust Audit', launchTrust, `| Pending professional review entries | ${stats.pendingProfessionalReviewStudies} |`);
assertIncludes('Launch Data Trust Audit', launchTrust, `| Professional-reviewed evidence entries | ${stats.professionalReviewedStudies} |`);
assertIncludes('Launch Data Trust Audit', launchTrust, `| Internal \`reviewRequired:true\` evidence entries | ${stats.internalReviewRequiredEntries} |`);
assertIncludes('Launch Data Trust Audit', launchTrust, `| RxNorm identity mappings | ${stats.externalSubstanceMappings} |`);
assertIncludes('Launch Data Trust Audit', launchTrust, `| PGx marker rows | ${stats.pgxMarkerRows} |`);
assertIncludes('Launch Data Trust Audit', launchTrust, `| CPIC-linked action summaries | ${stats.pgxActionSummaries} |`);
assertIncludes('Launch Data Trust Audit', launchTrust, `| Interaction pairs | ${stats.ddiPairs} |`);
assert(/source-linked does not mean professionally reviewed/i.test(launchTrust),
  'Launch Data Trust Audit must preserve source-linked/professional-review boundary');
assert(/no accounts, analytics, tracking, medication-data collection, or runtime clinical API calls/i.test(launchTrust),
  'Launch Data Trust Audit must preserve static privacy boundary');

assert(/npm run launch:qa/.test(launchQa), 'Launch QA Matrix must document npm run launch:qa');
assert(/npm run pages:check/.test(launchQa), 'Launch QA Matrix must document npm run pages:check');
assert(/V1 PGx contract audit|V1 PK visualization audit|V1 finding contract audit|V1 release readiness audit/i.test(launchQa),
  'Launch QA Matrix must reference the V1 release gates');
assert(/npm run pages:check/i.test(launchTrust) && /GitHub Pages deploy gate/i.test(launchTrust),
  'Launch Data Trust Audit must document the Pages deploy gate');
assert(/V1 PGx contract audit/i.test(launchTrust),
  'Launch Data Trust Audit must reference the V1 PGx contract gate');
assert(/V1 PK visualization audit/i.test(launchTrust),
  'Launch Data Trust Audit must reference the V1 PK visualization gate');
assert(/Patient mode|Clinician|patient\/clinician/i.test(launchQa),
  'Launch QA Matrix must cover audience-mode behavior');
assert(/npm run pages:check/i.test(publicTrust) && /npm run release:check/i.test(publicTrust),
  'Public Trust must document both deploy and release gates');
assert(/npm run pages:check/i.test(technical) && /GitHub Pages deploy gate/i.test(technical),
  'Technical docs must document the Pages deploy gate');

if (stats.studies !== 456) {
  for (const [label, text] of [
    ['Public Trust', publicTrust],
    ['Launch Data Trust Audit', launchTrust],
    ['Launch QA Matrix', launchQa],
  ]) {
    assert(!/\b456\b/.test(text), `${label} still contains stale 456-count launch data`);
  }
}

console.log('V1 public docs audit passed: launch docs, public trust stats, package scripts, and README links are current.');
