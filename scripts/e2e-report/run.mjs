#!/usr/bin/env node
// End-to-end API test run for every role. See README.md.
import { readdirSync } from 'node:fs';
import { config } from './lib/config.mjs';
import { runAll, results } from './lib/runner.mjs';
import { writeReports } from './lib/report.mjs';

const dir = new URL('./tests/', import.meta.url);
const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));
for (const file of readdirSync(dir).filter((f) => f.endsWith('.mjs')).sort()) {
  if (only.length && !only.some((o) => file.includes(o))) continue;
  await import(new URL(file, dir));
}

const useColor = process.stdout.isTTY;
const c = (code, s) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s);
console.log(`\nSahtain E2E run ${config.runId}  api=${config.apiUrl}\n`);

const ctx = { config };
await runAll(ctx, {
  onResult(r) {
    const tag = r.status === 'pass' ? c(32, 'PASS') : r.status === 'fail' ? c(31, 'FAIL') : c(33, 'SKIP');
    console.log(`${tag}  [${r.role}] ${r.feature} - ${r.name}${r.message ? c(90, `\n        ${r.message}`) : ''}`);
  },
});

const count = (s) => results.filter((r) => r.status === s).length;
const paths = writeReports(results, config);
console.log(`\n${count('pass')} passed, ${count('fail')} failed, ${count('skip')} skipped (${results.length} total)`);
console.log(`Report: ${paths.html}\n        ${paths.md}`);
process.exit(count('fail') > 0 ? 1 : 0);
