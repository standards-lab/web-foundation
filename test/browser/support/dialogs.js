// The glyph button and dialog cases' in-page half, imported into test/fixtures/dialogs.html: it lays
// out glyph buttons with their hints and three dialogs, in the light DOM or a shadow root, and
// measures each case's geometry and colors, as plain JSON for evaluate(); the constants are also
// read on node.
// From spike-html-hosting-icons (8b8d955): dist/octicon/question-16.js and x-16.js; Octicons, primer/octicons, MIT.
// See docs/testing.md.

import { declarations } from "./computed-styles.js";

/** The sheets a shadow root adopts, in order. */
export const ADOPTED = [
  "baseline/reset.css",
  "baseline/elements.css",
  "glyph-button.css",
  "dialog.css",
];

/** The sheets under test, whose every declaration drops() drops in turn. */
export const SHEETS = ["glyph-button.css", "dialog.css"];

const svg = (d) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16" ` +
  `aria-hidden="true" focusable="false"><path fill="currentColor" d="${d}"/></svg>`;

const QUESTION = svg(
  "M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8m8-6.5a6.5 6.5 0 1 0 0 13a6.5 6.5 0 0 0 0-13M6.92 6.085h.001a.749.749 0 1 1-1.342-.67c.169-.339.436-.701.849-.977C6.845 4.16 7.369 4 8 4a2.76 2.76 0 0 1 1.637.525c.503.377.863.965.863 1.725c0 .448-.115.83-.329 1.15c-.205.307-.47.513-.692.662c-.109.072-.22.138-.313.195l-.006.004a6 6 0 0 0-.26.16a1 1 0 0 0-.276.245a.75.75 0 0 1-1.248-.832c.184-.264.42-.489.692-.661q.154-.1.313-.195l.007-.004c.1-.061.182-.11.258-.161a1 1 0 0 0 .277-.245C8.96 6.514 9 6.427 9 6.25a.61.61 0 0 0-.262-.525A1.27 1.27 0 0 0 8 5.5c-.369 0-.595.09-.74.187a1 1 0 0 0-.34.398M9 11a1 1 0 1 1-2 0a1 1 0 0 1 2 0",
);
const X = svg(
  "M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326a.75.75 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275a.75.75 0 0 1-.734-.215L8 9.06l-3.22 3.22a.75.75 0 0 1-1.042-.018a.75.75 0 0 1-.018-1.042L6.94 8L3.72 4.78a.75.75 0 0 1 0-1.06",
);

const glyphButton = (id, name, glyph, key, attributes = "") =>
  `<button type="button" class="glyph-button" aria-label="${name}" interestfor="${id}-hint" ` +
  `aria-description="" data-part="${id}" ${attributes}>${glyph}` +
  (key ? `<span aria-hidden="true"><kbd>${key}</kbd></span>` : "") +
  `</button><div id="${id}-hint" class="glyph-hint" popover="hint" aria-hidden="true">${name}</div>`;

const header = (dialog, title, attributes = "") =>
  `<header class="dialog-header" data-part="header"><h2 id="${dialog}-title" ${attributes} ` +
  `data-part="heading">${title}</h2>` +
  glyphButton(`${dialog}-close`, "Close", X, "Esc", `commandfor="${dialog}" command="close"`) +
  `</header>`;

/** Every case, each a [data-case] element, its parts [data-part]. */
export const MARKUP = `
  <div data-case="actions">
    ${glyphButton("help", "Help", QUESTION, "?", 'commandfor="help" command="show-modal"')}
    ${glyphButton("settings", "Settings", X, "S", 'commandfor="settings" command="show-modal"')}
  </div>
  <div data-case="alone">
    ${glyphButton("copy", "Copy", X)}
    <button type="button" data-part="plain">Plain</button>
    <i data-part="probe" style="padding: var(--space-3xs) var(--space-2xs); margin-block-end: var(--space-m); column-gap: var(--space-s); color: var(--fg); background-color: var(--bg); font-size: var(--text-s); line-height: var(--leading-ui); font-family: var(--font-ui)">probe</i>
  </div>
  <div data-case="foot" style="position: fixed; inset-block-end: 0; inset-inline-start: 40%; margin: 0">
    ${glyphButton("foot", "At the foot", X)}
  </div>
  <div data-case="end" style="position: fixed; inset-block-start: 0; inset-inline-end: 0">
    ${glyphButton("end", "Settings and preferences", X)}
  </div>
  <dialog id="help" class="dialog-fit" aria-labelledby="help-title" data-case="help">
    ${header("help", "Keyboard shortcuts", 'tabindex="-1" autofocus')}
    <ul data-part="body"><li><kbd>?</kbd> Help</li><li><kbd>S</kbd> Settings</li></ul>
  </dialog>
  <dialog id="settings" class="dialog-wide" aria-labelledby="settings-title" data-case="settings">
    ${header("settings", "Settings")}
    <p data-part="body">Theme and keys.</p>
  </dialog>
  <dialog id="long" class="dialog-fit" aria-labelledby="long-title" data-case="long">
    ${header("long", "A heading long enough to wrap beside its Close button on a phone")}
    <p data-part="body" style="white-space: nowrap">${"wide ".repeat(60)}</p>
  </dialog>
`;

const find = (root, name, part) => {
  const element = root.querySelector(`[data-case="${name}"]`);
  return part ? element.querySelector(`[data-part="${part}"]`) : element;
};

