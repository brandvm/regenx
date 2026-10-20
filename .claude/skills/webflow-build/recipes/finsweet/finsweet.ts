// Finsweet Attributes v2, bundled from the pinned npm release, so Webflow
// needs no `<script src="…@finsweet/attributes…">` tag. The attributes this
// project uses are listed in ./finsweet-registry.ts, which `pnpm finsweet
// add <name>` writes; only those are bundled. Markup stays exactly as the
// Finsweet docs describe (fs-list-element, fs-combobox-element…).
//
// This replaces the CDN loader: it creates the same window.FinsweetAttributes
// host (modules read `scripts` and wait on each other through
// `modules.<name>.loading`), finds which registered attributes the page
// uses, and starts only those. Lessons: webflow-build › lessons/js.md
// (Finsweet Combo Box).
import { registry, FINSWEET_VERSION } from './finsweet-registry';

type Started = { result?: unknown; destroy?: () => void } | void;
export type FinsweetModule = { init: () => Promise<Started> | Started; version?: string };
type Entry = {
  loading?: Promise<unknown>;
  resolve?: (value: unknown) => void;
  version?: string;
  destroy?: () => void;
  restart?: () => Promise<unknown>;
};
type Host = {
  version: string;
  scripts: HTMLScriptElement[];
  modules: Record<string, Entry>;
  process: Set<string>;
  load: (name: string) => Promise<unknown>;
  push: (...items: [string, (result: unknown) => void][]) => void;
  destroy: () => void;
};
type FinsweetWindow = typeof window & { FinsweetAttributes?: Host | [string, (result: unknown) => void][] };

function host(): Host {
  const w = window as FinsweetWindow;
  if (w.FinsweetAttributes && !Array.isArray(w.FinsweetAttributes)) return w.FinsweetAttributes;
  const queued = Array.isArray(w.FinsweetAttributes) ? w.FinsweetAttributes : [];
  const h: Host = {
    version: FINSWEET_VERSION,
    scripts: [],
    modules: {},
    process: new Set(),
    load: loadAttribute,
    push(...items) {
      for (const [name, callback] of items) void this.modules[name]?.loading?.then(callback);
    },
    destroy() {
      for (const name in this.modules) this.modules[name]?.destroy?.();
    },
  };
  w.FinsweetAttributes = h;
  h.push(...queued);
  return h;
}

// Start one attribute (once per page) and resolve with its result, e.g. the
// List instances. Other modules can await it: loadAttribute('list').
export function loadAttribute(name: string): Promise<unknown> {
  const h = host();
  const entry = (h.modules[name] ||= {});
  if (h.process.has(name)) return entry.loading ?? Promise.resolve();
  h.process.add(name);
  entry.loading = new Promise((resolve) => (entry.resolve = resolve));
  const importer = registry[name];
  if (!importer) {
    console.warn(`[finsweet] "${name}" is not bundled: run pnpm finsweet add ${name}`);
    entry.resolve?.(undefined);
    return entry.loading;
  }
  void importer()
    .then(async ({ init, version }) => {
      const started = ((await init()) || {}) as Exclude<Started, void>;
      entry.version = version;
      entry.destroy = () => {
        started.destroy?.();
        h.process.delete(name);
      };
      entry.restart = () => {
        entry.destroy?.();
        return loadAttribute(name);
      };
      entry.resolve?.(started.result);
    })
    .catch((error: unknown) => {
      // The page still works without the enhancement (e.g. a list in CMS order).
      console.warn(`[finsweet] ${name} unavailable`, error);
      entry.resolve?.(undefined);
    });
  return entry.loading;
}

// Registered attributes this page uses: any element with an fs-<name>…
// attribute, as the CDN loader's auto mode detects them.
function usedOnPage(): string[] {
  const names = new Set(Object.keys(registry));
  const found = new Set<string>();
  for (const el of document.querySelectorAll('*')) {
    for (const attr of el.getAttributeNames()) {
      const name = attr.match(/^fs-([^-]+)/)?.[1];
      if (name && names.has(name)) found.add(name);
    }
  }
  return [...found];
}

export function initFinsweet() {
  if (!Object.keys(registry).length) return;
  // Deferred a microtask so modules that run after this one can still set
  // attributes the Finsweet init must see.
  void Promise.resolve().then(() => usedOnPage().forEach((name) => void loadAttribute(name)));
}

// For page transitions: destroy every started attribute so the next page's
// markup gets fresh instances.
export function resetFinsweet() {
  const w = window as FinsweetWindow;
  if (w.FinsweetAttributes && !Array.isArray(w.FinsweetAttributes)) {
    w.FinsweetAttributes.destroy();
    w.FinsweetAttributes.modules = {};
  }
}
