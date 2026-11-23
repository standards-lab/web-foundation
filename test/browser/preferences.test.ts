import assert from "node:assert/strict";
import { join } from "node:path";
import { after, afterEach, before, describe, test } from "node:test";

import { launch, until } from "@standards-lab/web-tooling/browser.js";
import { serve } from "@standards-lab/web-tooling/server.js";
import type { Browser, Page } from "@standards-lab/web-tooling/browser.js";
import type { Server } from "@standards-lab/web-tooling/server.js";

const root = join(import.meta.dirname, "../..");

const KEY = "web-foundation.preferences";
const PREFERENCES = "/dist/preferences.js";
const CHOICE = { color: "github", space: "compact", type: "sans", scheme: "dark" };
const APPLIED = {
  "data-palette": "github",
  "data-space": "compact",
  "data-type": "sans",
  "data-scheme": "dark",
};
const NONE = { "data-palette": null, "data-space": null, "data-type": null, "data-scheme": null };

let server: Server;
let browser: Browser;
const pages: Page[] = [];
const fixture = (name: string) => `${server.origin}/test/fixtures/${name}`;

before(async () => {
  server = await serve({ root });
  browser = await launch();
});
afterEach(async () => {
  for (const page of pages.splice(0)) {
    await page.evaluate("localStorage.clear()").catch(() => {});
    await page.close();
  }
});
after(async () => {
  await browser?.close();
  await server?.stop();
});

async function open(url: string): Promise<Page> {
  const page = await browser.open(url);
  pages.push(page);
  return page;
}

async function seed(value: unknown): Promise<Page> {
  const page = await open(fixture("preferences.html"));
  await page.evaluate(
    value === null
      ? `localStorage.removeItem(${JSON.stringify(KEY)})`
      : `localStorage.setItem(${JSON.stringify(KEY)}, ${JSON.stringify(
          typeof value === "string" ? value : JSON.stringify(value),
        )})`,
  );
  return page;
}

