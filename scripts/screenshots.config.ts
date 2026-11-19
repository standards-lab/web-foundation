// Adapted from spike-html-apps-foundation (07ba39a): scripts/screenshots.config.ts, on
// @standards-lab/web-tooling and its web-screenshots bin, with the registry's key renamed
// web-foundation.registry.
// mise run screenshots' capture description, which the tooling's web-screenshots bin runs: the
// tools page whole, the hooks page whole, the utilities page whole with motion and with reduced
// motion, and the color specimen narrowed to the profile's color theme and its backup, each with the stylesheet pointed at page-full.css, its registration module
// imported, and the profile's attributes set on the root, as demo/profiles.html does, so no demo
// page changes; the profiles each page then registers, from the registry. The bin's flags choose
// the profiles, pages, schemes, and output.
// Adapted from spike-html-apps-foundation (9c15b8d): scripts/screenshots.js, its states, profiles,
// and open steps as a Description.

import type { Description, Step } from "@standards-lab/web-tooling/screenshots.js";

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

/**
 * Emulates the reader's prefers-reduced-motion, and holds every animation still at the middle of
 * its loop, so a capture shows the pulse faded and the ring grown where they run.
 */
const motion =
  (value: "no-preference" | "reduce"): Step =>
  async (page) => {
    await page.cdp("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value }],
    });
    await page.evaluate(`(() => {
      for (const animation of document.getAnimations()) {
        animation.pause();
        animation.currentTime = animation.effect.getComputedTiming().duration / 2;
      }
    })()`);
  };

const description: Description = {
  pages: [
    // One full-page capture, the bin's default state.
    { name: "tools", caption: "the tools page", path: "demo/tools.html" },
    // One full-page capture; the bin focuses the page's data-focus-start range and presses Tab,
    // which reaches the field and selects its text.
    { name: "hooks", caption: "the color hooks", path: "demo/hooks.html" },
    // Two full-page captures: the motion sheet's loops held midway, and under reduced motion.
    {
      name: "utilities",
      caption: "the utilities",
      path: "demo/utilities.html",
      states: [
        {
          name: "utilities",
          caption: "the utilities, motion running",
          full: true,
          open: motion("no-preference"),
        },
        {
          name: "utilities-reduced",
          caption: "the utilities, motion reduced",
          full: true,
          open: motion("reduce"),
        },
      ],
    },
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