const round = (n) => Math.round(n * 64) / 64;

const box = (element, origin) => {
  const r = element.getBoundingClientRect();
  const o = origin.getBoundingClientRect();
  return {
    left: round(r.left - o.left),
    top: round(r.top - o.top),
    width: round(r.width),
    height: round(r.height),
  };
};

const middle = (element) => {
  const r = element.getBoundingClientRect();
  return round(r.top + r.height / 2);
};

const surface = (element) => {
  const s = getComputedStyle(element);
  return [
    s.borderTopStyle,
    s.borderTopWidth,
    s.borderTopColor,
    s.borderTopLeftRadius,
    s.backgroundColor,
    s.color,
  ].join(" ");
};

const row = (button) => {
  const style = getComputedStyle(button);
  const glyph = button.querySelector("svg");
  const key = button.querySelector("kbd");
  return {
    display: style.display,
    align: style.alignItems,
    gap: style.columnGap,
    padding: [
      style.paddingBlockStart,
      style.paddingBlockEnd,
      style.paddingInlineStart,
      style.paddingInlineEnd,
    ],
    size: {
      width: round(button.getBoundingClientRect().width),
      height: round(button.getBoundingClientRect().height),
    },
    fontSize: style.fontSize,
    glyph: box(glyph, button),
    key: key && box(key.parentElement, button),
    centers: key ? middle(glyph) - middle(key.parentElement) : 0,
    surface: surface(button),
  };
};

const hint = (button) => {
  const shown = button.interestForElement;
  shown.showPopover({ source: button });
  const b = button.getBoundingClientRect();
  const h = shown.getBoundingClientRect();
  const style = getComputedStyle(shown);
  const out = {
    box: box(shown, button),
    below: h.top >= b.bottom,
    above: h.bottom <= b.top,
    overlaps: h.left < b.right && h.right > b.left,
    gap: round(h.top >= b.bottom ? h.top - b.bottom : b.top - h.bottom),
    padding: [style.paddingTop, style.paddingLeft],
    border: style.borderTopStyle,
    right: round(h.right),
    fill: style.backgroundColor,
    color: style.color,
    font: [style.fontFamily, style.fontSize, style.lineHeight],
    lines: Math.round((h.height - 2 * parseFloat(style.paddingTop)) / parseFloat(style.lineHeight)),
  };
  shown.hidePopover();
  return out;
};

const dialog = (root, name) => {
  const element = find(root, name);
  element.showModal();
  const head = find(root, name, "header");
  const heading = find(root, name, "heading");
  const close = head.querySelector("button");
  const body = find(root, name, "body");
  const style = getComputedStyle(heading);
  const out = {
    width: round(element.getBoundingClientRect().width),
    content: round(body.scrollWidth),
    viewport: document.documentElement.clientWidth,
    header: box(head, head),
    heading: box(heading, head),
    close: box(close, head),
    centers: middle(heading) - middle(close),
    below: round(body.getBoundingClientRect().top - head.getBoundingClientRect().bottom),
    margins: [style.marginBlockStart, style.marginBlockEnd],
    focus: root.activeElement?.dataset.part ?? null,
    outline: [
      root.activeElement?.matches(":focus-visible"),
      getComputedStyle(root.activeElement).outlineStyle,
    ],
    display: getComputedStyle(head).display,
  };
  element.close();
  return out;
};

/** Every case's geometry and colors under the root, a document or a shadow root holding MARKUP. */
export function measure(root) {
  const probe = getComputedStyle(find(root, "alone", "probe"));
  return {
    tokens: {
      "3xs": probe.paddingTop,
      "2xs": probe.paddingLeft,
      m: probe.marginBlockEnd,
      s: probe.columnGap,
      fg: probe.color,
      bg: probe.backgroundColor,
      font: [probe.fontFamily, probe.fontSize, probe.lineHeight],
    },
    help: row(find(root, "actions", "help")),
    settings: row(find(root, "actions", "settings")),
    copy: row(find(root, "alone", "copy")),
    plain: surface(find(root, "alone", "plain")),
    helpHint: hint(find(root, "actions", "help")),
    footHint: hint(find(root, "foot", "foot")),
    endHint: { ...hint(find(root, "end", "end")), viewport: document.documentElement.clientWidth },
    dialogs: Object.fromEntries(
      ["help", "settings", "long"].map((name) => [name, dialog(root, name)]),
    ),
  };
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

function* rules(list) {
  for (const rule of list) {
    yield rule;
    if (rule.cssRules) yield* rules(rule.cssRules);
  }
}

/** Drops each declaration of the sheets under test in turn, reporting whether measure() differs. */
export function drops(reference) {
  const tried = [];
  for (const name of SHEETS) {
    const sheet = [...document.styleSheets].find((s) => s.href?.endsWith(`/${name}`));
    for (const rule of rules(sheet.cssRules)) {
      if (!(rule instanceof CSSStyleRule)) continue;
      const whole = rule.style.cssText;
      const list = declarations(whole);
      for (const [i, declaration] of list.entries()) {
        rule.style.cssText = list.filter((_, j) => j !== i).join("; ");
        try {
          const differs = JSON.stringify(measure(document)) !== JSON.stringify(reference);
          tried.push({ sheet: name, selector: rule.selectorText, declaration, differs });
        } finally {
          rule.style.cssText = whole;
        }
      }
    }
  }
  return tried;
}
