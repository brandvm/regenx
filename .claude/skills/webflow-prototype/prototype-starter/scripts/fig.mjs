// Read a Figma file (.fig) without the Figma connector.
//   pnpm fig <file.fig>                    summary: pages, frames, fonts, colours
//   pnpm fig <file.fig> --frame "Home"     one frame's layers, sizes and text
//   pnpm fig <file.fig> --images           also unpack the images it uses
// The fallback for when there is no Figma link or the connector is not
// connected (webflow-prototype › figma.md): a person saves the file from
// Figma (File › Save local copy) and this decodes it. It gives structure,
// sizes, text, fonts and colours; it does not render anything, so a
// screenshot of each frame is still needed to check the look.
// Output goes to design/fig/<file name>/: tree.json (every layer), the
// file's thumbnail, and images/ with --images.
// A .fig is a zip holding canvas.fig: a "fig-kiwi" header, then a schema
// and a message, each compressed, in Kiwi's binary format. The format is
// Figma's own and undocumented: if a newer file fails here, say so and ask
// for the Figma link instead. Needs the `unzip` command.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const file = argv.find((a) => !a.startsWith('--') && argv[argv.indexOf(a) - 1] !== '--frame');
const frameName = argv.includes('--frame') ? argv[argv.indexOf('--frame') + 1] : null;
if (!file || !fs.existsSync(file)) { console.error('Which file? pnpm fig <file.fig> [--frame "<name>"] [--images]'); process.exit(1); }
const out = path.join(root, 'design/fig', path.basename(file, '.fig').replace(/[^\w-]+/g, '-').toLowerCase());
fs.mkdirSync(out, { recursive: true });

const unzip = (...a) => execFileSync('unzip', a, { maxBuffer: 1024 ** 3, stdio: ['ignore', 'pipe', 'pipe'] });
const head = Buffer.alloc(8);
fs.readSync(fs.openSync(file, 'r'), head, 0, 8, 0);
let canvas;
if (head.toString('latin1', 0, 2) === 'PK') {
  canvas = unzip('-p', file, 'canvas.fig');
  try { fs.writeFileSync(path.join(out, 'thumbnail.png'), unzip('-p', file, 'thumbnail.png')); } catch { /* no thumbnail */ }
  if (argv.includes('--images')) unzip('-o', '-q', file, 'images/*', '-d', out);
} else canvas = fs.readFileSync(file);
if (canvas.toString('latin1', 0, 8) !== 'fig-kiwi') { console.error('Not a Figma design file (no fig-kiwi header). FigJam and Slides files are not supported.'); process.exit(1); }

// Chunks: 4-byte length, then data that is raw deflate or zstd.
const chunks = [];
for (let at = 12; at + 4 <= canvas.length;) {
  const len = canvas.readUInt32LE(at);
  const data = canvas.subarray(at + 4, at + 4 + len);
  chunks.push(data.readUInt32LE(0) === 0xfd2fb528 ? zlib.zstdDecompressSync(data) : zlib.inflateRawSync(data));
  at += 4 + len;
}
if (chunks.length < 2) { console.error('Unexpected .fig layout: schema or data chunk missing.'); process.exit(1); }

