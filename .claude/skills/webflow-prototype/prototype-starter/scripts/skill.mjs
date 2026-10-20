// Run a script that lives in one of the template's skills, from this
// prototype folder:   node scripts/skill.mjs <skill> <script.mjs> [args…]
// The skills sit in the repo's .claude/skills and are linked into the
// workspace next to this folder, so their scripts are found by walking up
// from here. Running them from the skill (not from a copy in this folder)
// means `pnpm update-skills` updates them for every project.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [skill, script, ...rest] = process.argv.slice(2);
if (!skill || !script) { console.error('usage: node scripts/skill.mjs <skill> <script.mjs> [args…]'); process.exit(1); }
const found = (base) => {
  const p = path.join(base, '.claude/skills', skill, 'scripts', script);
  return fs.existsSync(p) ? p : null;
};
let file = null;
for (let dir = process.cwd(); !file; dir = path.dirname(dir)) {
  file = found(dir);
  // The workspace holds the repo as a sibling of this folder: look one level into it too.
  if (!file) for (const e of fs.readdirSync(dir, { withFileTypes: true })) if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules') { file = found(path.join(dir, e.name)); if (file) break; }
  if (file || dir === path.dirname(dir)) break;
}
if (!file) { console.error(`Can't find .claude/skills/${skill}/scripts/${script} above ${process.cwd()}. Run pnpm update-skills in the repo.`); process.exit(1); }
process.argv = [process.argv[0], file, ...rest];
await import(pathToFileURL(file).href);
