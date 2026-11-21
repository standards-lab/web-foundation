// From spike-html-apps-foundation (07ba39a): test/fixtures/flash-recorder.js.
// Adapted from spike-html-design (fe75220): test/fixtures/flash-blocking.html, its inline script.

window.flash = { paint: null, applied: null };
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.name === "first-paint") window.flash.paint ??= entry.startTime;
  }
}).observe({ type: "paint", buffered: true });
new MutationObserver(() => {
  if (document.documentElement.hasAttribute("data-palette")) {
    window.flash.applied ??= performance.now();
  }
}).observe(document.documentElement, { attributes: true });
