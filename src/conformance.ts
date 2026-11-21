// Adapted from spike-html-apps-foundation (07ba39a): src/conformance.ts, its registry key renamed web-foundation.registry.
// Adapted from spike-html-design (fe75220): modules/conformance.js.
// The conformance check: whether a profile an extension adds keeps its facet's contract, in a live
// page. It imports nothing at runtime and reads computed values only, never a sheet's rules, so it
// runs alike from file://, a CDN, a local server, and node_modules.

import type { Facet } from "./registry.ts";

/** One rule a profile breaks, and what broke, in words. */
export interface Failure {
  rule: string;
  message: string;
}

const FACETS: readonly Facet[] = ["color", "space", "type"];

/**
 * Each facet's rule names, in the order check() reports them:
 *
 * - tokens: color's sixteen tokens are each a color, in light and in dark; space's --space-base,
 *   --line-s, --line-m, and --radius-base are lengths; type's four role fonts and four role
 *   leadings are set.
 * - color-only, space-only, type-only: no other facet's token is set.
 * - layer: the block is in the facet's sub-layer, such as foundation.tokens.color.
 * - specificity: the selector is :where([data-palette="<name>"]), or the facet's attribute.
 * - paints (color): a scope paints its background from its --bg and its text from its --fg.
 * - surfaces (color): --bg, --bg-1, and --bg-2 each step closer to --fg's luminance.
 * - contrast (color): --fg on --bg reaches 4.5:1, WCAG's AA for body text, in light and in dark.
 * - scale (space): the nine steps derived from --space-base ascend strictly.
 * - scale (type): the text steps ascend strictly, and each role font resolves to a family.
 * - registered: the registry lists the name under the facet.
 */
export const RULES: Readonly<Record<Facet, readonly string[]>> = Object.freeze({
  color: Object.freeze([
    "tokens",
    "color-only",
    "layer",
    "specificity",
    "paints",
    "surfaces",
    "contrast",
    "registered",
  ]),
  space: Object.freeze(["tokens", "space-only", "layer", "specificity", "scale", "registered"]),
  type: Object.freeze(["tokens", "type-only", "layer", "specificity", "scale", "registered"]),
});

const COLOR = [
  "--bg",
  "--bg-1",
  "--bg-2",
  "--border",
  "--border-2",
  "--fg",
  "--fg-2",
  "--fg-3",
  "--red",
  "--orange",
  "--yellow",
  "--green",
  "--cyan",
  "--blue",
  "--purple",
  "--magenta",
];

const STEPS = [
  "--space-3xs",
  "--space-2xs",
  "--space-xs",
  "--space-s",
  "--space-m",
  "--space-l",
  "--space-xl",
  "--space-2xl",
  "--space-3xl",
];

const SPACE_VALUES = ["--space-base", "--line-s", "--line-m", "--radius-base"];

const SPACE = [
  "--space-fluid",
  ...SPACE_VALUES,
  ...STEPS,
  "--radius-sm",
  "--radius-md",
  "--radius-lg",
  "--radius-full",
];

const TEXT = [
  "--text-xs",
  "--text-s",
  "--text-m",
  "--text-l",
  "--text-xl",
  "--text-2xl",
  "--text-3xl",
  "--text-4xl",
];

const FONTS = ["--font-body", "--font-heading", "--font-ui", "--font-code"];
const TYPE_VALUES = [
  ...FONTS,
  "--leading-body",
  "--leading-heading",
  "--leading-ui",
  "--leading-code",
];

const TYPE = ["--type-fluid", ...TEXT, ...TYPE_VALUES];

interface Spec {
  attribute: string;
  values: readonly string[];
  others: readonly string[];
  rooted: readonly string[];
  next: string;
  schemes: readonly (string | null)[];
}

const SPECS: Readonly<Record<Facet, Spec>> = {
  color: {
    attribute: "data-palette",
    values: COLOR,
    others: [...SPACE, ...TYPE],
    rooted: [],
    next: "foundation.tokens.space",
    schemes: ["light", "dark"],
  },
  space: {
    attribute: "data-space",
    values: SPACE_VALUES,
    others: [...COLOR, ...TYPE],
    rooted: ["--space-fluid"],
    next: "foundation.tokens.type",
    schemes: [null],
  },
  type: {
    attribute: "data-type",
    values: TYPE_VALUES,
    others: [...COLOR, ...SPACE],
    rooted: ["--type-fluid", ...TEXT],
    next: "foundation.reset",
    schemes: [null],
  },
};

const PROBE = "data-conformance-probe";
const SENTINEL = "conformance-probe";

const MISSING = "rgba(1, 2, 3, 0.004)";

const FAMILY = `"${SENTINEL}"`;

function style(facet: Facet): string {
  const { values, next } = SPECS[facet];
  const sentinels = values.map((token) => `${token}: ${SENTINEL};`).join(" ");
  const layer = `foundation.tokens.${facet}`;
  return `@layer ${layer}, ${next};
@layer ${layer} { :where([${PROBE}="same"]) { ${sentinels} } }
@layer ${next} { :where([${PROBE}="later"]) { ${sentinels} } }`;
}

