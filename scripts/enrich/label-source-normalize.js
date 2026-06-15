#!/usr/bin/env node
import { resolve } from 'path';
import { ROOT } from './lib/medcheck-source-loader.js';
import { writeJson, writeText } from './lib/enrichment-common.js';

const DEFAULT_OUT = resolve(ROOT, 'data/enrichment/staged/label-staged-records.json');
const DEFAULT_META = resolve(ROOT, 'data/enrichment/snapshots/label-source-snapshot-metadata.json');
const OUT_AUDIT = resolve(ROOT, 'docs/audits/label-source-coverage-audit.json');
const OUT_MD = resolve(ROOT, 'docs/audits/label-source-coverage-audit.md');

function parseArgs(argv) {
  const args = { out: DEFAULT_OUT, metadata: DEFAULT_META };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--out') args.out = resolve(ROOT, argv[++i]);
    else if (arg.startsWith('--out=')) args.out = resolve(ROOT, arg.slice(6));
    else if (arg === '--metadata') args.metadata = resolve(ROOT, argv[++i]);
    else if (arg.startsWith('--metadata=')) args.metadata = resolve(ROOT, arg.slice(11));
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const records = [];
const metadata = {
  schema: 'diognosis.label-source-snapshot-metadata.v1',
  generatedAt: new Date().toISOString(),
  mode: 'check',
  source: 'FDA/DailyMed Labels',
  stagedRecords: records.length,
  fetchedRecords: 0,
  sourceTruthStatus: 'label_source_candidate_not_fetched',
  note: 'Label-source intake lane is initialized for allowlisted public label metadata. No source objects were fetched in check mode.',
};

writeJson(args.out, records);
writeJson(args.metadata, metadata);
writeJson(OUT_AUDIT, {
  schema: 'diognosis.label-source-coverage-audit.v1',
  generatedAt: metadata.generatedAt,
  stagedRecords: records.length,
  fetchedRecords: 0,
  sourceTruthStatus: metadata.sourceTruthStatus,
  reviewBoundary: 'label_source_lane_initialized_no_runtime_fetch_no_core_promotion',
});
writeText(OUT_MD, `# Label Source Coverage Audit

Generated: ${metadata.generatedAt}

- Staged label records: ${records.length}
- Fetched source records: 0
- Source truth status: ${metadata.sourceTruthStatus}
- Boundary: label source intake is build-time only and cannot affect scoring or public severity.
`);
console.log(JSON.stringify({ ok: true, stagedRecords: records.length, sourceTruthStatus: metadata.sourceTruthStatus }, null, 2));
