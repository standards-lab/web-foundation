// The utilities cases' in-page half, imported into test/fixtures/utilities.html: it lays out one
// case per utility class, in the light DOM or a shadow root, and measures each case's geometry, as
// plain JSON for evaluate(); the constants are also read on node.
// See docs/testing.md.

import { declarations } from "./computed-styles.js";

/** The utility classes the foundation adds to v0.7.0's tools. */
export const ADDED_UTILITIES = [
  "list-bare",
  "text-nowrap",
  "text-numeric",
  "text-break",
  "text-truncate",
  "scroll-frame",
  "alternatives",
  "head-row",
  "head-name",
  "head-end",
  "text-quiet-s",
  "text-quiet-xs",
  "status-line",
  "visually-hidden",
];

/** The sheets a shadow root adopts, in order. */
export const ADOPTED = [
  "baseline/reset.css",
  "baseline/elements.css",
  "utilities.css",
  "motion.css",
];

const frame = (style) =>
  `<div style="display: flex; flex-direction: column; ${style}">` +
  `<div class="scroll-frame"><div>1<br />2<br />3<br />4</div></div></div>`;

const fitted = (text) =>
  `<div style="inline-size: 20ch"><div style="inline-size: fit-content">` +
  `<div style="display: flex; flex-direction: column"><div class="scroll-frame">` +
  `<div style="white-space: nowrap">${text}</div></div></div></div></div>`;

const head = (width, name, label) =>
  `<div style="inline-size: ${width}"><div class="head-row"><span class="head-name">${name}</span>` +
  `<span class="head-end text-quiet-xs">${label}</span></div></div>`;

/** Every case, each a [data-case] element, its parts [data-part]. */
export const MARKUP = `
  <div data-case="list">
    <p data-part="before">Before</p>
    <ul class="list-bare" data-part="list"><li>One</li><li>Two</li></ul>
  </div>
  <div data-case="nowrap" style="inline-size: 10ch">
    <span class="text-nowrap" data-part="text">several short words on one line</span>
  </div>
  <div data-case="numeric" style="inline-size: 4ch">
    <span class="text-numeric" data-part="text">1 234 567</span>
  </div>
  <p data-case="break-short" style="inline-size: 20ch">
    Type <span class="text-break" data-part="value">build-2026-11-19-final</span>
  </p>
  <p data-case="break-long" style="inline-size: 20ch">
    Id <span class="text-break" data-part="value">${"a".repeat(40)}</span>
  </p>
  <div data-case="truncate" class="text-truncate" style="inline-size: 10ch">
    a name much longer than its box
  </div>
  <div data-case="frame-auto">${frame("")}</div>
  <div data-case="frame-held">${frame("max-block-size: 2lh")}</div>
  <div data-case="frame-tall">${frame("block-size: 8lh")}</div>
  <div data-case="frame-short">${fitted("short")}</div>
  <div data-case="frame-long">${fitted("x".repeat(60))}</div>
  <div data-case="alternatives">
    <span class="alternatives" data-part="cell"
      ><span data-part="shown">Send</span
      ><span aria-hidden="true" data-part="hidden">Stop generating</span></span
    >
  </div>
  <div data-case="head-short">${head("15ch", "a.txt", "done")}</div>
  <div data-case="head-wide">${head("40ch", "a-long-file-name.pdf", "complete")}</div>
  <div data-case="head-basis">${head("30ch", "a-long-file-name-here-too.pdf", "complete")}</div>
  <div data-case="head-narrow">${head("20ch", "a-long-file-name-here-too.pdf", "complete")}</div>
  <div data-case="head-unbroken">${head("20ch", "x".repeat(30), "done")}</div>
  <div data-case="quiet">
    <span class="text-quiet-s" data-part="s">small</span>
    <span class="text-quiet-xs" data-part="xs">smallest</span>
    <i data-part="probe-s" style="font-size: var(--text-s); color: var(--fg-2)">probe</i>
    <i data-part="probe-xs" style="font-size: var(--text-xs); color: var(--fg-2)">probe</i>
  </div>
  <div data-case="status">
    <p class="status-line" role="status" data-part="blank"></p>
    <p class="status-line" role="status" data-part="filled">Loaded 3 documents</p>
  </div>
  <div data-case="hidden" style="position: relative; overflow: auto; inline-size: 10ch">
    <span data-part="before">Before</span
    ><span class="visually-hidden" data-part="label">a hidden label of several words</span
    ><span data-part="after">After</span>
  </div>
  <div data-case="hidden-control" style="position: relative; overflow: auto; inline-size: 10ch">
    <span data-part="before">Before</span><span data-part="after">After</span>
  </div>
`;