const stored = (page: Page) =>
  page.evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(KEY)}))`);

const rooted = (page: Page) =>
  page.evaluate(`Object.fromEntries(["data-palette", "data-space", "data-type", "data-scheme"]
    .map((name) => [name, document.documentElement.getAttribute(name)]))`);

const call = (page: Page, body: string) =>
  page.evaluate(`import(${JSON.stringify(PREFERENCES)}).then((preferences) => ${body})`);

const registry = (page: Page, body: string) =>
  page.evaluate(`import("/dist/registry.js").then((registry) => ${body})`);

const registered = (page: Page) =>
  registry(
    page,
    `Object.fromEntries(registry.FACETS.map((facet) => [facet, registry.profiles(facet)]))`,
  );

const choose = (page: Page, key: string, value: string) =>
  page.evaluate(`(() => {
    const select = document.querySelector("form[data-choice] select[name=${key}]");
    select.value = ${JSON.stringify(value)};
    select.dispatchEvent(new Event("change", { bubbles: true }));
  })()`);

const style = (page: Page, selector: string, property: string) =>
  page.evaluate(
    `getComputedStyle(document.querySelector(${JSON.stringify(selector)})).getPropertyValue(${JSON.stringify(property)})`,
  );

describe("preferences: apply and storage", () => {
  test("applies the stored choice to the root, under the foundation's key", async () => {
    await seed(CHOICE);
    const page = await open(fixture("preferences.html"));
    assert.deepEqual(await rooted(page), APPLIED);
    assert.match(await style(page, "h1", "font-family"), /^system-ui/);
    assert.equal(await call(page, "preferences.KEY"), KEY);
  });

  test("save() stores the choice under web-foundation.preferences, and under no other key", async () => {
    const page = await open(fixture("preferences.html"));
    await page.evaluate("localStorage.clear()");
    await call(page, `preferences.save(${JSON.stringify(CHOICE)})`);
    assert.deepEqual(await page.evaluate("Object.keys(localStorage)"), [
      "web-foundation.preferences",
    ]);
    assert.deepEqual(
      await page.evaluate(`JSON.parse(localStorage.getItem("web-foundation.preferences"))`),
      CHOICE,
    );
  });

  test("the system scheme sets no data-scheme", async () => {
    await seed({ ...CHOICE, scheme: "system" });
    const page = await open(fixture("preferences.html"));
    assert.deepEqual(await rooted(page), { ...APPLIED, "data-scheme": null });
  });

  test("with nothing stored, or a value that isn't a choice, the page keeps its defaults", async () => {
    for (const value of [null, "not json", "42"]) {
      await seed(value);
      const page = await open(fixture("preferences.html"));
      assert.deepEqual(await rooted(page), NONE, String(value));
      assert.equal(await call(page, "preferences.read()"), null, String(value));
    }
  });

  test("a name this page didn't register falls back to its default and stays in storage", async () => {
    await seed(CHOICE);
    const page = await open(fixture("preferences-lean.html"));
    assert.deepEqual(await rooted(page), { ...NONE, "data-scheme": "dark" });
    assert.deepEqual(await stored(page), CHOICE);
    assert.match(await style(page, "h1", "font-family"), /^ui-monospace/);
  });

  for (const color of ["zenwritten", "flexoki", "primer", "kanagawa", "tokyo-night", "unknown"]) {
    test(`a stored ${color} palette applies zen and stays in storage`, async () => {
      const choice = { ...CHOICE, color };
      await seed(choice);
      const page = await open(fixture("preferences.html"));
      assert.deepEqual(await rooted(page), { ...APPLIED, "data-palette": null });
      assert.deepEqual(await stored(page), choice);
      assert.equal(await style(page, "body", "background-color"), "rgb(25, 25, 25)");
    });
  }

  test("a saved choice applies after a reload and on another page of the origin", async () => {
    await seed(null);
    const page = await open(fixture("preferences.html"));
    assert.equal(await call(page, `preferences.save(${JSON.stringify(CHOICE)})`), true);
    assert.deepEqual(await rooted(page), NONE);
    const lean = await open(fixture("preferences-lean.html"));
    assert.deepEqual(await rooted(lean), { ...NONE, "data-scheme": "dark" });
    await page.goto(fixture("preferences.html"));
    assert.deepEqual(await rooted(page), APPLIED);
  });

  test("save fills a partial choice with the defaults and the system scheme", async () => {
    await seed(null);
    const page = await open(fixture("preferences.html"));
    await call(page, `preferences.save({ type: "sans" })`);
    assert.deepEqual(await stored(page), {
      scheme: "system",
      color: "zen",
      space: "regular",
      type: "sans",
    });
  });

  test("apply sets a choice on any element without saving it", async () => {
    await seed(null);
    const page = await open(fixture("preferences.html"));
    const set = await call(
      page,
      `{
        const el = document.createElement("div");
        preferences.apply(${JSON.stringify(CHOICE)}, el);
        return [...el.attributes].map(({ name, value }) => name + "=" + value).sort();
      }`,
    );
    assert.deepEqual(set, [
      "data-palette=github",
      "data-scheme=dark",
      "data-space=compact",
      "data-type=sans",
    ]);
    assert.deepEqual(await rooted(page), NONE);
    assert.equal(await stored(page), null);
  });

  test("blocked storage reads as nothing stored and saves nothing, without throwing", async () => {
    await seed(CHOICE);
    const page = await open(fixture("preferences.html"));
    await page.cdp("Page.addScriptToEvaluateOnNewDocument", {
      source: `window.errors = [];
        addEventListener("error", (event) => window.errors.push(String(event.message)));
        addEventListener("unhandledrejection", (event) => window.errors.push(String(event.reason)));
        for (const name of ["getItem", "setItem"]) {
          Storage.prototype[name] = () => { throw new DOMException("blocked", "SecurityError"); };
        }`,
    });
    await page.goto(fixture("preferences.html"));
    assert.deepEqual(await rooted(page), NONE);
    assert.deepEqual(await call(page, `[preferences.read(), preferences.save({})]`), [null, false]);
    assert.deepEqual(await page.evaluate("window.errors"), []);
  });
});

describe("preferences: the flash", () => {
  const DELAY = 200;

  async function flash(name: string) {
    const page = await seed(CHOICE);
    page.on("Fetch.requestPaused", ({ requestId }: { requestId: string }) => {
      setTimeout(() => page.cdp("Fetch.continueRequest", { requestId }).catch(() => {}), DELAY);
    });
    await page.cdp("Fetch.enable", { patterns: [{ urlPattern: "*/dist/*.js" }] });
    await page.goto(fixture(name));
    await until(page, "window.flash.paint !== null", 5000);
    return { page, ...(await page.evaluate("window.flash")) };
  }

  test("render-blocking, the stored choice applies before first paint", async () => {
    const blocking = await flash("flash-blocking.html");
    assert.notEqual(blocking.applied, null);
    assert.ok(blocking.applied <= blocking.paint, `applied ${blocking.applied}, ${blocking.paint}`);
    assert.ok(blocking.paint >= DELAY, `first paint ${blocking.paint} didn't wait on the fetch`);
    assert.deepEqual(await rooted(blocking.page), APPLIED);
    const deferred = await flash("flash-deferred.html");
    assert.ok(deferred.applied > deferred.paint, `applied ${deferred.applied}, ${deferred.paint}`);
  });
});

