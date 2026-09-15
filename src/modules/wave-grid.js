/*!
 * WaveGrid — a pulsing pixel-grid section background (WebGL2 / GLSL).
 * Vanilla JS, no dependencies; initialized by src/index.ts.
 *
 * USAGE (auto-init): load this file with a deferred script tag, then add the
 * data-wave-grid attribute to any section. Example markup:
 *   <section class="hero" data-wave-grid> ...your content... </section>
 *
 * The bare `data-wave-grid` attribute already renders the tuned default look.
 * Override any of these (all optional) — names match the playground's "Copy settings" keys:
 *   data-cell, data-gap, data-ripples, data-speed, data-twist, data-pole-stiffness,
 *   data-wave-height, data-contrast, data-anchor, data-cell-type,
 *   data-shadow, data-highlight, data-background  (use "transparent" to show the section's own bg),
 *   data-blend  (any CSS mix-blend-mode: normal, screen, multiply, overlay, lighten, ...)
 *
 * USAGE (programmatic):
 *   const grid = WaveGrid.init('#hero', { cellType: 'circle', speed: 1.6 });
 *   grid.destroy();                 // for SPA / Barba.js page transitions
 *   WaveGrid.initAll();             // (re)scan the DOM for [data-wave-grid]
 *
 * It auto-pauses when scrolled off-screen and when the tab is hidden, respects
 * prefers-reduced-motion (renders a single static frame), caps DPR at 2, and
 * silently does nothing if WebGL2 is unavailable.
 */
