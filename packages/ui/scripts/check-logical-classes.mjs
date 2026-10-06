// Fails when Tailwind physical direction classes are used, so layouts keep working in RTL.
// Usage: node check-logical-classes.mjs [dir...]   (default: ./src)
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const PHYSICAL =
  /(?<=^|[\s'"`:])-?(?:m[lr]|p[lr]|left|right|border-[lr]|rounded-(?:[lr]|[tb][lr])|scroll-[mp][lr])-[\w[\]./%-]+|(?<=^|[\s'"`:])text-(?:left|right)(?![\w-])/g;

const dirs = process.argv.slice(2);
const roots = dirs.length > 0 ? dirs : ['src'];
const hits = [];

function walk(path) {
  for (const name of readdirSync(path)) {
    const full = join(path, name);
    if (statSync(full).isDirectory()) {
      if (name !== 'node_modules' && name !== 'dist') walk(full);
    } else if (/\.(tsx?|css)$/.test(name) && !/\.test\.tsx?$/.test(name)) {
      readFileSync(full, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          for (const match of line.matchAll(PHYSICAL)) {
            hits.push(`${relative(process.cwd(), full)}:${String(i + 1)}  ${match[0]}`);
          }
        });
    }
  }
}

roots.forEach(walk);

if (hits.length > 0) {
  console.error('Physical direction classes found (use ms-/me-/ps-/pe-/start-/end-/text-start):');
  console.error(hits.join('\n'));
  process.exit(1);
}