// Kiwi reader (github.com/evanw/kiwi): varints, zigzag ints, packed floats.
class Reader {
  constructor(b) { this.b = b; this.i = 0; }
  byte() { return this.b[this.i++]; }
  uint() { let v = 0, s = 0, x; do { x = this.b[this.i++]; v |= (x & 127) << s; s += 7; } while (x & 128 && s < 35); return v >>> 0; }
  int() { const v = this.uint(); return v & 1 ? ~(v >>> 1) : v >>> 1; }
  big() { let v = 0n, s = 0n, x; do { x = this.b[this.i++]; v |= BigInt(x & 127) << s; s += 7n; } while (x & 128 && s < 56n); if (x & 128 && s === 56n) v |= BigInt(this.b[this.i++]) << s; return v; }
  float() {
    if (this.b[this.i] === 0) { this.i++; return 0; }
    let bits = this.b.readUInt32LE(this.i); this.i += 4;
    bits = ((bits << 23) | (bits >>> 9)) >>> 0;
    return new Float32Array(new Uint32Array([bits]).buffer)[0];
  }
  string() { const end = this.b.indexOf(0, this.i); const s = this.b.toString('utf8', this.i, end); this.i = end + 1; return s; }
  bytes() { const n = this.uint(); const s = this.b.subarray(this.i, this.i + n); this.i += n; return s; }
}
const NATIVE = ['bool', 'byte', 'int', 'uint', 'float', 'string', 'int64', 'uint64'];
function readSchema(buf) {
  const r = new Reader(buf);
  const defs = [];
  for (let n = r.uint(), i = 0; i < n; i++) {
    const def = { name: r.string(), kind: ['ENUM', 'STRUCT', 'MESSAGE'][r.byte()], fields: [] };
    for (let m = r.uint(), j = 0; j < m; j++) def.fields.push({ name: r.string(), type: r.int(), isArray: !!(r.byte() & 1), value: r.uint() });
    defs.push(def);
  }
  return defs;
}
const defs = readSchema(chunks[0]);
function read(r, type) {
  if (type < 0) {
    switch (NATIVE[~type]) {
      case 'bool': return !!r.byte();
      case 'byte': return r.byte();
      case 'int': return r.int();
      case 'uint': return r.uint();
      case 'float': return r.float();
      case 'string': return r.string();
      case 'int64': { const v = r.big(); return Number(v & 1n ? ~(v >> 1n) : v >> 1n); }
      default: return Number(r.big());
    }
  }
  const def = defs[type];
  if (def.kind === 'ENUM') { const v = r.uint(); return def.fields.find((f) => f.value === v)?.name ?? v; }
  const obj = {};
  const field = (f) => {
    if (!f.isArray) obj[f.name] = read(r, f.type);
    else if (NATIVE[~f.type] === 'byte') obj[f.name] = r.bytes();
    else { const n = r.uint(); obj[f.name] = Array.from({ length: n }, () => read(r, f.type)); }
  };
  if (def.kind === 'STRUCT') for (const f of def.fields) field(f);
  else for (let id; (id = r.uint());) {
    const f = def.fields.find((x) => x.value === id);
    if (!f) throw new Error(`Unknown field ${id} in ${def.name}: this file is newer than the reader.`);
    field(f);
  }
  return obj;
}
const message = read(new Reader(chunks[1]), defs.findIndex((d) => d.name === 'Message'));

// Layers: a flat list with parent links → a tree, in layer order.
const id = (g) => (g ? `${g.sessionID}:${g.localID}` : '');
const hex = (c, o = 1) => '#' + [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('') + (c.a * o < 0.995 ? Math.round(c.a * o * 255).toString(16).padStart(2, '0') : '');
const round = (n) => Math.round(n * 100) / 100;
const nodes = new Map();
for (const n of message.nodeChanges ?? []) {
  if (n.phase === 'REMOVED') continue;
  const fills = (n.fillPaints ?? []).filter((p) => p.visible !== false);
  nodes.set(id(n.guid), {
    id: id(n.guid), parent: id(n.parentIndex?.guid), order: n.parentIndex?.position ?? '',
    type: n.type, name: n.name, visible: n.visible !== false, ...(n.internalOnly && { internal: true }),
    ...(n.size && { width: round(n.size.x), height: round(n.size.y) }),
    ...(n.transform && { x: round(n.transform.m02), y: round(n.transform.m12) }),
    ...(n.textData?.characters !== undefined && { text: n.textData.characters }),
    ...(n.fontName?.family && { font: `${n.fontName.family} ${n.fontName.style}`, fontSize: round(n.fontSize ?? 0) }),
    ...(n.type === 'TEXT' && n.lineHeight && { lineHeight: `${round(n.lineHeight.value)}${n.lineHeight.units === 'PERCENT' ? '%' : n.lineHeight.units === 'PIXELS' ? 'px' : ''}` }),
    ...(n.type === 'TEXT' && n.letterSpacing?.value && { letterSpacing: `${round(n.letterSpacing.value)}${n.letterSpacing.units === 'PERCENT' ? '%' : 'px'}` }),
    ...(fills.some((p) => p.type === 'SOLID') && { fills: fills.filter((p) => p.type === 'SOLID').map((p) => hex(p.color, p.opacity ?? 1)) }),
    ...(fills.some((p) => p.type === 'IMAGE') && { images: fills.filter((p) => p.type === 'IMAGE').map((p) => Buffer.from(p.image?.hash ?? []).toString('hex')) }),
    ...(n.cornerRadius && { radius: round(n.cornerRadius) }),
    ...(n.stackMode && n.stackMode !== 'NONE' && { layout: n.stackMode.toLowerCase(), gap: round(n.stackSpacing ?? 0), padding: [n.stackVerticalPadding, n.stackPaddingRight, n.stackPaddingBottom, n.stackHorizontalPadding].map((v) => round(v ?? 0)) }),
    children: [],
  });
}
const roots = [];
for (const n of nodes.values()) (nodes.get(n.parent)?.children ?? roots).push(n);
for (const n of nodes.values()) n.children.sort((a, b) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0));
const clean = (n) => { const { parent, order, children, ...rest } = n; return { ...rest, ...(children.length && { children: children.map(clean) }) }; };
const doc = roots.find((n) => n.type === 'DOCUMENT') ?? { children: roots };
fs.writeFileSync(path.join(out, 'tree.json'), JSON.stringify(doc.children.map(clean), null, 1) + '\n');