const find = (root, name, part) => {
  const box = root.querySelector(`[data-case="${name}"]`);
  return part ? box.querySelector(`[data-part="${part}"]`) : box;
};

const box = (element, origin) => {
  const r = element.getBoundingClientRect();
  const o = origin.getBoundingClientRect();
  const round = (n) => Math.round(n * 64) / 64;
  return {
    left: round(r.left - o.left),
    top: round(r.top - o.top),
    width: round(r.width),
    height: round(r.height),
  };
};

const hit = (root, element, dx, dy) => {
  element.scrollIntoView({ block: "center" });
  const r = element.getBoundingClientRect();
  const found = root.elementFromPoint(r.left + dx, r.top + dy);
  return found?.dataset.part ?? found?.localName ?? null;
};

const textWidth = (element) => {
  const range = document.createRange();
  range.selectNodeContents(element);
  const whiteSpace = element.style.whiteSpace;
  element.style.whiteSpace = "nowrap";
  const width = range.getBoundingClientRect().width;
  element.style.whiteSpace = whiteSpace;
  return Math.round(width * 64) / 64;
};

/** Every case's geometry under the root, a document or a shadow root holding MARKUP. */
export function measure(root) {
  const out = {};
  const line = (element) => parseFloat(getComputedStyle(element).lineHeight);

  {
    const list = find(root, "list", "list");
    const [first, second] = list.children;
    out.list = {
      indent: box(first, list).left,
      step: box(second, list).top - box(first, list).height,
      marker: getComputedStyle(first).listStyleType,
      blockStep: box(list, find(root, "list")).top - box(find(root, "list", "before"), list).height,
    };
  }
  for (const name of ["nowrap", "numeric"]) {
    const text = find(root, name, "text");
    out[name] = {
      fragments: text.getClientRects().length,
      overflows: box(text, find(root, name)).width > find(root, name).clientWidth,
      digits: getComputedStyle(text).fontVariantNumeric,
    };
  }
  for (const name of ["break-short", "break-long"]) {
    const p = find(root, name);
    const value = find(root, name, "value");
    out[name] = {
      fragments: value.getClientRects().length,
      ...box(value, p),
      lines: Math.round(box(value, p).height / line(p)),
      line: line(p),
      lineWidth: p.clientWidth,
    };
  }
  {
    const element = find(root, "truncate");
    element.scrollIntoView({ block: "center" });
    const r = element.getBoundingClientRect();
    out.truncate = {
      lines: Math.round(r.height / line(element)),
      overflows: element.scrollWidth > element.clientWidth,
      past: root.elementFromPoint(r.right + 8, r.top + r.height / 2) === element,
      ending: getComputedStyle(element).textOverflow,
    };
  }
  for (const name of ["frame-auto", "frame-held", "frame-tall", "frame-short", "frame-long"]) {
    const host = find(root, name).querySelector(".scroll-frame").parentElement;
    const frameElement = host.firstElementChild;
    const content = frameElement.firstElementChild;
    out[name] = {
      host: box(host, find(root, name)),
      frame: box(frameElement, find(root, name)),
      content: box(content, find(root, name)),
      scrollsDown: frameElement.scrollHeight > frameElement.clientHeight,
      scrollsAcross: frameElement.scrollWidth > frameElement.clientWidth,
      limit: box(find(root, name).firstElementChild, find(root, name)).width,
      line: line(frameElement),
    };
  }
  {
    const cell = find(root, "alternatives", "cell");
    const shown = find(root, "alternatives", "shown");
    const hidden = find(root, "alternatives", "hidden");
    out.alternatives = {
      cell: box(cell, cell),
      shown: box(shown, cell),
      hidden: box(hidden, cell),
      shownText: textWidth(shown),
      hiddenText: textWidth(hidden),
      hit: hit(root, hidden, textWidth(hidden) - 2, 2),
    };
  }
  for (const name of ["head-short", "head-wide", "head-basis", "head-narrow", "head-unbroken"]) {
    const row = find(root, name).querySelector(".head-row");
    const nameElement = row.querySelector(".head-name");
    const end = row.querySelector(".head-end");
    out[name] = {
      row: box(row, row),
      name: box(nameElement, row),
      end: box(end, row),
      nameText: textWidth(nameElement),
    };
  }
  {
    const read = (part) => {
      const style = getComputedStyle(find(root, "quiet", part));
      return { size: style.fontSize, color: style.color };
    };
    out.quiet = {
      s: read("s"),
      xs: read("xs"),
      probeS: read("probe-s"),
      probeXs: read("probe-xs"),
    };
  }
  {
    const blank = find(root, "status", "blank");
    const filled = find(root, "status", "filled");
    const style = getComputedStyle(blank);
    out.status = {
      blank: blank.getBoundingClientRect().height,
      filled: filled.getBoundingClientRect().height,
      size: style.fontSize,
      color: style.color,
    };
  }
  {
    const read = (name) => {
      const container = find(root, name);
      const label = container.querySelector('[data-part="label"]');
      return {
        after: box(find(root, name, "after"), container),
        height: container.getBoundingClientRect().height,
        scrollsAcross: container.scrollWidth > container.clientWidth,
        ...(label && {
          label: box(label, container),
          labelLines: Math.round(label.scrollHeight / line(label)),
          hitLabel: hit(root, label, 0.5, 0.5),
        }),
      };
    };
    out.hidden = read("hidden");
    out.hiddenControl = read("hidden-control");
  }
  return out;
}

