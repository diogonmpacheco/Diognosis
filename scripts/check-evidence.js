#!/usr/bin/env node
import { readFileSync } from 'fs';
import { resolve } from 'path';
import vm from 'vm';

const root = resolve(new URL('..', import.meta.url).pathname);
const files = [
  'src/data/constants.js',
  'src/data/evidence.js',
];
const code = `${files.map((file) => readFileSync(resolve(root, file), 'utf8')).join('\n')}
JSON.stringify(Object.values(STUDY_DB).filter((study) =>
  study.type !== EVIDENCE_TIER.FDA_LABEL &&
  study.type !== EVIDENCE_TIER.GUIDELINE &&
  !study.pmid &&
  !study.doi
).map((study) => ({
  id: study.id,
  type: study.type,
  title: study.title
})))`;

const missing = JSON.parse(vm.runInNewContext(code, { console }));
if (missing.length) {
  console.error('Non-regulatory evidence entries missing PMID/DOI:');
  for (const study of missing) {
    console.error(`- ${study.id} (${study.type}): ${study.title}`);
  }
  process.exit(1);
}

console.log('Evidence citation check passed.');