export function initWaveGrid() {
  const global = window;
  "use strict";

  /* ----------------------------------------------------------------------- *
   *  Shaders
   * ----------------------------------------------------------------------- */
  var VERT =
    "#version 300 es\n" +
    "in vec2 a_pos; void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }";

  var FRAG =
    "#version 300 es\n" +
    "precision highp float;\n" +
    "out vec4 fragColor;\n" +
    "uniform vec2  u_res;\n" +
    "uniform float u_dpr, u_time, u_cell, u_gap, u_waves, u_twist, u_speed, u_falloff, u_waveHeight, u_contrast;\n" +
    "uniform int   u_anchor, u_shape, u_transparent;\n" +
    "uniform vec3  u_shadow, u_highlight, u_bg;\n" +
    "const float TAU = 6.28318530718;\n" +
    "const float REF = 1200.0;\n" +
    "float segDist(vec2 p, vec2 a, vec2 b){\n" +
    "  vec2 pa = p - a, ba = b - a;\n" +
    "  float t = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);\n" +
    "  return length(pa - ba * t);\n" +
    "}\n" +
    "void main(){\n" +
    "  vec2 P = vec2(gl_FragCoord.x, u_res.y - gl_FragCoord.y) / u_dpr;\n" + // top-left CSS px
    "  vec2 cssRes = u_res / u_dpr;\n" +
    "  float pitch = u_cell + u_gap;\n" +
    "  vec2 cellId = floor(P / pitch);\n" + // which cell
    "  vec2 norm = (cellId * pitch) / cssRes;\n" +
    "  float ec;\n" +
    "  if(u_anchor==0)      ec = norm.x;\n" +
    "  else if(u_anchor==1) ec = 1.0 - norm.x;\n" +
    "  else if(u_anchor==2) ec = norm.y;\n" +
    "  else if(u_anchor==3) ec = 1.0 - norm.y;\n" +
    "  else                 ec = 1.0;\n" +
    "  float env = (u_anchor==4) ? 1.0 : pow(clamp(ec, 0.0, 1.0), u_falloff);\n" +
    "  bool vertical = (u_anchor==2 || u_anchor==3);\n" +
    "  float axisPx  = vertical ? cellId.y * pitch : cellId.x * pitch;\n" +
    "  float crossPx = vertical ? cellId.x * pitch : cellId.y * pitch;\n" +
    "  float fM = u_waves / REF;\n" +
    "  float fC = u_twist / REF;\n" +
    "  float ph = axisPx*fM*TAU - u_time*u_speed + crossPx*fC*TAU;\n" +
    "  float h  = (sin(ph) + 0.5*sin(ph*2.17 + crossPx*fC*TAU*1.7)) / 1.5;\n" +
    "  h *= env;\n" +
    "  float disp = h * u_waveHeight;\n" +
    "  vec2 center = (cellId + 0.5) * pitch + vec2(0.0, disp);\n" +
    "  vec2 d = P - center;\n" +
    "  float R = u_cell * 0.5;\n" +
    "  float sd;\n" +
    "  if(u_shape==0){ vec2 a = abs(d); sd = max(a.x, a.y) - R; }\n" +
    "  else if(u_shape==1){ sd = length(d) - R; }\n" +
    "  else if(u_shape==2){ sd = (abs(d.x) + abs(d.y)) - R; }\n" +
    "  else if(u_shape==3){ float w = max(1.0, u_cell*0.2); sd = abs(length(d) - (R - w*0.5)) - w*0.5; }\n" +
    "  else { float w = max(1.0, u_cell*0.34); float a = h*1.4; vec2 dir = vec2(cos(a), sin(a))*R; sd = segDist(d, -dir, dir) - w*0.5; }\n" +
    "  float aa = fwidth(sd) + 1e-4;\n" +
    "  float cov = 1.0 - smoothstep(-aa, aa, sd);\n" +
    "  float b = clamp(0.5 + 0.5*h*u_contrast, 0.0, 1.0);\n" +
    "  vec3 cellColor = mix(u_shadow, u_highlight, b);\n" +
    "  if(u_transparent==1) fragColor = vec4(cellColor, cov);\n" +
    "  else fragColor = vec4(mix(u_bg, cellColor, cov), 1.0);\n" +
    "}";

  /* ----------------------------------------------------------------------- *
   *  Defaults + lookups
   * ----------------------------------------------------------------------- */
  var DEFAULTS = {
    cell: 2,
    gap: 10,
    ripples: 1,
    speed: 1.5,
    twist: 1,
    poleStiffness: 1,
    waveHeight: 3,
    contrast: 2,
    anchor: "bottom",
    cellType: "diamond",
    shadow: "#1d1d1d",
    highlight: "#707070",
    background: "transparent",
    blend: "normal",
  };
  var ANCHOR = { left: 0, right: 1, top: 2, bottom: 3, none: 4 };
  var SHAPE = { square: 0, circle: 1, diamond: 2, ring: 3, line: 4 };
  var UNIFORMS = [
    "res",
    "dpr",
    "time",
    "cell",
    "gap",
    "waves",
    "twist",
    "speed",
    "falloff",
    "waveHeight",
    "contrast",
    "anchor",
    "shape",
    "transparent",
    "shadow",
    "highlight",
    "bg",
  ];

  function hexToRGB(hex) {
    var h = String(hex).trim().replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    if (isNaN(n)) n = 0;
    return new Float32Array([
      ((n >> 16) & 255) / 255,
      ((n >> 8) & 255) / 255,
      (n & 255) / 255,
    ]);
  }

  function readOptions(el, overrides) {
    var d = el.dataset,
      o = {};
    function num(v, def) {
      return v == null || v === "" ? def : parseFloat(v);
    }
    function str(v, def) {
      return v == null || v === "" ? def : String(v);
    }
    o.cell = num(d.cell, DEFAULTS.cell);
    o.gap = num(d.gap, DEFAULTS.gap);
    o.ripples = num(d.ripples, DEFAULTS.ripples);
    o.speed = num(d.speed, DEFAULTS.speed);
    o.twist = num(d.twist, DEFAULTS.twist);
    o.poleStiffness = num(d.poleStiffness, DEFAULTS.poleStiffness);
    o.waveHeight = num(d.waveHeight, DEFAULTS.waveHeight);
    o.contrast = num(d.contrast, DEFAULTS.contrast);
    o.anchor = str(d.anchor, DEFAULTS.anchor);
    o.cellType = str(d.cellType, DEFAULTS.cellType);
    o.shadow = str(d.shadow, DEFAULTS.shadow);
    o.highlight = str(d.highlight, DEFAULTS.highlight);
    o.background = str(d.background, DEFAULTS.background);
    o.blend = str(d.blend, DEFAULTS.blend);
    if (overrides)
      for (var k in overrides)
        if (overrides.hasOwnProperty(k)) o[k] = overrides[k];
    return o;
  }

  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn("[WaveGrid] shader compile:\n" + gl.getShaderInfoLog(s));
    }
    return s;
  }

  /* ----------------------------------------------------------------------- *
   *  Instance
   * ----------------------------------------------------------------------- */
  function createInstance(el, overrides) {
    if (el.__waveGrid) return el.__waveGrid; // never double-init

    var opts = readOptions(el, overrides);
    var transparent = String(opts.background).toLowerCase() === "transparent";

    // make the element a positioned, isolated stacking context so the canvas
    // can sit behind content without touching the content's own styles.
    if (getComputedStyle(el).position === "static")
      el.style.position = "relative";
    el.style.isolation = "isolate";

    var canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    var cstyle = canvas.style;
    cstyle.position = "absolute";
    cstyle.top = "0";
    cstyle.left = "0";
    cstyle.width = "100%";
    cstyle.height = "100%";
    cstyle.zIndex = "-1";
    cstyle.pointerEvents = "none";
    cstyle.display = "block";
    cstyle.mixBlendMode = opts.blend;
    el.prepend(canvas);

    var gl = canvas.getContext("webgl2", {
      alpha: transparent,
      antialias: false,
      premultipliedAlpha: false,
    });
    if (!gl) {
      console.warn("[WaveGrid] WebGL2 unavailable — effect skipped.");
      var noop = {
        el: el,
        canvas: canvas,
        destroy: function () {
          canvas.remove();
          el.style.isolation = "";
          delete el.__waveGrid;
        },
      };
      el.__waveGrid = noop;
      return noop;
    }

    var program = gl.createProgram();
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn(
        "[WaveGrid] program link:\n" + gl.getProgramInfoLog(program)
      );
    }

    var vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );
    var loc = gl.getAttribLocation(program, "a_pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    var U = {};
    for (var i = 0; i < UNIFORMS.length; i++)
      U[UNIFORMS[i]] = gl.getUniformLocation(program, "u_" + UNIFORMS[i]);

    if (transparent) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0);
    }

    var shadow = hexToRGB(opts.shadow);
    var highlight = hexToRGB(opts.highlight);
    var bg = hexToRGB(transparent ? "#000000" : opts.background);
    var anchor = ANCHOR[opts.anchor] != null ? ANCHOR[opts.anchor] : 0;
    var shape = SHAPE[opts.cellType] != null ? SHAPE[opts.cellType] : 2;

    var cw = 0,
      ch = 0,
      dpr = 1,
      raf = 0,
      simTime = 0,
      lastNow = null;
    var inView = true,
      visible = true;
    var reduced = global.matchMedia
      ? global.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

    function frame() {
      if (transparent) gl.clear(gl.COLOR_BUFFER_BIT);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(program);
      gl.bindVertexArray(vao);
      gl.uniform2f(U.res, canvas.width, canvas.height);
      gl.uniform1f(U.dpr, dpr);
      gl.uniform1f(U.time, simTime);
      gl.uniform1f(U.cell, opts.cell);
      gl.uniform1f(U.gap, opts.gap);
      gl.uniform1f(U.waves, opts.ripples);
      gl.uniform1f(U.twist, opts.twist);
      gl.uniform1f(U.speed, opts.speed);
      gl.uniform1f(U.falloff, opts.poleStiffness);
      gl.uniform1f(U.waveHeight, opts.waveHeight);
      gl.uniform1f(U.contrast, opts.contrast);
      gl.uniform1i(U.anchor, anchor);
      gl.uniform1i(U.shape, shape);
      gl.uniform1i(U.transparent, transparent ? 1 : 0);
      gl.uniform3fv(U.shadow, shadow);
      gl.uniform3fv(U.highlight, highlight);
      gl.uniform3fv(U.bg, bg);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function running() {
      return !reduced && inView && visible;
    }

    function loop(now) {
      raf = requestAnimationFrame(loop);
      if (!running()) {
        lastNow = null;
        return;
      }
      if (lastNow != null) simTime += (now - lastNow) / 1000;
      lastNow = now;
      frame();
    }

    function resize() {
      var r = el.getBoundingClientRect();
      cw = r.width;
      ch = r.height;
      dpr = Math.min(global.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(cw * dpr));
      canvas.height = Math.max(1, Math.round(ch * dpr));
      frame();
    }

    var ro = new ResizeObserver(resize);
    ro.observe(el);
    var io = new IntersectionObserver(
      function (entries) {
        inView = entries[0].isIntersecting;
      },
      { threshold: 0 }
    );
    io.observe(el);
    function onVisibility() {
      visible = document.visibilityState === "visible";
    }
    document.addEventListener("visibilitychange", onVisibility);

    resize();
    if (reduced) frame(); // single static frame
    else raf = requestAnimationFrame(loop);

    var api = {
      el: el,
      canvas: canvas,
      destroy: function () {
        if (raf) cancelAnimationFrame(raf);
        ro.disconnect();
        io.disconnect();
        document.removeEventListener("visibilitychange", onVisibility);
        var lose = gl.getExtension("WEBGL_lose_context");
        if (lose) lose.loseContext();
        canvas.remove();
        el.style.isolation = "";
        delete el.__waveGrid;
      },
    };
    el.__waveGrid = api;
    return api;
  }

  /* ----------------------------------------------------------------------- *
   *  Public API
   * ----------------------------------------------------------------------- */
  var WaveGrid = {
    defaults: DEFAULTS,
    init: function (target, options) {
      var el =
        typeof target === "string" ? document.querySelector(target) : target;
      return el ? createInstance(el, options) : null;
    },
    initAll: function (selector, options) {
      var els = document.querySelectorAll(selector || "[data-wave-grid]");
      var out = [];
      for (var i = 0; i < els.length; i++)
        if (!els[i].__waveGrid) out.push(createInstance(els[i], options));
      return out;
    },
  };

  global.WaveGrid = WaveGrid;
  WaveGrid.initAll();
  return WaveGrid;
}
