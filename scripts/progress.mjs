// Task progress: the client's plans (New build, SEO, Maintenance…), which
// checklist items are done and who did them, and the requests, in
// docs/handoff/progress.json (format 2). Bench's Tasks panel, Claude (through
// this script) and CI all read and write the same file, and Sync carries it
// between Macs (docs/bench.md › Task progress).
//   pnpm progress show [--json]
//   pnpm progress tick   "<checklist>" "<item, or the start of it>" [--page /about] [--component Nav] [--by claude|check|you] [--plan build]
//   pnpm progress untick "<checklist>" "<item>" [--page …] [--component …] [--plan …]
//   pnpm progress todo "<text>"          a request (a to-do for the person)
//   pnpm progress todo-done "<text or id>"
//   pnpm progress stage <name|auto> [--plan build]   pin a plan's stage, or derive it again
//   pnpm progress plan list | plan add <kind> | plan end <id>
//     kinds: new-build, migration, optimization, seo, maintenance
// <checklist> is a checklist heading from the skills, e.g. "Before building",
// "Pre-launch QA · Content" or "Page done" (with --page). Matching ignores
// case and takes the start of the text, as long as it's unique.
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
export const FILE = 'docs/handoff/progress.json';

// ── Checklists (the same rules as Bench's parser, so the ids match) ─────
const OWNERS = { claude: 'claude', 'claude checks': 'claude-checks', person: 'person' };
const ITEM = /^- \[(Claude checks|Claude|Person)\]\s+(.*)$/i;

export function plain(s) {
  return s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\s+/g, ' ').trim();
}