/** The rules facet's profile `name` breaks, each at most once, in RULES's order: [] conforms. */
export async function check(facet: Facet, name: string): Promise<Failure[]> {
  if (!FACETS.includes(facet)) {
    throw new TypeError(
      `conformance: unknown facet ${facet}; expected one of ${FACETS.join(", ")}`,
    );
  }
  if (typeof name !== "string" || name === "") {
    throw new TypeError(`conformance: a ${facet} profile's name must be a non-empty string`);
  }
  if (document.readyState !== "complete") {
    await new Promise((resolve) => addEventListener("load", resolve, { once: true }));
  }
  return probe(facet, name);
}

interface Scope {
  scheme: string | null;
  scope: HTMLElement;
  probe: HTMLElement;
}

interface Probes {
  scopes: Scope[];
  same: HTMLElement;
  later: HTMLElement;
}

function probe(facet: Facet, name: string): Failure[] {
  const spec = SPECS[facet];
  const sheet = document.createElement("style");
  sheet.textContent = style(facet);
  const host = document.createElement("div");
  host.style.display = "none";
  for (const token of [...spec.values, ...spec.others]) {
    if (!spec.rooted.includes(token)) host.style.setProperty(token, "initial");
  }
  const scope = (scheme: string | null, marker?: string) => {
    const el = document.createElement("div");
    el.setAttribute(spec.attribute, name);
    if (scheme) el.style.colorScheme = scheme;
    if (marker) el.setAttribute(PROBE, marker);
    return host.appendChild(el);
  };
  const scopes = spec.schemes.map((scheme) => {
    const el = scope(scheme);
    const parent = el.appendChild(document.createElement("div"));
    parent.style.color = MISSING;
    parent.style.fontFamily = FAMILY;
    return { scheme, scope: el, probe: parent.appendChild(document.createElement("div")) };
  });
  const same = scope(null, "same");
  const later = scope(null, "later");
  document.head.append(sheet);
  document.documentElement.append(host);
  try {
    return failures(facet, name, { scopes, same, later });
  } finally {
    host.remove();
    sheet.remove();
  }
}

function failures(facet: Facet, name: string, probes: Probes): Failure[] {
  const spec = SPECS[facet];
  const failed: Failure[] = [];
  const fail = (rule: string, message: string) =>
    failed.push({ rule, message: `${name}: ${message}` });
  const own = getComputedStyle(probes.scopes[0].scope);
  const layer = `foundation.tokens.${facet}`;

  const derive = TOKENS[facet](probes, fail);

  const others = spec.others.filter((token) => own.getPropertyValue(token).trim() !== "");
  if (others.length) {
    const kinds = { color: "space or type", space: "color or type", type: "color or space" };
    fail(`${facet}-only`, `sets ${kinds[facet]} tokens: ${others.join(", ")}`);
  }

  const set = spec.values.filter((token) => own.getPropertyValue(token).trim() !== "");
  const beaten = (el: HTMLElement) => {
    const computed = getComputedStyle(el);
    return set.filter((token) => computed.getPropertyValue(token).trim() !== SENTINEL);
  };
  const outLayered = set.length ? beaten(probes.later) : [];
  if (outLayered.length) {
    fail(
      "layer",
      `beats a zero-specificity rule in the layer after ${layer} for ${outLayered.join(", ")}, so it is not in that layer`,
    );
  }
  const outSpecific = set.length && !outLayered.length ? beaten(probes.same) : [];
  if (outSpecific.length) {
    fail(
      "specificity",
      `beats a later zero-specificity rule in ${layer} for ${outSpecific.join(", ")}, so its selector is more specific than :where([${spec.attribute}="${name}"])`,
    );
  }

  derive();

  const store = (globalThis as Record<symbol, unknown>)[Symbol.for("web-foundation.registry")] as
    Partial<Record<Facet, string[]>> | undefined;
  if (!store?.[facet]?.includes(name)) {
    fail("registered", `is not registered under ${facet} in the registry`);
  }
  return failed;
}

type Fail = (rule: string, message: string) => void;

const TOKENS: Readonly<Record<Facet, (probes: Probes, fail: Fail) => () => void>> = {
  color: colorTokens,
  space: spaceTokens,
  type: typeTokens,
};

const CONTRAST = 4.5;

