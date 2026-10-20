// @barba/core 2.10.x declares a "types" path (dist/core/src/typings) that
// the package doesn't publish, so TypeScript finds no declarations. This
// covers the part of the API transition.ts uses. Copy to src/.
// Recipe: webflow-build recipes/barba.
declare module '@barba/core' {
  interface BarbaPage {
    container: HTMLElement;
    html: string;
    namespace: string;
    url: { href: string; path?: string; hash?: string };
  }
  interface BarbaData {
    current: BarbaPage;
    next: BarbaPage;
    trigger: HTMLElement | 'barba' | 'back' | 'forward' | 'popstate';
  }
  type Rule = { namespace?: string[]; custom?: (data: BarbaData) => boolean };
  interface BarbaTransition {
    name?: string;
    sync?: boolean;
    // A `custom` at the root is overwritten by the `to` / `from` check
    // whenever those are set: put it inside `to` or `from`.
    from?: Rule;
    to?: Rule;
    custom?: (data: BarbaData) => boolean;
    once?: (data: BarbaData) => Promise<unknown> | void;
    leave?: (data: BarbaData) => Promise<unknown> | void;
    enter?: (data: BarbaData) => Promise<unknown> | void;
  }
  type Hook = (fn: (data: BarbaData) => unknown) => void;
  const barba: {
    init(options: {
      debug?: boolean;
      timeout?: number;
      preventRunning?: boolean;
      prevent?: (args: { el: HTMLElement; href: string; event: Event }) => boolean;
      transitions?: BarbaTransition[];
    }): void;
    hooks: {
      beforeLeave: Hook;
      afterLeave: Hook;
      beforeEnter: Hook;
      enter: Hook;
      afterEnter: Hook;
    };
  };
  export default barba;
}
