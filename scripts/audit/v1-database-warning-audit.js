#!/usr/bin/env node
import { execFileSync } from 'child_process';

const output = execFileSync(process.execPath, ['scripts/database-audit.js'], {
  encoding:'utf8',
  stdio:['ignore', 'pipe', 'pipe'],
});
const report = JSON.parse(output);

if ((report.errors || []).length || (report.warnings || []).length) {
  console.error(JSON.stringify(report, null, 2));
  throw new Error(`V1 database warning audit failed: ${report.errors.length} error(s), ${report.warnings.length} warning(s).`);
}

console.log(`V1 database warning audit passed: ${report.counts.drugs} drugs, ${report.counts.studies} studies, ${report.counts.metaboliteParents} metabolite parents, no warnings.`);