/** A host in #shadow whose shadow root adopts the sheets in ADOPTED, from base, holding MARKUP. */
export async function shadow(base) {
  const host = document.querySelector("#shadow").appendChild(document.createElement("div"));
  host.id = "shadow-host";
  const root = host.attachShadow({ mode: "open" });
  root.adoptedStyleSheets = await Promise.all(
    ADOPTED.map(async (path) => {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(await (await fetch(`${base}/${path}`)).text());
      return sheet;
    }),
  );
  root.innerHTML = MARKUP;
  return root;
}

/** The light DOM's holder of MARKUP, filled. */
export function light() {
  const holder = document.querySelector("#light");
  holder.innerHTML = MARKUP;
  return document;
}

function* rules(list) {
  for (const rule of list) {
    yield rule;
    if (rule.cssRules) yield* rules(rule.cssRules);
  }
}

/** Drops each declaration naming an added class in turn, reporting whether measure() differs. */
export function drops(reference) {
  const sheet = [...document.styleSheets]
    .flatMap((s) => [...rules(s.cssRules)])
    .filter((rule) => rule instanceof CSSImportRule && rule.styleSheet)
    .map((rule) => rule.styleSheet)
    .find((s) => s.href.endsWith("/utilities.css"));
  const named = new RegExp(`\\.(${ADDED_UTILITIES.join("|")})(?![\\w-])`);
  const tried = [];
  for (const rule of rules(sheet.cssRules)) {
    if (!(rule instanceof CSSStyleRule) || !named.test(rule.selectorText)) continue;
    const whole = rule.style.cssText;
    const list = declarations(whole);
    for (const [i, declaration] of list.entries()) {
      rule.style.cssText = list.filter((_, j) => j !== i).join("; ");
      try {
        const differs = JSON.stringify(measure(document)) !== JSON.stringify(reference);
        tried.push({ selector: rule.selectorText, declaration, differs });
      } finally {
        rule.style.cssText = whole;
      }
    }
  }
  return tried;
}
