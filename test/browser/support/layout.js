// From spike-html-hosting-icons (8b8d955): dist/octicon/x-16.js; Octicons, primer/octicons, MIT.
// The page layout cases' in-page half, imported into test/fixtures/layout.html: it fills the body
// with a header and main and measures the page's geometry under each page type, as plain JSON for
// evaluate(); the constants are also read on node.
// See docs/testing.md

import { declarations } from "./computed-styles.js";

/** The sheet under test, whose every declaration drops() drops in turn. */
export const SHEET = "layout.css";

/** The page types, each a body class. */
export const TYPES = ["page-app", "page-prose"];

const X =
  `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16" ` +
  `aria-hidden="true" focusable="false"><path fill="currentColor" d="M3.72 3.72a.75.75 0 0 1 ` +
  `1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326a.75.75 0 0 1-.215.734L9.06 8l3.22 3.22a.749` +
  `.749 0 0 1-.326 1.275a.75.75 0 0 1-.734-.215L8 9.06l-3.22 3.22a.75.75 0 0 1-1.042-.018a.75.75 ` +
  `0 0 1-.018-1.042L6.94 8L3.72 4.78a.75.75 0 0 1 0-1.06"/></svg>`;

const glyphButton = (name, key) =>
  `<button type="button" class="glyph-button" aria-label="${name}" data-part="button">${X}` +
  (key ? `<span aria-hidden="true"><kbd>${key}</kbd></span>` : "") +
  `</button>`;

/** The case: the body's header and main, and a fixed probe that reads the tokens, 80ch, and 100dvh. */
export const MARKUP = `
  <header data-part="header">
    <strong data-part="title">Layout</strong>
    <div class="header-actions" data-part="actions">
      ${glyphButton("Help", "?")}${glyphButton("Settings", "S")}${glyphButton("Pages", "P")}${glyphButton("Close")}
    </div>
  </header>
  <main data-part="main">
    <h1 data-part="heading">A page</h1>
    <p data-part="lede">A lede, one short line.</p>
    <section data-part="section"><h2>One</h2><p>The first section.</p></section>
    <section data-part="section"><h2>Two</h2><p>The second section.</p></section>
    <div class="app-full" data-part="full">On the full lines.</div>
  </main>
  <div data-part="probe" aria-hidden="true" style="position: fixed; visibility: hidden; inline-size: 80ch; block-size: 100dvh; padding: var(--space-m) var(--space-s) var(--space-2xs) var(--space-xl); margin-block-start: var(--space-2xl)"></div>
`;

/** Fills the body with the case. */
export function fill() {
  document.body.innerHTML = MARKUP;
}

const round = (n) => Math.round(n * 64) / 64;

const box = (element) => {
  const r = element.getBoundingClientRect();
  return { left: round(r.left), top: round(r.top), right: round(r.right), bottom: round(r.bottom) };
};

const part = (name) => document.querySelector(`[data-part="${name}"]`);
const parts = (name) => [...document.querySelectorAll(`[data-part="${name}"]`)];

function page(type) {
  const { classList } = document.body;
  const before = TYPES.filter((t) => classList.contains(t));
  classList.remove(...TYPES);
  classList.add(type);
  const root = document.documentElement;
  const out = {
    viewport: { width: root.clientWidth, height: root.clientHeight },
    scroll: { width: root.scrollWidth, height: root.scrollHeight },
    body: box(document.body),
    header: box(part("header")),
    title: box(part("title")),
    actions: box(part("actions")),
    buttons: parts("button").map(box),
    main: box(part("main")),
    heading: box(part("heading")),
    lede: box(part("lede")),
    sections: parts("section").map(box),
    full: box(part("full")),
  };
  classList.remove(type);
  classList.add(...before);
  return out;
}

/** Each page type's geometry, by type, and the tokens the probe reads, in px. */
export function measure() {
  const probe = part("probe");
  const style = getComputedStyle(probe);
  return {
    tokens: {
      m: parseFloat(style.paddingTop),
      s: parseFloat(style.paddingRight),
      "2xs": parseFloat(style.paddingBottom),
      xl: parseFloat(style.paddingLeft),
      "2xl": parseFloat(style.marginTop),
      ch80: round(probe.getBoundingClientRect().width),
      dvh: round(probe.getBoundingClientRect().height),
    },
    ...Object.fromEntries(TYPES.map((type) => [type, page(type)])),
  };
}

function* rules(list) {
  for (const rule of list) {
    yield rule;
    if (rule.cssRules) yield* rules(rule.cssRules);
  }
}

/** Drops each declaration of the sheet under test in turn, reporting whether measure() differs. */
export function drops(reference) {
  const tried = [];
  const sheet = [...document.styleSheets].find((s) => s.href?.endsWith(`/${SHEET}`));
  for (const rule of rules(sheet.cssRules)) {
    if (!(rule instanceof CSSStyleRule)) continue;
    const whole = rule.style.cssText;
    const list = declarations(whole);
    for (const [i, declaration] of list.entries()) {
      rule.style.cssText = list.filter((_, j) => j !== i).join("; ");
      try {
        const differs = JSON.stringify(measure()) !== JSON.stringify(reference);
        tried.push({ selector: rule.selectorText, declaration, differs });
      } finally {
        rule.style.cssText = whole;
      }
    }
  }
  return tried;
}