describe("preferences: the storage event", () => {
  test("another tab's save applies every time, over what this tab applied itself", async () => {
    await seed(null);
    const saver = await open(fixture("preferences.html"));
    const page = await open(fixture("preferences.html"));
    for (const color of ["github", "catppuccin", "everforest"]) {
      await call(page, `preferences.apply({ color: "zen" })`);
      await call(saver, `preferences.save(${JSON.stringify({ ...CHOICE, color })})`);
      await until(page, `document.documentElement.getAttribute("data-palette") === "${color}"`);
      assert.deepEqual(await rooted(page), { ...APPLIED, "data-palette": color });
    }
    await saver.evaluate("localStorage.clear()");
    await until(page, `!document.documentElement.hasAttribute("data-palette")`);
    assert.deepEqual(await rooted(page), NONE);
  });
});

describe("preferences: the module", () => {
  test("exports the choice's API alone and defines no element", async () => {
    await seed(null);
    const page = await open(fixture("preferences.html"));
    assert.deepEqual(await call(page, "Object.keys(preferences).sort()"), [
      "ATTRIBUTES",
      "KEY",
      "SCHEMES",
      "apply",
      "read",
      "save",
    ]);
    assert.equal(await page.evaluate(`customElements.get("sl-theme-menu") ?? null`), null);
  });
});

describe("preferences: units and extensions", () => {
  const background = (page: Page) =>
    page.evaluate(`getComputedStyle(document.documentElement).getPropertyValue("--bg")
      .trim().replace(/\\s+/g, " ")`);

  const units = [
    ["preferences-extension.html", "extension", "light-dark(#fdf6fd, #120a12)"],
    ["preferences-unit.html", "github", "light-dark(#ffffff, #0d1117)"],
  ];
  for (const [name, color, bg] of units) {
    test(`on ${name}, the registry lists zen and ${color} alone, beside the lean defaults`, async () => {
      await seed(null);
      const page = await open(fixture(name));
      assert.deepEqual(await registered(page), {
        color: ["zen", color],
        space: ["regular"],
        type: ["mono"],
      });
    });

    test(`on ${name}, data-palette="${color}" applies its tokens`, async () => {
      await seed(null);
      const page = await open(fixture(name));
      const zen = await background(page);
      await page.evaluate(`document.documentElement.setAttribute("data-palette", "${color}")`);
      assert.equal(await background(page), bg);
      assert.notEqual(zen, bg);
    });

    test(`on ${name}, a stored choice of ${color} applies on load`, async () => {
      await seed({ ...CHOICE, color });
      const page = await open(fixture(name));
      assert.deepEqual(await rooted(page), {
        ...NONE,
        "data-palette": color,
        "data-scheme": "dark",
      });
      assert.equal(await background(page), bg);
    });
  }
});

describe("preferences: demo/theme.html", () => {
  const demo = () => `${server.origin}/demo/theme.html`;

  test("its controls apply and save the choice, which survives a reload and syncs to a second tab", async () => {
    await seed(null);
    const page = await open(demo());
    const other = await open(demo());
    await choose(page, "color", "github");
    await choose(page, "scheme", "dark");
    assert.deepEqual(await rooted(page), {
      "data-palette": "github",
      "data-space": "regular",
      "data-type": "mono",
      "data-scheme": "dark",
    });
    assert.deepEqual(await stored(page), {
      color: "github",
      scheme: "dark",
      space: "regular",
      type: "mono",
    });
    await until(other, `document.documentElement.getAttribute("data-palette") === "github"`);
    assert.equal(
      await other.evaluate(`document.querySelector("select[name=color]").value`),
      "github",
    );
    await page.goto(demo());
    assert.equal((await rooted(page))["data-palette"], "github");
  });
});

describe("preferences: demo/unit.html", () => {
  test("its controls list the lean defaults and the GitHub unit, and apply github", async () => {
    await seed(null);
    const page = await open(`${server.origin}/demo/unit.html`);
    const options = await page.evaluate(`Object.fromEntries([...document.querySelectorAll(
      "form[data-choice] select")].map((select) => [select.name,
      [...select.options].map((option) => option.value)]))`);
    assert.deepEqual(options, {
      color: ["zen", "github"],
      scheme: ["system", "light", "dark"],
      space: ["regular"],
      type: ["mono"],
    });
    await choose(page, "color", "github");
    assert.equal((await rooted(page))["data-palette"], "github");
    assert.equal(await style(page, "body", "background-color"), "rgb(255, 255, 255)");
  });
});
