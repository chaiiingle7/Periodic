// Loads the Liquid Glass JS library (https://github.com/dashersw/liquid-glass-js)
// on demand, and tells callers whether it's usable. It is a *progressive
// enhancement*: if WebGL2 or the library files aren't available (offline, an
// old browser, blocked CDN), the site simply keeps its CSS frosted-glass look.
//
// For fully offline use, download these 4 files into frontend/public/vendor/
//   container.js, button.js, glass.css   (from the liquid-glass-js repo)
//   html2canvas.min.js                    (from html2canvas 1.4.1)
// They're picked up automatically; otherwise the CDN copies are used.

const CDN_LG = "https://cdn.jsdelivr.net/gh/dashersw/liquid-glass-js@main";
const CDN_H2C = "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";

// Visual tuning for the WebGL layer (blur strength inside the library lives in
// its container.js; these are the knobs its constructor exposes).
export const GLASS_TUNING = { navTint: 0.10, cardTint: 0.16 };

let loading = null;

async function isReal(url, typePattern) {
  try {
    const r = await fetch(url, { method: "GET" });
    return r.ok && typePattern.test(r.headers.get("content-type") || "");
  } catch (_) {
    return false;
  }
}

function addScript(src) {
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = false;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
}

function addCss(href) {
  return new Promise((resolve) => {
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = href;
    l.onload = () => resolve(true);
    l.onerror = () => resolve(false);
    document.head.appendChild(l);
  });
}

// `class Container {}` in a classic <script> is a global *binding*, not a
// window property — so look it up in the global scope, not on window.
export function getContainerClass() {
  try {
    return new Function("return typeof Container !== 'undefined' ? Container : null")();
  } catch (_) {
    return null;
  }
}

async function load() {
  if (typeof window === "undefined" || !window.WebGL2RenderingContext) return false;
  if (getContainerClass()) return true;

  const jsLocal = (f) => isReal(`/vendor/${f}`, /javascript/i);
  if (typeof window.html2canvas !== "function") {
    const ok = (await jsLocal("html2canvas.min.js")) ? await addScript("/vendor/html2canvas.min.js") : false;
    if (!ok && typeof window.html2canvas !== "function") await addScript(CDN_H2C);
  }
  if (typeof window.html2canvas !== "function") return false;

  const cssOk = (await isReal("/vendor/glass.css", /css/i)) ? await addCss("/vendor/glass.css") : false;
  if (!cssOk) await addCss(`${CDN_LG}/glass.css`);

  for (const f of ["container.js", "button.js"]) {
    const ok = (await jsLocal(f)) ? await addScript(`/vendor/${f}`) : false;
    if (!ok) await addScript(`${CDN_LG}/${f}`);
  }
  return !!getContainerClass();
}

export function loadLiquidGlass() {
  if (!loading) loading = load().catch(() => false);
  return loading;
}
