import { mkdirSync, writeFileSync } from 'node:fs';

const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
const ORDER = ['Platform admin', 'Owner', 'Manager', 'Cashier', 'Kitchen', 'Customer', 'Anonymous', 'Security'];

function summarize(items) {
  const s = { pass: 0, fail: 0, skip: 0, total: items.length };
  for (const r of items) s[r.status]++;
  return s;
}

function group(items, key) {
  const m = new Map();
  for (const r of items) {
    if (!m.has(r[key])) m.set(r[key], []);
    m.get(r[key]).push(r);
  }
  return m;
}

function cellClass(s) {
  if (s.total === 0) return 'empty';
  if (s.fail > 0) return 'fail';
  if (s.pass === 0) return 'skip';
  return s.skip > 0 ? 'partial' : 'pass';
}

export function writeReports(results, config) {
  mkdirSync(config.outDir, { recursive: true });
  const stamp = new Date().toISOString();
  const total = summarize(results);
  const roles = [...new Set(results.map((r) => r.role))].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
  const features = [...new Set(results.map((r) => r.feature))];

  // ---------- Markdown ----------
  const md = [];
  md.push(`# Sahtain E2E report`, '', `Run \`${config.runId}\` at ${stamp}  `, `API: ${config.apiUrl}`, '');
  md.push(`**${total.pass} passed, ${total.fail} failed, ${total.skip} skipped** (${total.total} checks)`, '');
  md.push('## Feature x role', '', `| Feature | ${roles.join(' | ')} |`, `|---|${roles.map(() => '---').join('|')}|`);
  for (const f of features) {
    const cells = roles.map((role) => {
      const s = summarize(results.filter((r) => r.feature === f && r.role === role));
      if (!s.total) return '';
      return `${s.fail ? '❌' : s.pass ? '✅' : '⏭️'} ${s.pass}/${s.total}`;
    });
    md.push(`| ${f} | ${cells.join(' | ')} |`);
  }
  const failed = results.filter((r) => r.status === 'fail');
  md.push('', '## Failures', '');
  if (!failed.length) md.push('None.');
  for (const r of failed) md.push(`- **[${r.role}] ${r.feature} - ${r.name}**\n  \`${r.message.replace(/`/g, "'")}\``);
  md.push('', '## All checks', '');
  for (const [f, items] of group(results, 'feature')) {
    md.push(`### ${f}`, '');
    for (const r of items) md.push(`- ${r.status === 'pass' ? '✅' : r.status === 'fail' ? '❌' : '⏭️'} [${r.role}] ${r.name}${r.message ? ` - ${r.message}` : ''}`);
    md.push('');
  }

  // ---------- HTML ----------
  const h = [];
  h.push(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sahtain E2E report</title><style>
:root{--bg:#f8f1e4;--card:#fffaf0;--ink:#3b2418;--mut:#7a6556;--ok:#2f7d4f;--bad:#c0392b;--sk:#b8860b;--line:#e4d8c3}
@media(prefers-color-scheme:dark){:root{--bg:#1d1612;--card:#271e18;--ink:#f3e9da;--mut:#b5a590;--line:#3d3027}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,sans-serif;padding:24px 16px}
main{max-width:1100px;margin:auto}h1{margin:0 0 4px}h2{margin:32px 0 12px}.mut{color:var(--mut)}
.cards{display:flex;gap:12px;flex-wrap:wrap;margin:16px 0}.card{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:12px 18px;min-width:110px}
.card b{display:block;font-size:26px}.ok{color:var(--ok)}.bad{color:var(--bad)}.sk{color:var(--sk)}
.scroll{overflow-x:auto}table{border-collapse:collapse;width:100%;background:var(--card);border:1px solid var(--line);border-radius:8px}
th,td{padding:8px 10px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}th{font-size:13px;color:var(--mut)}
td.c{text-align:center;font-variant-numeric:tabular-nums;white-space:nowrap}td.pass{background:color-mix(in srgb,var(--ok) 18%,transparent)}
td.fail{background:color-mix(in srgb,var(--bad) 22%,transparent);font-weight:600}td.partial{background:color-mix(in srgb,var(--sk) 16%,transparent)}td.skip{background:color-mix(in srgb,var(--sk) 10%,transparent);color:var(--mut)}
details{background:var(--card);border:1px solid var(--line);border-radius:8px;margin:8px 0;padding:0 14px}summary{cursor:pointer;padding:10px 0;font-weight:600}
.row{padding:6px 0;border-top:1px solid var(--line);display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}.badge{font-size:11px;font-weight:700;border-radius:4px;padding:1px 6px;color:#fff}
.b-pass{background:var(--ok)}.b-fail{background:var(--bad)}.b-skip{background:var(--sk)}.role{color:var(--mut);font-size:13px}pre{margin:4px 0 0;white-space:pre-wrap;color:var(--bad);font-size:13px;flex-basis:100%}
</style></head><body><main>`);
  h.push(`<h1>Sahtain E2E report</h1><div class="mut">Run ${esc(config.runId)} &middot; ${esc(stamp)} &middot; ${esc(config.apiUrl)}</div>`);
  h.push(`<div class="cards"><div class="card"><b class="ok">${total.pass}</b>passed</div><div class="card"><b class="bad">${total.fail}</b>failed</div><div class="card"><b class="sk">${total.skip}</b>skipped</div><div class="card"><b>${total.total}</b>total</div></div>`);
  h.push('<h2>Feature &times; role</h2><div class="scroll"><table><thead><tr><th>Feature</th>' + roles.map((r) => `<th>${esc(r)}</th>`).join('') + '<th>Total</th></tr></thead><tbody>');
  for (const f of features) {
    h.push(`<tr><td>${esc(f)}</td>`);
    for (const role of roles) {
      const s = summarize(results.filter((r) => r.feature === f && r.role === role));
      h.push(s.total ? `<td class="c ${cellClass(s)}">${s.pass}/${s.total}${s.fail ? ` &middot; ${s.fail} failed` : ''}</td>` : '<td></td>');
    }
    const s = summarize(results.filter((r) => r.feature === f));
    h.push(`<td class="c ${cellClass(s)}">${s.pass}/${s.total}</td></tr>`);
  }
  h.push('</tbody></table></div>');
  h.push('<h2>Failures</h2>');
  if (!failed.length) h.push('<p class="ok">No failures.</p>');
  for (const r of failed) h.push(`<div class="row"><span class="badge b-fail">FAIL</span><span>${esc(r.feature)} - ${esc(r.name)}</span><span class="role">${esc(r.role)}</span><pre>${esc(r.message)}</pre></div>`);
  h.push('<h2>All checks</h2>');
  for (const [f, items] of group(results, 'feature')) {
    const s = summarize(items);
    h.push(`<details${s.fail ? ' open' : ''}><summary>${esc(f)} <span class="mut">(${s.pass}/${s.total}${s.fail ? `, ${s.fail} failed` : ''})</span></summary>`);
    for (const r of items) h.push(`<div class="row"><span class="badge b-${r.status}">${r.status.toUpperCase()}</span><span>${esc(r.name)}</span><span class="role">${esc(r.role)} &middot; ${r.ms} ms</span>${r.message ? `<pre style="color:var(--mut)">${esc(r.message)}</pre>` : ''}</div>`);
    h.push('</details>');
  }
  h.push('</main></body></html>');

  const base = config.outDir.replace(/\/$/, '');
  const paths = { html: `${base}/report.html`, md: `${base}/report.md`, json: `${base}/report.json` };
  writeFileSync(paths.html, h.join('\n'));
  writeFileSync(paths.md, md.join('\n'));
  writeFileSync(paths.json, JSON.stringify({ runId: config.runId, at: stamp, total, results }, null, 2));
  return paths;
}
