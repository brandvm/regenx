// Repo checks that tsc doesn't cover. Run by `pnpm check` (and so by CI).
//   - every .mjs script parses (node --check);
//   - every skill has a SKILL.md with name and description frontmatter;
//   - relative links in the skills, docs and top-level Markdown resolve.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skip = new Set(['node_modules', '.git', 'dist', 'test-results', 'playwright-report', '.webflow-build']);
const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else files.push(p);
  }
})(root);
const rel = (p) => path.relative(root, p);
const errors = [];

for (const f of files.filter((f) => f.endsWith('.mjs'))) {
  try {
    execFileSync(process.execPath, ['--check', f], { stdio: ['ignore', 'ignore', 'pipe'] });
  } catch (e) {
    errors.push(`${rel(f)}: does not parse\n${e.stderr}`);
  }
}

const skillsDir = path.join(root, '.claude/skills');
for (const name of fs.existsSync(skillsDir) ? fs.readdirSync(skillsDir) : []) {
  const file = path.join(skillsDir, name, 'SKILL.md');
  if (!fs.existsSync(file)) { errors.push(`.claude/skills/${name}: no SKILL.md`); continue; }
  const front = fs.readFileSync(file, 'utf8').match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
  if (!new RegExp(`^name: ${name}$`, 'm').test(front)) errors.push(`${rel(file)}: frontmatter name must be "${name}"`);
  if (!/^description: .{40,}/m.test(front)) errors.push(`${rel(file)}: frontmatter needs a description`);
}

for (const f of files.filter((f) => f.endsWith('.md'))) {
  const text = fs.readFileSync(f, 'utf8').replace(/```[\s\S]*?```/g, '');
  for (const [, target] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    const file = target.split('#')[0];
    if (file && !fs.existsSync(path.resolve(path.dirname(f), file))) errors.push(`${rel(f)}: broken link ${target}`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('check-repo: scripts parse, skills have frontmatter, links resolve');
