// The reader's theme choice, applied to the root before first paint, kept in localStorage, and
// followed across tabs, where a cleared choice restores the defaults. A page loads it with
// blocking="render" after its registration module, so the registry is full when it runs and no
// default flashes. With nothing stored the root keeps whatever the page wrote on it.

import { DEFAULTS, FACETS, profiles } from "./registry.ts";
import type { Facet } from "./registry.ts";

/** A key of a choice: each facet, and the scheme. */
export type Key = Facet | "scheme";

/** A choice as save() stores it: a registered name per facet, and system, light, or dark. */
export type Choice = Record<Key, string>;

/** A choice as read() or another page hands it over: any key may be missing or hold anything. */
export type Loose = Partial<Record<Key, unknown>>;

/** The localStorage key, so every page on an origin shares one choice. */
export const KEY = "web-foundation.preferences";

/** Each facet's attribute, and the scheme's. */
export const ATTRIBUTES: Readonly<Record<Key, string>> = Object.freeze({
  color: "data-palette",
  space: "data-space",
  type: "data-type",
  scheme: "data-scheme",
});

/** The scheme's values, system (the default) first. */
export const SCHEMES: readonly string[] = Object.freeze(["system", "light", "dark"]);

/** The stored choice, or null when nothing is stored, it isn't a choice, or storage is blocked. */
export function read(): Loose | null {
  try {
    const choice: unknown = JSON.parse(localStorage.getItem(KEY) ?? "null");
    return choice && typeof choice === "object" ? (choice as Loose) : null;
  } catch {
    return null;
  }
}

/**
 * Applies the choice to el, the root by default, without saving it. A name this page didn't
 * register removes its facet's attribute, so the facet falls back to its default, and the name
 * stays in storage for the pages that registered it; system, or anything not a scheme, leaves
 * data-scheme off.
 */
export function apply(choice: Loose | null, el: Element = document.documentElement): void {
  for (const facet of FACETS) {
    const name = choice?.[facet];
    if (typeof name === "string" && profiles(facet).includes(name)) {
      el.setAttribute(ATTRIBUTES[facet], name);
    } else el.removeAttribute(ATTRIBUTES[facet]);
  }
  const scheme = choice?.scheme;
  if (typeof scheme === "string" && SCHEMES.includes(scheme) && scheme !== SCHEMES[0]) {
    el.setAttribute(ATTRIBUTES.scheme, scheme);
  } else el.removeAttribute(ATTRIBUTES.scheme);
}

/** Stores the choice, defaults filling its gaps, and returns whether storage took it. */
export function save(choice: Partial<Choice> | null): boolean {
  const stored = { scheme: choice?.scheme ?? SCHEMES[0] } as Choice;
  for (const facet of FACETS) stored[facet] = choice?.[facet] ?? DEFAULTS[facet];
  try {
    localStorage.setItem(KEY, JSON.stringify(stored));
    return true;
  } catch {
    return false;
  }
}

const stored = read();
if (stored) apply(stored);

addEventListener("storage", (event) => {
  if (event.key !== KEY && event.key !== null) return;
  apply(read() ?? {});
});