export function parseChecklists(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const groups = [];
  let h2 = null;
  let sub = null;
  let current = null;
  let item = null;
  let inFence = false;
  const groupFor = () => {
    const title = sub ? `${h2.title} · ${sub}` : h2.title;
    if (current?.title !== title) {
      current = { title, hint: h2.hint, items: [] };
      groups.push(current);
    }
    return current;
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^```/.test(line)) inFence = !inFence;
    if (inFence) continue;
    const heading = /^##\s+(.+?)\s*$/.exec(line);
    if (heading && !line.startsWith('###')) {
      const m = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(heading[1]);
      h2 = { title: plain(m ? m[1] : heading[1]), hint: m ? plain(m[2]) : undefined };
      sub = null;
      current = null;
      item = null;
      continue;
    }
    if (line.startsWith('#')) {
      h2 = null;
      item = null;
      continue;
    }
    if (!h2) continue;
    const tagged = ITEM.exec(line);
    if (tagged) {
      item = { owner: OWNERS[tagged[1].toLowerCase()], text: tagged[2] };
      groupFor().items.push(item);
      continue;
    }
    if (item && /^\s{2,}\S/.test(line)) {
      item.text += ' ' + line.trim();
      continue;
    }
    item = null;
    const next = lines[i + 1] ?? '';
    if (line.trim() && !line.startsWith('-') && !/^\s/.test(line) && ITEM.test(next) && line.length < 48 && !/[.:,]$/.test(line.trim())) {
      sub = plain(line);
    }
  }
  for (const g of groups) for (const it of g.items) it.text = plain(it.text);
  return groups.filter((g) => g.items.length > 0);
}

/** An item's id: the first 12 hex of sha1("<group id>\n<item text>"). Rewording an item changes it. */
export const itemId = (group, text) => createHash('sha1').update(`${group}\n${text}`).digest('hex').slice(0, 12);

function skill(rel) {
  for (const base of [path.join(root, '.claude/skills'), path.join(root, '..', '.claude/skills')]) {
    try {
      return fs.readFileSync(path.join(base, rel), 'utf8');
    } catch { /* next */ }
  }
  return '';
}

/**
 * Every checklist, with its group id prefix: build/… from webflow-build,
 * launch/… from webflow-launch, and seo/…, maintenance/…, optimization/…
 * from those plans' skills.
 */
export function checklists() {
  return [
    ...parseChecklists(skill('webflow-build/checklists.md')).map((g) => ({ ...g, set: 'build' })),
    ...parseChecklists(skill('webflow-launch/SKILL.md')).map((g) => ({ ...g, set: 'launch' })),
    ...['seo', 'maintenance', 'optimization'].flatMap((kind) => parseChecklists(skill(`webflow-${kind}/checklists.md`)).map((g) => ({ ...g, set: kind }))),
  ];
}

// ── Stages: the order a site goes through, and the checklists in each ──
export const STAGES = [
  ['Prototype', (id) => id.startsWith('build/Prototype')],
  ['Before building', (id) => id.startsWith('build/Before building')],
  ['Foundation', (id) => id.startsWith('build/Foundation done') || id.startsWith('build/Media done')],
  ['Components', (id) => id.startsWith('build/component/')],
  ['Pages', (id) => id.startsWith('build/page/')],
  ['Build handoff', (id) => id.startsWith('build/Build handoff') || id.startsWith('build/Migration parity')],
  ['SEO plan', (id) => id.startsWith('launch/SEO plan')],
  ['Pre-launch QA', (id) => id.startsWith('launch/Pre-launch QA')],
  ['Launch day', (id) => id.startsWith('launch/Launch day')],
  ['Client handoff', (id) => id.startsWith('launch/Handoff to client')],
  ['After launch', (id) => id.startsWith('launch/After launch')],
];

// ── Plans ────────────────────────────────────────────────────────────────
export const KINDS = ['new-build', 'migration', 'optimization', 'seo', 'maintenance'];
const RECURRING = ['seo', 'maintenance'];
const today = () => new Date().toISOString().slice(0, 10);
export const buildPlan = () => ({ id: 'build', kind: 'new-build', status: 'active', started: today() });

export function newPlan(kind, taken) {
  if (!KINDS.includes(kind)) throw new Error(`Plan kinds: ${KINDS.join(', ')}.`);
  const base = kind === 'new-build' ? 'build' : kind;
  let id = base;
  for (let n = 2; taken.includes(id); n++) id = `${base}-${n}`;
  const d = new Date();
  return { id, kind, status: 'active', started: today(), ...(RECURRING.includes(kind) ? { cycle: { day: Math.min(28, d.getDate()) } } : {}) };
}

/** Which plan a build/launch checklist belongs to: the active build (or migration for build/…). */
export function planFor(p, set, wanted) {
  // A fresh project (no plan yet) is a build: the first build tick starts it.
  if (!p.plans.length && !wanted) p.plans.push(buildPlan());
  const active = p.plans.filter((x) => x.status === 'active');
  if (wanted) {
    const plan = active.find((x) => x.id === wanted);
    if (!plan) throw new Error(`No active plan "${wanted}". pnpm progress plan list shows them.`);
    return plan;
  }
  // SEO, Maintenance and Optimization checklists belong to their own plan.
  if (KINDS.includes(set)) {
    const plan = active.find((x) => x.kind === set);
    if (!plan) throw new Error(`No ${set} plan is running. Start one: pnpm progress plan add ${set}`);
    return plan;
  }
  const plan = active.find((x) => x.kind === 'new-build' || (set === 'build' && x.kind === 'migration'));
  if (!plan) throw new Error(`No active plan has the ${set} checklists. Start one: pnpm progress plan add new-build`);
  return plan;
}

/** An item's id within a plan: the build plan keeps format 1's ids. */
export const planItemId = (plan, group, text) => itemId(plan.id === 'build' ? group : `${plan.id}/${group}`, text);

// ── The file ─────────────────────────────────────────────────────────────
/** The file a new project starts with: no plan yet (Bench or the first build tick adds one). */
export const empty = () => ({ format: 2, plans: [], ticks: {}, todos: [], components: [], history: [] });

/** Format 1 (no plans) is one New build plan: its ticks move under build/ and its stage onto the plan. */
export function migrate(raw) {
  if (raw.format === 2) return { ...empty(), plans: [], ...raw };
  const plan = { ...buildPlan(), ...(raw.stage ? { stage: raw.stage } : {}) };
  const ticks = {};
  for (const [g, t] of Object.entries(raw.ticks ?? {})) ticks[`build/${g}`] = t;
  return { ...empty(), plans: [plan], ticks, todos: raw.todos ?? [], components: raw.components ?? [] };
}

export function load(dir = root) {
  try {
    return migrate(JSON.parse(fs.readFileSync(path.join(dir, FILE), 'utf8')));
  } catch {
    return empty();
  }
}

/**
 * One plan and one tick per line, groups and ticks sorted, so two Macs
 * ticking different items merge without a conflict.
 */
export function serialize(p) {
  const groups = Object.keys(p.ticks).sort().filter((g) => Object.keys(p.ticks[g]).length);
  const tickLines = groups.map((g) => {
    const ids = Object.keys(p.ticks[g]).sort();
    const rows = ids.map((id) => `      ${JSON.stringify(id)}: ${JSON.stringify(p.ticks[g][id])}`);
    return `    ${JSON.stringify(g)}: {\n${rows.join(',\n')}\n    }`;
  });
  const list = (xs) => `[${xs.length ? `\n${xs.map((x) => `    ${JSON.stringify(x)}`).join(',\n')}\n  ` : ''}]`;
  return [
    '{',
    '  "format": 2,',
    `  "plans": ${list(p.plans)},`,
    `  "ticks": {${tickLines.length ? `\n${tickLines.join(',\n')}\n  ` : ''}},`,
    `  "todos": ${list(p.todos)},`,
    `  "components": ${JSON.stringify(p.components ?? [])},`,
    `  "history": ${list(p.history ?? [])}`,
    '}',
    '',
  ].join('\n');
}

export function save(p, dir = root) {
  const file = path.join(dir, FILE);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, serialize(p));
}

/** The group a tick goes in: a checklist, or one page's or one component's copy of it. */
export function findGroup(lists, name, { page, component } = {}) {
  const q = name.trim().toLowerCase();
  const hits = lists.filter((g) => g.title.toLowerCase().startsWith(q));
  const exact = hits.filter((g) => g.title.toLowerCase() === q);
  const pick = exact.length === 1 ? exact : hits;
  if (!pick.length) throw new Error(`No checklist called "${name}". Run pnpm progress show for the list.`);
  if (pick.length > 1) throw new Error(`"${name}" matches ${pick.map((g) => `"${g.title}"`).join(', ')}. Say more of it.`);
  const g = pick[0];
  if (g.title === 'Page done') {
    if (!page) throw new Error('Page done is per page: add --page /path.');
    return { ...g, id: `build/page/${page}` };
  }
  if (g.title === 'Component done') {
    if (!component) throw new Error('Component done is per component: add --component <name>.');
    return { ...g, id: `build/component/${component}` };
  }
  return { ...g, id: `${g.set}/${g.title}` };
}

export function findItem(group, text) {
  const q = plain(text).toLowerCase();
  const hits = group.items.filter((i) => i.text.toLowerCase().startsWith(q));
  const loose = hits.length ? hits : group.items.filter((i) => i.text.toLowerCase().includes(q));
  if (!loose.length) throw new Error(`No item in "${group.title}" starts with "${text}".`);
  if (loose.length > 1) throw new Error(`"${text}" matches ${loose.length} items in "${group.title}". Say more of it.`);
  return loose[0];
}

/**
 * Whether the Prototype stage counts, as in Bench: a site from Figma (Bench's
 * .bench/prototype-build.json in the client folder) or one with a Prototype tick.
 */
export function fromFigma(p, plan, dir = root) {
  if (Object.keys(p.ticks[`${plan.id}/build/Prototype`] ?? {}).length) return true;
  return [path.join(dir, '.bench/prototype-build.json'), path.join(dir, '../.bench/prototype-build.json')].some((f) => fs.existsSync(f));
}

/** A plan's first stage with something left to do (pages from the config; components from the file). */
export function deriveStage(p, lists, pages, plan = p.plans.find((x) => x.status === 'active') ?? buildPlan()) {
  const groups = [];
  if (!fromFigma(p, plan)) lists = lists.filter((g) => !(g.set === 'build' && g.title === 'Prototype'));
  for (const g of lists) {
    if (g.title === 'Page done') for (const pg of pages) groups.push({ id: `build/page/${pg}`, items: g.items });
    else if (g.title === 'Component done') for (const c of p.components ?? []) groups.push({ id: `build/component/${c}`, items: g.items });
    else groups.push({ id: `${g.set}/${g.title}`, items: g.items });
  }
  for (const [name, has] of STAGES) {
    const mine = groups.filter((g) => has(g.id));
    if (mine.some((g) => g.items.some((i) => !p.ticks[`${plan.id}/${g.id}`]?.[planItemId(plan, g.id, i.text)]))) return name;
  }
  return STAGES[STAGES.length - 1][0];
}

// ── CLI ──────────────────────────────────────────────────────────────────
function main(argv) {
  const opt = (name) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const args = argv.filter((a, i) => !a.startsWith('--') && !argv[i - 1]?.startsWith('--'));
  const [cmd, a, b] = args;
  const p = load();
  const lists = checklists();
  const pages = (() => {
    try {
      return JSON.parse(fs.readFileSync(path.join(root, 'webflow-build.config.json'), 'utf8')).pages ?? ['/'];
    } catch {
      return ['/'];
    }
  })();

  if (cmd === 'tick' || cmd === 'untick') {
    if (!a || !b) throw new Error(`Usage: pnpm progress ${cmd} "<checklist>" "<item>" [--page /path] [--component Name]`);
    // Only the checklists of the plans that are running (or of --plan): SEO and
    // Optimization both have a Baseline, for one.
    const sets = (kind) => (kind === 'new-build' ? ['build', 'launch'] : kind === 'migration' ? ['build'] : [kind]);
    const wanted = opt('plan') && p.plans.find((x) => x.id === opt('plan'));
    const running = wanted ? [wanted] : p.plans.filter((x) => x.status === 'active');
    const mine = new Set(running.length ? running.flatMap((x) => sets(x.kind)) : ['build', 'launch']);
    const pool = lists.filter((g) => mine.has(g.set));
    const group = findGroup(pool.length ? pool : lists, a, { page: opt('page'), component: opt('component') });
    const item = findItem(group, b);
    const plan = planFor(p, group.set, opt('plan'));
    const key = `${plan.id}/${group.id}`;
    const id = planItemId(plan, group.id, item.text);
    if (cmd === 'tick') {
      const by = opt('by') ?? 'claude';
      if (!['claude', 'check', 'you'].includes(by)) throw new Error('--by is claude, check or you.');
      p.ticks[key] = { ...p.ticks[key], [id]: { text: item.text, by, at: new Date().toISOString() } };
      if (opt('component') && !p.components.includes(opt('component'))) p.components.push(opt('component'));
    } else if (p.ticks[key]) {
      delete p.ticks[key][id];
    }
    save(p);
    console.log(`${cmd === 'tick' ? 'Ticked' : 'Unticked'} ${key} › ${item.text}`);
    return;
  }
  if (cmd === 'plan') {
    if (a === 'add') {
      if (p.plans.some((x) => x.kind === b && x.status === 'active')) throw new Error(`A ${b} plan is running already.`);
      const plan = newPlan(b, p.plans.map((x) => x.id));
      p.plans.push(plan);
      p.history.push({ at: new Date().toISOString(), text: `Started ${b}` });
      save(p);
      console.log(`Started ${plan.kind} (${plan.id})`);
      return;
    }
    if (a === 'end') {
      const plan = p.plans.find((x) => x.id === b && x.status === 'active');
      if (!plan) throw new Error(`No active plan "${b}".`);
      Object.assign(plan, { status: 'done', ended: today() });
      p.history.push({ at: new Date().toISOString(), text: `Finished ${plan.kind}` });
      save(p);
      console.log(`Finished ${plan.kind} (${plan.id}); its ticks stay.`);
      return;
    }
    for (const x of p.plans) console.log(`${x.status === 'active' ? '●' : '○'} ${x.id}  ${x.kind}  since ${x.started}${x.ended ? ` · ended ${x.ended}` : ''}${x.cycle ? ` · monthly from day ${x.cycle.day}` : ''}`);
    return;
  }
  if (cmd === 'todo') {
    if (!a?.trim()) throw new Error('Usage: pnpm progress todo "<text>"');
    p.todos.push({ id: `t-${randomUUID().slice(0, 8)}`, text: a.trim(), done: false });
    save(p);
    console.log(`Added a to-do: ${a.trim()}`);
    return;
  }
  if (cmd === 'todo-done') {
    const t = p.todos.find((x) => x.id === a) ?? p.todos.find((x) => x.text.toLowerCase().startsWith((a ?? '').toLowerCase()));
    if (!t) throw new Error(`No to-do "${a}".`);
    t.done = true;
    save(p);
    console.log(`Done: ${t.text}`);
    return;
  }
  if (cmd === 'stage') {
    const plan = planFor(p, 'build', opt('plan'));
    if (a === 'auto') delete plan.stage;
    else {
      const s = STAGES.find(([n]) => n.toLowerCase().startsWith((a ?? '').toLowerCase()));
      if (!s) throw new Error(`Stages: ${STAGES.map(([n]) => n).join(', ')}, or auto.`);
      plan.stage = s[0];
    }
    save(p);
    console.log(`${plan.id} stage: ${plan.stage ?? `${deriveStage(p, lists, pages, plan)} (derived)`}`);
    return;
  }
  // show
  const active = p.plans.filter((x) => x.status === 'active');
  if (argv.includes('--json')) {
    console.log(JSON.stringify({
      plans: active.map((x) => ({ ...x, stage: x.stage ?? (x.kind === 'new-build' || x.kind === 'migration' ? deriveStage(p, lists, pages, x) : null), pinned: !!x.stage })),
      ticks: p.ticks,
      todos: p.todos,
    }, null, 2));
    return;
  }
  if (!active.length) console.log('No plan running. Start one: pnpm progress plan add new-build (or migration, seo, maintenance, optimization).');
  for (const plan of active) {
    const builds = plan.kind === 'new-build' || plan.kind === 'migration';
    console.log(`${plan.id} (${plan.kind})${builds ? ` · stage: ${plan.stage ?? deriveStage(p, lists, pages, plan)}${plan.stage ? ' (set by hand)' : ''}` : ''}`);
    if (!builds) {
      for (const g of lists.filter((x) => x.set === plan.kind)) {
        const id = `${g.set}/${g.title}`;
        const done = g.items.filter((i) => p.ticks[`${plan.id}/${id}`]?.[planItemId(plan, id, i.text)]).length;
        console.log(`  ${done === g.items.length ? '☑' : '☐'} ${id}  ${done}/${g.items.length}`);
      }
      continue;
    }
    for (const g of lists.filter((x) => x.set === 'build' || (plan.kind === 'new-build' && x.set === 'launch'))) {
      const ids = g.title === 'Page done' ? pages.map((pg) => `build/page/${pg}`)
        : g.title === 'Component done' ? (p.components ?? []).map((c) => `build/component/${c}`) : [`${g.set}/${g.title}`];
      for (const id of ids) {
        const done = g.items.filter((i) => p.ticks[`${plan.id}/${id}`]?.[planItemId(plan, id, i.text)]).length;
        console.log(`  ${done === g.items.length ? '☑' : '☐'} ${id}  ${done}/${g.items.length}`);
      }
    }
  }
  const open = p.todos.filter((t) => !t.done);
  if (open.length) console.log(`Requests:\n${open.map((t) => `  ☐ ${t.text}`).join('\n')}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main(process.argv.slice(2));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
