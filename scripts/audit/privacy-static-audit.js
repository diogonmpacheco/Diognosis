#!/usr/bin/env node
import { readFileSync } from 'fs';
import { resolve } from 'path';

const target = resolve(process.argv[2] || 'index.html');
const html = readFileSync(target, 'utf8');

function attr(tag, name) {
  const quoted = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'));
  if (quoted) return quoted[2];
  const bare = tag.match(new RegExp(`\\b${name}\\s*=\\s*([^\\s>]+)`, 'i'));
  return bare ? bare[1] : '';
}

function isExternalUrl(value) {
  return /^https?:\/\//i.test(String(value || ''));
}

function isCanonicalLink(tag) {
  const rel = attr(tag, 'rel').toLowerCase().split(/\s+/);
  return rel.includes('canonical');
}

function isVendoredD3(content) {
  return content.trimStart().startsWith('// https://d3js.org v7.8.5');
}

function collectMatches(source, checks) {
  const matches = [];
  for (const check of checks) {
    if (check.pattern.test(source)) matches.push(check.label);
  }
  return matches;
}

const findings = [];
const tagPattern = /<(script|iframe|img|source|video|audio|link)\b[^>]*>/gi;
for (const match of html.matchAll(tagPattern)) {
  const tagName = match[1].toLowerCase();
  const tag = match[0];
  const url = attr(tag, tagName === 'link' ? 'href' : 'src');
  if (!url) continue;
  if (tagName === 'link' && isCanonicalLink(tag)) continue;
  if (isExternalUrl(url)) {
    findings.push({
      category: 'external-runtime-resource',
      detail: `${tagName} loads ${url}`,
    });
  }
}

for (const match of html.matchAll(/url\(\s*["']?(https?:\/\/[^"')\s]+)["']?\s*\)/gi)) {
  findings.push({
    category: 'external-css-resource',
    detail: `CSS loads ${match[1]}`,
  });
}

const analyticsChecks = [
  { label: 'Google Analytics', pattern: /google-analytics\.com|googletagmanager\.com|\bgtag\s*\(|\bga\s*\(\s*["'](?:create|send|set|event|config)["']/i },
  { label: 'Plausible', pattern: /plausible\.io/i },
  { label: 'PostHog', pattern: /posthog/i },
  { label: 'Segment', pattern: /segment\.com|analytics\.js/i },
  { label: 'Mixpanel', pattern: /mixpanel/i },
  { label: 'Amplitude', pattern: /amplitude\.com|amplitude\.getInstance/i },
];

for (const label of collectMatches(html, analyticsChecks)) {
  findings.push({ category: 'analytics-or-tracking', detail: label });
}

const openTargetsApiChecks = [
  { label: 'Open Targets platform API host', pattern: /https?:\/\/api\.platform\.opentargets\.org/i },
  { label: 'Open Targets GraphQL/API path', pattern: /https?:\/\/[^"'\s]*opentargets\.org\/[^"'\s]*(graphql|api)/i },
];

for (const label of collectMatches(html, openTargetsApiChecks)) {
  findings.push({ category: 'live-open-targets-request-surface', detail: label });
}

const firstPartyRuntimeChecks = [
  { label: 'fetch()', pattern: /\bfetch\s*\(/ },
  { label: 'XMLHttpRequest', pattern: /\bXMLHttpRequest\b/ },
  { label: 'navigator.sendBeacon()', pattern: /\bnavigator\.sendBeacon\s*\(/ },
  { label: 'WebSocket()', pattern: /\bWebSocket\s*\(/ },
  { label: 'EventSource()', pattern: /\bEventSource\s*\(/ },
  { label: 'document.cookie', pattern: /\bdocument\.cookie\b/ },
  { label: 'localStorage', pattern: /\blocalStorage\b/ },
  { label: 'sessionStorage', pattern: /\bsessionStorage\b/ },
  { label: 'indexedDB', pattern: /\bindexedDB\b/ },
  { label: 'CacheStorage', pattern: /\bcaches\.open\s*\(/ },
];

const firstPartyPhiLoggingChecks = [
  {
    label: 'console logging of medication/genotype state',
    pattern: /\bconsole\.(?:log|debug|info|warn|error)\s*\([^)]*\b(?:activeStack|activeGenotype|userGenetics|drugDoses|searchInput|genotype|medication|substances)\b/i,
  },
  {
    label: 'runtime request carrying medication/genotype state',
    pattern: /\b(?:fetch|sendBeacon|XMLHttpRequest|WebSocket|EventSource)\b[\s\S]{0,220}\b(?:activeStack|activeGenotype|userGenetics|drugDoses|substances|genotype)\b/i,
  },
];

let vendoredD3Scripts = 0;
let firstPartyScripts = 0;
for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
  const tag = match[0];
  const src = attr(tag, 'src');
  if (src && isExternalUrl(src)) continue;
  const content = match[2] || '';
  if (!content.trim()) continue;
  if (isVendoredD3(content)) {
    vendoredD3Scripts += 1;
    continue;
  }
  firstPartyScripts += 1;
  for (const label of collectMatches(content, firstPartyRuntimeChecks)) {
    findings.push({ category: 'first-party-runtime-surface', detail: label });
  }
  for (const label of collectMatches(content, firstPartyPhiLoggingChecks)) {
    findings.push({ category: 'first-party-phi-logging-surface', detail: label });
  }
}

if (vendoredD3Scripts !== 1) {
  findings.push({
    category: 'vendored-d3',
    detail: `Expected exactly one vendored D3 script, found ${vendoredD3Scripts}`,
  });
}

if (findings.length) {
  console.error(JSON.stringify({
    file: target,
    checkedAt: new Date().toISOString(),
    firstPartyScripts,
    vendoredD3Scripts,
    findings,
  }, null, 2));
  throw new Error(`Privacy/static audit failed with ${findings.length} finding(s).`);
}

console.log(`Privacy/static audit passed: ${firstPartyScripts} app script(s), ${vendoredD3Scripts} vendored D3 script, no external runtime calls or tracking surface.`);
