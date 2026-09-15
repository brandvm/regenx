// Drive the real WebGL renderer with deterministic frames and visibility events.
// This also supports byte-for-byte comparisons with a saved pre-change source.
export async function renderWave(page, source, { options = {}, dpr = 1 } = {}) {
  return page.evaluate(({ source, options, dpr }) => {
    document.body.innerHTML = '<section id="wave" style="width:192px;height:112px"></section>';
    let ratio = dpr, visible = true, nextId = 0, draws = 0;
    const pending = new Map(), resizes = [], intersections = [];
    const uploads = {}, locations = new WeakMap();
    Object.defineProperty(window, 'devicePixelRatio', { get: () => ratio });
    Object.defineProperty(document, 'visibilityState', { get: () => visible ? 'visible' : 'hidden' });
    window.requestAnimationFrame = fn => { pending.set(++nextId, fn); return nextId; };
    window.cancelAnimationFrame = id => pending.delete(id);
    window.ResizeObserver = class { constructor(fn) { resizes.push(fn); } observe() {} disconnect() {} };
    window.IntersectionObserver = class { constructor(fn) { intersections.push(fn); } observe() {} disconnect() {} };
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, opts) {
      return getContext.call(this, type, { ...opts, preserveDrawingBuffer: true });
    };
    const proto = WebGL2RenderingContext.prototype;
    const getLocation = proto.getUniformLocation;
    proto.getUniformLocation = function (program, name) {
      const loc = getLocation.call(this, program, name);
      if (loc) locations.set(loc, name);
      return loc;
    };
    for (const method of ['uniform1f', 'uniform1i', 'uniform2f', 'uniform3fv']) {
      const original = proto[method];
      proto[method] = function (loc, ...args) {
        const name = locations.get(loc);
        uploads[name] = (uploads[name] || 0) + 1;
        return original.call(this, loc, ...args);
      };
    }
    const draw = proto.drawArrays;
    proto.drawArrays = function (...args) { draws++; return draw.apply(this, args); };
    // The source is the local module under test, with its export removed.
    (0, eval)(source.replace('export function initWaveGrid()', 'function initWaveGrid()') + '\ninitWaveGrid();');
    const el = document.getElementById('wave');
    const api = window.WaveGrid.init(el, options);
    const gl = api.canvas.getContext('webgl2');
    if (!gl) throw new Error('WebGL2 is required for renderer verification');
    const frames = [];
    function snapshot(label) {
      const { width, height } = api.canvas;
      const pixels = new Uint8Array(width * height * 4);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      let binary = '';
      for (let i = 0; i < pixels.length; i += 16384) binary += String.fromCharCode(...pixels.subarray(i, i + 16384));
      frames.push({ label, width, height, pixels: btoa(binary) });
    }
    function frame(now, label) {
      const callbacks = [...pending.values()]; pending.clear();
      callbacks.forEach(fn => fn(now));
      if (label) snapshot(label);
    }
    snapshot('initial');
    frame(0);
    frame(1000, 'animated');
    intersections.forEach(fn => fn([{ isIntersecting: false }]));
    frame(1500, 'offscreen');
    intersections.forEach(fn => fn([{ isIntersecting: true }]));
    frame(2000, 'reentered');
    frame(2050, 'resumed');
    visible = false; document.dispatchEvent(new Event('visibilitychange'));
    frame(3000, 'hidden');
    visible = true; document.dispatchEvent(new Event('visibilitychange'));
    frame(4000);
    frame(4100, 'visible');
    ratio = 3;
    el.style.width = '160px'; el.style.height = '96px';
    resizes.forEach(fn => fn([]));
    snapshot('resized');
    const glError = gl.getError();
    api.destroy();
    return { frames, uploads, draws, glError, destroyed: !el.querySelector('canvas') && pending.size === 0 };
  }, { source, options, dpr });
}
