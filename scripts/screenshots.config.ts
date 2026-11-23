// mise run screenshots' capture description, which web-tooling's web-screenshots bin runs: the
// tools, hooks, utilities (motion running and reduced), dialogs (hint and each dialog, 390px and
// 1280px), application and reading (390px at 200% text and 1280px), formatters, and color
// specimen pages, each with page-full.css and its registration module, and the profile's
// attributes on the root. The bin's flags choose the profiles, pages, schemes, and output.

import { SETTLED, until } from "@standards-lab/web-tooling/browser.js";
import type { Description, DescribedState, Step } from "@standards-lab/web-tooling/screenshots.js";

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

const REGISTERED_PROFILES = `(() => {
  const store = globalThis[Symbol.for("web-foundation.registry")] ?? {};
  return { palette: store.color ?? [], space: store.space ?? [], type: store.type ?? [] };
})()`;

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

const helpHint: Step = async (page) => {
  const { x, y }: { x: number; y: number } = await page.evaluate(`(() => {
    const { left, top, width, height } = document.querySelector('[commandfor="help"]').getBoundingClientRect();
    return { x: left + width / 2, y: top + height / 2 };
  })()`);
  await page.cdp("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  await until(page, `document.querySelector("#help-hint").matches(":popover-open")`);
};

const openDialog =
  (id: string): Step =>
  async (page) => {
    await page.evaluate(
      `document.querySelector('[commandfor="${id}"][command="show-modal"]').click()`,
    );
    await until(page, `document.querySelector("#${id}").open`);
  };

const DIALOG_STATES: [string, string, Step][] = [
  ["hint", "the Help hint shown", helpHint],
  ["help", "Help, a .dialog-fit, open", openDialog("help")],
  ["settings", "Settings, a .dialog-wide, open", openDialog("settings")],
];

const dialogStates = (suffix: string, width: number): DescribedState[] =>
  DIALOG_STATES.map(([name, caption, open]) => ({
    name: `dialogs-${name}-${suffix}`,
    caption: `${caption}, ${suffix}`,
    viewport: { width, height: 720 },
    full: false,
    open,
  }));

const textScale =
  (scale: number): Step =>
  async (page) => {
    await page.cdp("Page.setFontSizes", {
      fontSizes: { standard: 16 * scale, fixed: 13 * scale },
    });
    await page.evaluate(SETTLED);
  };

const layoutStates = (name: string, caption: string, full: boolean): DescribedState[] => [
  {
    name: `${name}-390px`,
    caption: `${caption}, 390px, text at 200%`,
    viewport: { width: 390, height: 720 },
    full,
    open: textScale(2),
  },
  {
    name: `${name}-wide`,
    caption: `${caption}, wide`,
    viewport: { width: 1280, height: 720 },
    full,
    open: textScale(1),
  },
];

const description: Description = {
  pages: [
    { name: "tools", caption: "the tools page", path: "demo/tools.html" },
    { name: "hooks", caption: "the color hooks", path: "demo/hooks.html" },
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
    {
      name: "dialogs",
      caption: "the glyph buttons and dialogs",
      path: "demo/dialogs.html",
      states: [...dialogStates("390px", 390), ...dialogStates("wide", 1280)],
    },
    {
      name: "app",
      caption: "the application page",
      path: "demo/app.html",
      states: layoutStates("app", "the application page", false),
    },
    {
      name: "prose",
      caption: "the reading page",
      path: "demo/prose.html",
      states: layoutStates("prose", "the reading page", true),
    },
    { name: "format", caption: "the formatters", path: "demo/format.html" },
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
  all: [
    ...["zen", "github", "catppuccin", "everforest"].map((palette) => ({ palette })),
    { space: "compact" },
    { type: "sans" },
  ],
  prepare: (page) => page.evaluate(FULL_ENTRY),
  profiles: (page) => page.evaluate(REGISTERED_PROFILES),
  server: { root: ".." },
};

export default description;
