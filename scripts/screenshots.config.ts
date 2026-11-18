// Adapted from spike-html-apps-foundation (07ba39a): scripts/screenshots.config.ts, on
// @standards-lab/web-tooling and its web-screenshots bin, with the registry's key renamed
// web-foundation.registry.
// mise run screenshots' capture description, which the tooling's web-screenshots bin runs: the
// tools page whole, keys help open, the theme menu open wide and narrow, the hooks page whole, and
// the color specimen narrowed to the profile's color theme and its backup, each with the
// stylesheet pointed at page-full.css, its registration module imported, and the profile's
// attributes set on the root, as demo/profiles.html does, so no demo page changes; the profiles
// each page then registers, from the registry. The bin's flags choose the profiles, pages,
// schemes, and output.
// Adapted from spike-html-apps-foundation (9c15b8d): scripts/screenshots.js, its states, profiles,
// and open steps as a Description.

import { until, type Page } from "@standards-lab/web-tooling/browser.js";
import type { Description, Step, Viewport } from "@standards-lab/web-tooling/screenshots.js";

// Below the theme menu's 48rem breakpoint: a phone's width.
const NARROW: Viewport = { width: 390, height: 844 };

/** Sends ? as a US keyboard types it, Shift held, to the page's keys.js. */
async function pressHelp(page: Page): Promise<void> {
  const event = { key: "?", code: "Slash", modifiers: 8, windowsVirtualKeyCode: 191 };
  await page.cdp("Input.dispatchKeyEvent", { type: "keyDown", ...event, text: "?" });
  await page.cdp("Input.dispatchKeyEvent", { type: "keyUp", ...event });
}

/**
 * Opens the theme menu: the Theme button's command="--open", as a click sends it to
 * <sl-theme-menu>.
 */
const openThemeMenu: Step = async (page) => {
  await page.evaluate(`document.querySelector("button[commandfor=theme]").click()`);
  await until(page, `document.querySelector("sl-theme-menu dialog")?.open`);
};

/**
 * Points the page's stylesheet link at the full entry, unless it links it, and waits for it, and
 * imports the full entry's registration module, register-full.js, so the page registers exactly
 * the profiles the sheet styles; a page that already imports it shares the one module instance.
 */
const FULL_ENTRY = `(async () => {
  const registered = import(new URL("../dist/register-full.js", document.baseURI).href);
  const link = document.querySelector('link[rel="stylesheet"]');
  if (!link.href.endsWith("/dist/page-full.css")) {
    const loaded = new Promise((resolve, reject) => {
      link.addEventListener("load", resolve, { once: true });
      link.addEventListener("error", () => reject(new Error("page-full.css didn't load")), { once: true });
    });
    link.href = "../dist/page-full.css";
    await loaded;
  }
  await registered;
})()`;

/** The page's registered names, by flag, read from the registry's store at its well-known global
 * key, as src/registry.ts keeps it; its color facet is palette's. */
const REGISTRY = `(() => {
  const store = globalThis[Symbol.for("web-foundation.registry")] ?? {};
  return { palette: store.color ?? [], space: store.space ?? [], type: store.type ?? [] };
})()`;

/**
 * Narrows demo/specimen.html to the pair the capture's profile names, the root's data-palette and
 * its backup, in the capture's scheme, the root's data-scheme, through the page's own Theme and
 * Scheme switches: one capture per pair per scheme, legible at the default width.
 */
const narrowSpecimen: Step = (page) =>
  page.evaluate(`(() => {
    const root = document.documentElement;
    for (const [name, value] of [["theme", root.dataset.palette], ["scheme", root.dataset.scheme]]) {
      const select = document.querySelector(\`select[name="\${name}"]\`);
      if (![...select.options].some((option) => option.value === value)) {
        throw new Error(\`the specimen has no \${name} \${value}\`);
      }
      select.value = value;
      select.dispatchEvent(new Event("change"));
    }
  })()`);

const description: Description = {
  pages: [
    // One full-page capture, the bin's default state.
    { name: "tools", caption: "the tools page", path: "demo/tools.html" },
    {
      name: "keys",
      caption: "keys help open",
      path: "demo/keys.html",
      states: [
        {
          name: "keys-help",
          caption: "keys help open",
          full: false,
          async open(page) {
            await pressHelp(page);
            // keys-help.js replaces the placeholder with the list and its note once it has loaded.
            await until(
              page,
              `document.getElementById("help").open && !!document.querySelector("[data-keys-note]")`,
            );
          },
        },
      ],
    },
    {
      name: "theme",
      caption: "the theme menu open",
      path: "demo/theme.html",
      states: [
        {
          name: "theme-menu-wide",
          caption: "the theme menu open, wide",
          full: false,
          open: openThemeMenu,
        },
        {
          name: "theme-menu-narrow",
          caption: "the theme menu open, narrow",
          viewport: NARROW,
          full: false,
          open: openThemeMenu,
        },
      ],
    },
    // One full-page capture; the bin focuses the page's data-focus-start range and presses Tab,
    // which reaches the field and selects its text.
    { name: "hooks", caption: "the color hooks", path: "demo/hooks.html" },
    // One full-page capture of the profile's color theme beside its backup, in the one scheme.
    {
      name: "specimen",
      caption: "the color specimen",
      path: "demo/specimen.html",
      states: [
        {
          name: "specimen",
          caption: "the color theme and its backup",
          full: true,
          open: narrowSpecimen,
        },
      ],
    },
  ],
  facets: [
    { flag: "palette", attribute: "data-palette", default: "zen" },
    { flag: "space", attribute: "data-space", default: "regular" },
    { flag: "type", attribute: "data-type", default: "mono" },
  ],
  // Every color at the defaults, then the other space and the other type at the default color.
  all: [
    ...["zen", "github", "catppuccin", "everforest"].map((palette) => ({ palette })),
    { space: "compact" },
    { type: "sans" },
  ],
  // The full entry's sheet and registration module, so the registry lists what the sheet styles.
  prepare: (page) => page.evaluate(FULL_ENTRY),
  profiles: (page) => page.evaluate(REGISTRY),
  // The repository root, against this module's directory: the demo pages load ../dist/.
  server: { root: ".." },
};

export default description;