function colorTokens({ scopes }: Probes, fail: Fail): () => void {
  const colors = scopes.map(({ scheme, probe }) => {
    const resolved: Record<string, string | null> = {};
    for (const token of COLOR) {
      probe.style.color = `var(${token}, ${MISSING})`;
      const value = getComputedStyle(probe).color;
      resolved[token] = value === getComputedStyle(probe.parentElement!).color ? null : value;
    }
    return { scheme, resolved };
  });
  const broken = COLOR.filter((token) => colors.some(({ resolved }) => resolved[token] === null));
  if (broken.length) {
    const where = broken.map((token) => {
      const off = colors.filter(({ resolved }) => resolved[token] === null);
      return `${token} (${off.map(({ scheme }) => scheme).join(", ")})`;
    });
    fail("tokens", `sets no color in a scheme for ${where.join(", ")}`);
  }

  return () => {
    const unpainted = [];
    for (const [i, { scheme, scope }] of scopes.entries()) {
      const { resolved } = colors[i];
      const painted = getComputedStyle(scope);
      if (resolved["--bg"] && painted.backgroundColor !== resolved["--bg"]) {
        unpainted.push(
          `background ${painted.backgroundColor} is not --bg ${resolved["--bg"]} in ${scheme}`,
        );
      }
      if (resolved["--fg"] && painted.color !== resolved["--fg"]) {
        unpainted.push(`text ${painted.color} is not --fg ${resolved["--fg"]} in ${scheme}`);
      }
    }
    if (unpainted.length) fail("paints", `a scope's ${unpainted.join("; ")}`);

    const unordered = [];
    for (const { scheme, resolved } of colors) {
      const surfaces = ["--bg", "--bg-1", "--bg-2"];
      if (![...surfaces, "--fg"].every((token) => resolved[token])) continue;
      const text = luminance(resolved["--fg"]!);
      const distance = surfaces.map((token) => Math.abs(luminance(resolved[token]!) - text));
      if (!(distance[0] > distance[1] && distance[1] > distance[2])) unordered.push(scheme);
    }
    if (unordered.length) {
      fail(
        "surfaces",
        `--bg, --bg-1 and --bg-2 do not step toward --fg in ${unordered.join(", ")}`,
      );
    }

    const low = [];
    for (const { scheme, resolved } of colors) {
      if (!resolved["--fg"] || !resolved["--bg"]) continue;
      const ratio = contrast(resolved["--fg"], resolved["--bg"]);
      if (ratio < CONTRAST) {
        low.push(`${(Math.floor(ratio * 100) / 100).toFixed(2)}:1 in ${scheme}`);
      }
    }
    if (low.length) fail("contrast", `--fg on --bg is under ${CONTRAST}:1: ${low.join(", ")}`);
  };
}

function spaceTokens({ scopes: [{ probe }] }: Probes, fail: Fail): () => void {
  const broken = SPACE_VALUES.filter((token) => length(probe, token) === null);
  if (broken.length) fail("tokens", `sets no length for ${broken.join(", ")}`);

  return () => {
    if (broken.includes("--space-base")) return;
    const steps = STEPS.map((token) => length(probe, token));
    if (!ascending(steps)) {
      fail(
        "scale",
        `--space-3xs to --space-3xl compute to ${shown(steps)}, which do not strictly ascend`,
      );
    }
  };
}

function typeTokens({ scopes: [{ scope, probe }] }: Probes, fail: Fail): () => void {
  const own = getComputedStyle(scope);
  const broken = TYPE_VALUES.filter((token) => own.getPropertyValue(token).trim() === "");
  if (broken.length) fail("tokens", `sets no value for ${broken.join(", ")}`);

  return () => {
    const problems = [];
    const steps = TEXT.map((token) => length(probe, token));
    if (!ascending(steps)) {
      problems.push(
        `--text-xs to --text-4xl compute to ${shown(steps)}, which do not strictly ascend`,
      );
    }
    const inherited = getComputedStyle(probe.parentElement!).fontFamily;
    const unresolved = FONTS.filter((token) => {
      if (broken.includes(token)) return false;
      probe.style.fontFamily = `var(${token})`;
      const family = getComputedStyle(probe).fontFamily;
      return family === "" || family === inherited;
    });
    probe.style.fontFamily = "";
    if (unresolved.length) problems.push(`${unresolved.join(", ")} resolve to no font family`);
    if (problems.length) fail("scale", problems.join("; "));
  };
}

function length(probe: HTMLElement, token: string): number | null {
  const sum = (px: number) => {
    probe.style.marginLeft = `calc(var(${token}) + ${px}px)`;
    return Number.parseFloat(getComputedStyle(probe).marginLeft);
  };
  const [one, two] = [sum(1), sum(2)];
  probe.style.marginLeft = "";
  return Math.abs(two - one - 1) < 0.01 ? one - 1 : null;
}

function ascending(values: (number | null)[]): boolean {
  return values.every((value, i) => value !== null && (i === 0 || value > values[i - 1]!));
}

function shown(values: (number | null)[]): string {
  return values
    .map((value) => (value === null ? "no length" : `${+value.toFixed(3)}px`))
    .join(", ");
}

let context: CanvasRenderingContext2D | null = null;

function luminance(color: string): number {
  context ??= document.createElement("canvas").getContext("2d", { willReadFrequently: true })!;
  context.clearRect(0, 0, 1, 1);
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  const [r, g, b] = [...context.getImageData(0, 0, 1, 1).data.slice(0, 3)].map((channel) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(one: string, two: string): number {
  const [lighter, darker] = [luminance(one), luminance(two)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}