const walk = (n, fn, depth = 0) => { fn(n, depth); for (const c of n.children) walk(c, fn, depth + 1); };
const rel = path.relative(process.cwd(), out) || '.';
if (frameName) {
  const want = frameName.toLowerCase();
  const found = [];
  for (const page of doc.children) if (!page.internal) for (const f of page.children) if (f.name?.toLowerCase() === want) found.push(f);
  if (!found.length) { console.error(`No top-level frame named "${frameName}". Run without --frame for the list.`); process.exit(1); }
  for (const f of found) walk(f, (n, d) => {
    if (!n.visible) return;
    const bits = [n.width !== undefined && `${n.width}×${n.height}`, n.layout && `${n.layout} gap ${n.gap} pad ${n.padding.join(' ')}`, n.font && `${n.font} ${n.fontSize}${n.lineHeight ? '/' + n.lineHeight : ''}`, n.fills?.join(' '), n.radius && `r${n.radius}`, n.images && 'image'].filter(Boolean).join(' · ');
    console.log(`${'  '.repeat(d)}${n.type === 'TEXT' ? JSON.stringify(n.text.length > 90 ? n.text.slice(0, 90) + '…' : n.text) : n.name}  [${bits}]`);
  });
} else {
  const fonts = new Map(), colours = new Map();
  let texts = 0, images = new Set();
  console.log(`${path.basename(file)}: ${nodes.size} layers`);
  for (const page of doc.children) {
    // Figma keeps its own library page in every file; it is not the design.
    if (page.type !== 'CANVAS' || page.internal) continue;
    console.log(`\nPage "${page.name}"`);
    // Frames are the screens; loose layers beside them are notes.
    const frames = page.children.filter((f) => f.visible && /^(FRAME|SECTION|COMPONENT|COMPONENT_SET)$/.test(f.type));
    for (const f of frames) console.log(`  ${f.name}  ${f.width}×${f.height}${f.type === 'FRAME' ? '' : `  (${f.type.toLowerCase().replace('_', ' ')})`}`);
    if (page.children.length > frames.length) console.log(`  + ${page.children.length - frames.length} loose layers`);
    walk(page, (n) => {
      if (n.type === 'TEXT') { texts++; const k = `${n.font} ${n.fontSize}`; fonts.set(k, (fonts.get(k) ?? 0) + 1); }
      for (const c of n.fills ?? []) colours.set(c, (colours.get(c) ?? 0) + 1);
      for (const i of n.images ?? []) images.add(i);
    });
  }
  const top = (m, n) => [...m].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${k} (${v})`).join(', ');
  console.log(`\nText layers: ${texts}. Type styles, most used first: ${top(fonts, 16)}`);
  console.log(`Colours, most used first: ${top(colours, 16)}`);
  console.log(`Images: ${images.size}${argv.includes('--images') ? `, unpacked to ${rel}/images/ (named by hash, no extension)` : ' (--images unpacks them)'}`);
  console.log(`\nEvery layer is in ${rel}/tree.json. One frame in detail: pnpm fig <file> --frame "<name>".`);
}
