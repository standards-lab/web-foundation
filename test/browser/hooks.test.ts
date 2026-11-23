import assert from "node:assert/strict";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";

import { launch } from "@standards-lab/web-tooling/browser.js";
import { serve } from "@standards-lab/web-tooling/server.js";
import type { Browser, Page } from "@standards-lab/web-tooling/browser.js";
import type { Server } from "@standards-lab/web-tooling/server.js";

const root = join(import.meta.dirname, "../..");

const PALETTES = ["zen", "github", "catppuccin", "everforest"];
const SCHEMES = ["light", "dark"];
const ROLES = ["primary", "accent", "success", "warning", "danger"] as const;
type Role = (typeof ROLES)[number];
const HUES: Record<Role, string> = {
  primary: "blue",
  accent: "magenta",
  success: "green",
  warning: "orange",
  danger: "red",
};
const SET: Record<Role, string> = {
  primary: "rgb(51, 102, 153)",
  accent: "rgb(153, 51, 102)",
  success: "rgb(102, 153, 51)",
  warning: "rgb(204, 153, 0)",
  danger: "rgb(153, 0, 51)",
};

interface Reading {
  link: string;
  checkbox: string;
  caret: string;
  outline: string;
  selection: string;
  fieldHover: string;
  buttonHover: string;
  metaButtonHover: string;
  progress: string;
  success: string;
  warning: string;
  danger: string;
}
interface Group {
  reading: Reading;
  hues: Record<Role, string>;
}
interface Hooks {
  groups: Record<string, Group>;
  declared: string[];
}

async function forceStates(page: Page) {
  await page.cdp("DOM.enable");
  await page.cdp("CSS.enable");
  const { root: tree } = await page.cdp("DOM.getDocument");
  const force = async (selector: string, forcedPseudoClasses: string[]) => {
    const { nodeIds }: { nodeIds: number[] } = await page.cdp("DOM.querySelectorAll", {
      nodeId: tree.nodeId,
      selector,
    });
    await Promise.all(
      nodeIds.map((nodeId) => page.cdp("CSS.forcePseudoState", { nodeId, forcedPseudoClasses })),
    );
  };
  await force(".group input[type=text]", ["hover", "focus-visible"]);
  await force(".group button, .group .button", ["hover"]);
}

const READ = (
  palette: string,
  scheme: string,
  scopePalette: string,
  scopeScheme: string,
) => `(() => {
  const root = document.documentElement;
  root.setAttribute("data-palette", ${JSON.stringify(palette)});
  root.setAttribute("data-scheme", ${JSON.stringify(scheme)});
  const scope = document.querySelector("#scoped");
  scope.setAttribute("data-palette", ${JSON.stringify(scopePalette)});
  scope.setAttribute("data-scheme", ${JSON.stringify(scopeScheme)});
  const hues = ${JSON.stringify(HUES)};
  const group = (element) => {
    const style = (selector, property, pseudo) =>
      getComputedStyle(element.querySelector(selector), pseudo).getPropertyValue(property);
    return {
      reading: {
        link: style("a:not(.button)", "color"),
        checkbox: style("input[type=checkbox]", "accent-color"),
        caret: style("input[type=text]", "caret-color"),
        outline: style("input[type=text]", "outline-color"),
        selection: style("input[type=text]", "background-color", "::selection"),
        fieldHover: style("input[type=text]", "border-top-color"),
        buttonHover: style("button", "border-top-color"),
        metaButtonHover: style(".button", "border-top-color"),
        progress: style("progress", "accent-color"),
        success: style("[data-role=success]", "color"),
        warning: style("[data-role=warning]", "color"),
        danger: style("[data-role=danger]", "color"),
      },
      hues: Object.fromEntries(
        Object.entries(hues).map(([role, hue]) => [role, style("[data-hue=" + hue + "]", "color")]),
      ),
    };
  };
  const names = [
    ...${JSON.stringify(ROLES.map((role) => `--color-${role}`))},
    "--interaction-color",
    "--accent-color",
  ];
  return {
    groups: Object.fromEntries(
      [...document.querySelectorAll(".group")].map((element) => [element.id, group(element)]),
    ),
    declared: [root, document.body, scope].flatMap((element) =>
      names.map((name) => getComputedStyle(element).getPropertyValue(name)),
    ),
  };
})()`;

const MIX = (color: string) => `(() => {
  const probe = document.createElement("span");
  probe.style.backgroundColor = "color-mix(in srgb, ${color} 30%, transparent)";
  document.body.append(probe);
  const mixed = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return mixed;
})()`;

describe("foundation color role hooks", () => {
  let server: Server;
  let browser: Browser;
  let page: Page;

  before(async () => {
    server = await serve({ root });
    browser = await launch();
    page = await browser.open(`${server.origin}/test/fixtures/hooks.html`);
    await forceStates(page);
  });
  after(async () => {
    await page?.close();
    await browser?.close();
    await server?.stop();
  });

  async function expected(colors: Record<Role, string>): Promise<Reading> {
    const primary = colors.primary;
    return {
      link: primary,
      checkbox: primary,
      caret: primary,
      outline: primary,
      selection: await page.evaluate(MIX(primary)),
      fieldHover: primary,
      buttonHover: primary,
      metaButtonHover: primary,
      progress: colors.accent,
      success: colors.success,
      warning: colors.warning,
      danger: colors.danger,
    };
  }

  for (const [index, palette] of PALETTES.entries()) {
    for (const scheme of SCHEMES) {
      test(`${palette} ${scheme}: each role follows its hook, by default its hue`, async () => {
        const scopePalette = PALETTES[(index + 1) % PALETTES.length];
        const scopeScheme = scheme === "light" ? "dark" : "light";
        const { groups, declared }: Hooks = await page.evaluate(
          READ(palette, scheme, scopePalette, scopeScheme),
        );
        const hues = groups.plain.hues;
        const scopedHues = groups.scoped.hues;
        assert.equal(new Set(Object.values(hues)).size, ROLES.length, "two fallbacks coincide");
        for (const role of ROLES) {
          assert.notEqual(scopedHues[role], hues[role], `the scope's --${HUES[role]}`);
        }
        assert.ok(
          declared.every((value) => value === ""),
          "a hook is declared",
        );

        const plain = await expected(hues);
        assert.deepEqual(groups.plain.reading, plain, "no hook set");
        assert.deepEqual(groups.scoped.reading, await expected(scopedHues), "in the scope");
        for (const role of ROLES) {
          assert.deepEqual(
            groups[role].reading,
            await expected({ ...hues, [role]: SET[role] }),
            `--color-${role} set on a subtree`,
          );
        }
        assert.deepEqual(groups.retired.reading, plain, "v0.3.0's hook names set");
      });
    }
  }
});
