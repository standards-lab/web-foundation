// Adapted from spike-html-apps-foundation (07ba39a): test/unit/registry.test.ts, the store's key renamed web-foundation.registry.
// Adapted from spike-html-packages-foundation (5dd8a58): test/unit/registry.test.js, in TypeScript.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type * as Registry from "../../src/registry.ts";
import type { Store } from "../../src/registry.ts";

const url = new URL("../../src/registry.ts", import.meta.url).href;
const KEY = Symbol.for("web-foundation.registry");
const scope = globalThis as typeof globalThis & Record<symbol, Store | undefined>;

const LEAN = { color: ["zen"], space: ["regular"], type: ["mono"] };
const FULL = {
  color: ["zen", "github", "catppuccin", "everforest"],
  space: ["regular", "compact"],
  type: ["mono", "sans"],
};

const copy = (query: string): Promise<typeof Registry> => import(`${url}?${query}`);

let pages = 0;

async function page() {
  delete scope[KEY];
  const name = `page=${++pages}`;
  return { registry: await copy(name), copy: (suffix: string) => copy(`${name}&${suffix}`) };
}

function registerLean({ register }: typeof Registry) {
  register("color", "zen");
  register("space", "regular");
  register("type", "mono");
}

function registerFull({ register }: typeof Registry) {
  for (const name of FULL.color) register("color", name);
  for (const name of ["regular", "compact"]) register("space", name);
  for (const name of ["mono", "sans"]) register("type", name);
}

const STORE = () => JSON.parse(JSON.stringify(scope[KEY]));

const listed = ({ FACETS, profiles }: typeof Registry) =>
  Object.fromEntries(FACETS.map((facet) => [facet, profiles(facet)]));

describe("registry", () => {
  test("two copies of the registry from two URLs share one store", async () => {
    const { registry, copy } = await page();
    const a = await copy("a");
    const b = await copy("b");
    registerLean(registry);
    registerLean(registry);
    registerFull(registry);
    a.register("color", "extension");
    a.register("color", "extension");
    assert.notEqual(a.register, b.register);
    const expected = { ...FULL, color: [...FULL.color, "extension"] };
    assert.deepEqual(
      listed(b),
      expected,
      "b lists each name once though the lean module ran twice and the extension registered twice",
    );
    assert.deepEqual(STORE(), expected);
  });

  test("the store is a plain object of the three facets' name lists", async () => {
    registerLean((await page()).registry);
    const store = scope[KEY];
    assert.ok(store, "registering made the store");
    assert.deepEqual(
      [
        Object.getPrototypeOf(store) === Object.prototype,
        Object.keys(store),
        Object.values(store).every(Array.isArray),
      ],
      [true, ["color", "space", "type"], true],
    );
  });

  test("a copy that finds a store already there uses it, and adds a facet it lacks", async () => {
    delete scope[KEY];
    const olderWithoutType = { color: ["zen"], space: [] };
    scope[KEY] = olderWithoutType;
    const registry = await copy(`page=${++pages}`);
    registry.register("type", "mono");
    assert.equal(scope[KEY], olderWithoutType);
    assert.deepEqual(STORE(), { color: ["zen"], space: [], type: ["mono"] });
  });

  test("profiles() returns a copy, so changing it changes no store", async () => {
    const { registry } = await page();
    registerLean(registry);
    registry.profiles("color").push("mutated");
    assert.deepEqual(registry.profiles("color"), ["zen"]);
    assert.deepEqual(STORE(), LEAN);
  });

  test("register throws on an unknown facet or an empty name, and registers nothing", async () => {
    const { registry } = await page();
    registerLean(registry);
    const thrown = (call: () => unknown) => {
      try {
        call();
        return null;
      } catch (error) {
        return error instanceof Error ? [error.name, error.message] : [error];
      }
    };
    assert.deepEqual(
      // @ts-expect-error scheme is no facet.
      thrown(() => registry.register("scheme", "dark")),
      ["TypeError", "registry: unknown facet scheme; expected one of color, space, type"],
    );
    assert.deepEqual(
      // @ts-expect-error palette is no facet.
      thrown(() => registry.profiles("palette")),
      ["TypeError", "registry: unknown facet palette; expected one of color, space, type"],
    );
    assert.deepEqual(
      thrown(() => registry.register("color", "")),
      ["TypeError", "registry: a color profile's name must be a non-empty string"],
    );
    assert.deepEqual(STORE(), LEAN);
  });
});
