// Types for the Finsweet Attributes distribution files that
// src/modules/finsweet-registry.ts imports (the package ships JavaScript
// only). Each exports init(), which starts the attribute on the current
// page, and its version.
declare module '@finsweet/attributes/dist/*' {
  export const init: () =>
    | Promise<{ result?: unknown; destroy?: () => void } | void>
    | { result?: unknown; destroy?: () => void }
    | void;
  export const version: string;
}
