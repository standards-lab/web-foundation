// Adapted from spike-html-apps-foundation (07ba39a): test/unit/format.test.ts, importing the
// package as @standards-lab/web-foundation.
// The formatters as a consumer imports them: the package's ./format.js export, which resolves to
// the dist/ mise run build wrote. Every case pins its locale, en-US, and a date's time zone, UTC.
// Adapted from web-components (a659353): test/browser/json.test.ts, its cases run in node rather
// than a page: keys in their order, integer-like keys and duplicates included;
// number literals and strings with their escapes as written; minified and oddly spaced text
// re-indented; empty, nested, scalar, and array documents; whitespace between tokens the only
// difference from the text; a document of about 1 MB formatted without a stall; and containers
// past JSON_MAX_DEPTH kept as written, so 20,000 levels format in output linear in the text.
// Its absolute bounds on the time taken are a ratio here instead: the time for a text four times
// as large, of the same shape, stays well under the sixteenfold a quadratic formatter takes, on a
// runner of any speed.

import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { FormattedJson, RelativeOptions } from "@standards-lab/web-foundation/format.js";
import {
  JSON_MAX_DEPTH,
  formatBytes,
  formatDate,
  formatDateTime,
  formatDuration,
  formatJson,
  formatRelative,
  tryFormatJson,
} from "@standards-lab/web-foundation/format.js";

const LOCALE = "en-US";
const UTC = { timeZone: "UTC" };

describe("formatBytes", () => {
  test("picks the largest base-1000 unit that keeps the value at 1 or more", () => {
    assert.equal(formatBytes(0, LOCALE), "0 bytes");
    assert.equal(formatBytes(999, LOCALE), "999 bytes");
    assert.equal(formatBytes(1000, LOCALE), "1 kB");
    assert.equal(formatBytes(1500, LOCALE), "1.5 kB");
    assert.equal(formatBytes(2.5e6, LOCALE), "2.5 MB");
    assert.equal(formatBytes(1e9, LOCALE), "1 GB");
    assert.equal(formatBytes(1e12, LOCALE), "1 TB");
    assert.equal(formatBytes(1e15, LOCALE), "1 PB");
    // Past a petabyte it stays in petabytes.
    assert.equal(formatBytes(2e18, LOCALE), "2,000 PB");
  });

  test("steps a negative count by its magnitude", () => {
    assert.equal(formatBytes(-1500, LOCALE), "-1.5 kB");
  });

  test("words the byte unit in full, so Intl pluralizes it", () => {
    assert.equal(formatBytes(0, LOCALE), "0 bytes");
    assert.equal(formatBytes(1, LOCALE), "1 byte");
    assert.equal(formatBytes(13, LOCALE), "13 bytes");
    assert.equal(formatBytes(999, LOCALE), "999 bytes");
    // The units above it stay short.
    assert.equal(formatBytes(1000, LOCALE), "1 kB");
  });

  test("leaves the byte unit's plural and its word to the locale", () => {
    // French's short byte unit is "o", whatever the count; its long one pluralizes. French sets
    // the byte unit off by a no-break space and the short ones by a narrow no-break space.
    assert.equal(formatBytes(1, "fr"), "1\u00a0octet");
    assert.equal(formatBytes(13, "fr"), "13\u00a0octets");
    assert.equal(formatBytes(1500, "fr"), "1,5\u202fko");
  });

  test("keeps a caller's unitDisplay for the byte unit too", () => {
    assert.equal(formatBytes(13, LOCALE, { unitDisplay: "short" }), "13 byte");
    assert.equal(formatBytes(13, LOCALE, { unitDisplay: "narrow" }), "13B");
  });

  // An independent byte formatter, stepping by log10 to at most gigabytes at one fraction digit,
  // the byte unit long and the others short, for the counts it handles: none past a gigabyte's
  // unit, none negative.
  const entryUnits = ["byte", "kilobyte", "megabyte", "gigabyte"].map(
    (unit) =>
      new Intl.NumberFormat(LOCALE, {
        style: "unit",
        unit,
        unitDisplay: unit === "byte" ? "long" : "short",
        maximumFractionDigits: 1,
      }),
  );
  const entrySize = (bytes: number) => {
    const step = Math.min(Math.floor(Math.log10(Math.max(bytes, 1)) / 3), entryUnits.length - 1);
    return entryUnits[step].format(bytes / 1000 ** step);
  };

  test("its defaults print what an independent one-fraction-digit formatter prints", () => {
    const counts = [0, 1, 999, 1000, 1049, 1050, 12_345, 999_949, 999_950, 1e6, 123_456_789, 4.2e9];
    for (const bytes of counts)
      assert.equal(formatBytes(bytes, LOCALE), entrySize(bytes), String(bytes));
  });

  test("passes the caller's other NumberFormat options through", () => {
    assert.equal(formatBytes(1234, LOCALE, { maximumFractionDigits: 3 }), "1.234 kB");
    assert.equal(formatBytes(1500, LOCALE, { unitDisplay: "long" }), "1.5 kilobytes");
    assert.equal(formatBytes(1000, LOCALE, { minimumFractionDigits: 2 }), "1.00 kB");
  });

  test("keeps its own style and unit over a caller's", () => {
    // BytesOptions omits both, so it's a caller holding a whole NumberFormatOptions that passes them.
    const theirs: Intl.NumberFormatOptions = { style: "percent", unit: "meter" };
    assert.equal(formatBytes(1500, LOCALE, theirs), "1.5 kB");
  });
});

// 2026-03-04 05:06:07 UTC.
const moment = Date.UTC(2026, 2, 4, 5, 6, 7);

describe("formatDate and formatDateTime", () => {
  test("formatDate defaults to dateStyle medium", () => {
    assert.equal(formatDate(moment, LOCALE, UTC), "Mar 4, 2026");
    assert.equal(formatDate(new Date(moment), LOCALE, UTC), "Mar 4, 2026");
  });

  test("formatDateTime adds timeStyle short", () => {
    assert.equal(formatDateTime(moment, LOCALE, UTC), "Mar 4, 2026, 5:06 AM");
  });

  test("a caller's own field replaces the defaults instead of throwing", () => {
    assert.equal(formatDate(moment, LOCALE, { year: "numeric", ...UTC }), "2026");
    assert.equal(formatDateTime(moment, LOCALE, { hour: "numeric", ...UTC }), "5 AM");
    const fields = {
      month: "long",
      day: "2-digit",
      weekday: "short",
      era: "short",
      minute: "numeric",
      second: "numeric",
      fractionalSecondDigits: 2,
      dayPeriod: "narrow",
      timeZoneName: "short",
    };
    for (const [field, value] of Object.entries(fields)) {
      const options = { [field]: value, ...UTC };
      assert.doesNotThrow(() => formatDate(moment, LOCALE, options), field);
      assert.doesNotThrow(() => formatDateTime(moment, LOCALE, options), field);
    }
  });

  test("a caller's style replaces the default style it names", () => {
    assert.equal(formatDate(moment, LOCALE, { dateStyle: "short", ...UTC }), "3/4/26");
    assert.equal(formatDateTime(moment, LOCALE, { dateStyle: "short", ...UTC }), "3/4/26, 5:06 AM");
  });
});

const SECOND = 1000;
const DAY = 86_400 * SECOND;

describe("formatRelative", () => {
  /** `offset` milliseconds from a fixed now, formatted relative to it. */
  const relative = (offset: number, options: RelativeOptions = {}) =>
    formatRelative(moment + offset, LOCALE, { now: moment, ...options });

  test("seconds up to a minute, then the largest whole unit", () => {
    assert.equal(relative(-59 * SECOND), "59 seconds ago");
    assert.equal(relative(-60 * SECOND), "1 minute ago");
    assert.equal(relative(-60 * 60 * SECOND), "1 hour ago");
    assert.equal(relative(-DAY), "1 day ago");
    assert.equal(relative(-6 * DAY), "6 days ago");
    assert.equal(relative(-7 * DAY), "1 week ago");
    assert.equal(relative(-29 * DAY), "4 weeks ago");
    assert.equal(relative(-30 * DAY), "1 month ago");
    assert.equal(relative(-364 * DAY), "12 months ago");
    assert.equal(relative(-365 * DAY), "1 year ago");
  });

  test("works in the future, as in the past", () => {
    assert.equal(relative(59 * SECOND), "in 59 seconds");
    assert.equal(relative(60 * SECOND), "in 1 minute");
    assert.equal(relative(7 * DAY), "in 1 week");
    assert.equal(relative(30 * DAY), "in 1 month");
    assert.equal(relative(365 * DAY), "in 1 year");
  });

  test("truncates toward zero", () => {
    assert.equal(relative(-119 * SECOND), "1 minute ago");
    assert.equal(relative(119 * SECOND), "in 1 minute");
    assert.equal(relative(-1500), "1 second ago");
    assert.equal(relative(0), "in 0 seconds");
  });

  test("takes now as a Date, and passes RelativeTimeFormat's options through", () => {
    const now = new Date(moment);
    assert.equal(formatRelative(moment - DAY, LOCALE, { now }), "1 day ago");
    assert.equal(relative(-DAY, { numeric: "auto" }), "yesterday");
    assert.equal(relative(-2 * DAY, { style: "short" }), "2 days ago");
  });

  test("is relative to the current time without now", () => {
    assert.equal(formatRelative(Date.now() - 3 * DAY - 1000, LOCALE), "3 days ago");
    assert.equal(formatRelative(new Date(Date.now() + 2 * DAY + 60_000), LOCALE), "in 2 days");
  });
});

describe("formatDuration", () => {
  test("zero and anything under a second print zero seconds", () => {
    assert.equal(formatDuration(0, LOCALE), "0 sec");
    assert.equal(formatDuration(999, LOCALE), "0 sec");
    assert.equal(formatDuration(-999, LOCALE), "0 sec");
  });

  test("whole seconds, the fraction rounded down", () => {
    assert.equal(formatDuration(1000, LOCALE), "1 sec");
    assert.equal(formatDuration(1999, LOCALE), "1 sec");
  });

  test("splits into days, hours, minutes, and seconds", () => {
    const span = 2 * DAY + 3 * 3_600_000 + 4 * 60_000 + 5 * SECOND + 678;
    assert.equal(formatDuration(span, LOCALE), "2 days, 3 hr, 4 min, 5 sec");
    assert.equal(formatDuration(90 * 60_000, LOCALE), "1 hr, 30 min");
    assert.equal(formatDuration(-90 * 60_000, LOCALE), "-1 hr, 30 min");
  });

  test("takes Intl.DurationFormat's style", () => {
    const span = 3_600_000 + 5 * SECOND;
    assert.equal(formatDuration(span, LOCALE, { style: "long" }), "1 hour, 5 seconds");
    assert.equal(formatDuration(span, LOCALE, { style: "narrow" }), "1h 5s");
    assert.equal(formatDuration(span, LOCALE, { style: "digital" }), "1:00:05");
    assert.equal(formatDuration(0, LOCALE, { style: "long" }), "0 seconds");
  });
});

/** The text with the whitespace between its tokens removed, its strings' whitespace kept. */
const tokensOf = (text: string): string =>
  text.replace(/("(?:[^"\\]|\\.)*")|[ \t\n\r]+/g, (_, string?: string) => string ?? "");

/** The deepest level formatJson indents. */
const MAX = JSON_MAX_DEPTH;

/** Two spaces a level, as formatJson indents. */
const indent = (depth: number): string => "  ".repeat(depth);

/**
 * The fewest milliseconds, of five samples after one to warm it, that formatJson takes over the
 * text `calls` times: the fastest sample is the one least slowed by the runner's other work.
 */
const fastest = (text: string, calls = 1): number => {
  formatJson(text);
  let best = Infinity;
  for (let sample = 0; sample < 5; sample++) {
    const start = performance.now();
    for (let call = 0; call < calls; call++) formatJson(text);
    best = Math.min(best, performance.now() - start);
  }
  return best;
};

/**
 * Below 8, twice the 4 a linear formatter's time grows by for a text four times as large, and
 * half the 16 a quadratic one's does.
 */
const LINEAR_BOUND = 8;

describe("formatJson", () => {
  const cases: Record<string, [string, string]> = {
    "keys in their order, integer-like keys where they stand": [
      '{"b":1,"10":2,"2":3,"a":4}',
      '{\n  "b": 1,\n  "10": 2,\n  "2": 3,\n  "a": 4\n}',
    ],
    "number literals as written": [
      "[1.0,-0,1e3,1E-7,9007199254740993,0.10,-12.5e+02]",
      "[\n  1.0,\n  -0,\n  1e3,\n  1E-7,\n  9007199254740993,\n  0.10,\n  -12.5e+02\n]",
    ],
    "duplicate keys, each kept": ['{"a":1,"a":2,"a":3}', '{\n  "a": 1,\n  "a": 2,\n  "a": 3\n}'],
    "strings with their escapes, byte for byte": [
      String.raw`{"q\"k":"say \"hi\"","path":"C:\\dir\\","e":"caf\u00e9 é","nl":"a\nb\/c","sp":"  { [ , : ] }  "}`,
      String.raw`{
  "q\"k": "say \"hi\"",
  "path": "C:\\dir\\",
  "e": "caf\u00e9 é",
  "nl": "a\nb\/c",
  "sp": "  { [ , : ] }  "
}`,
    ],
    "minified text, indented two spaces a depth": [
      '{"id":"run-1","stages":[{"name":"classify","outputs":3,"ok":true,"err":null}],"done":false}',
      '{\n  "id": "run-1",\n  "stages": [\n    {\n      "name": "classify",\n      "outputs": 3,\n' +
        '      "ok": true,\n      "err": null\n    }\n  ],\n  "done": false\n}',
    ],
    "oddly spaced text, normalized": [
      '\r\n  {  "a"\t:\n[ 1 ,\n\n 2 ]  ,"b" :{ }\n,   "c":[\t]}  \n',
      '{\n  "a": [\n    1,\n    2\n  ],\n  "b": {},\n  "c": []\n}',
    ],
    "nested empty objects and arrays": [
      '{"a":{},"b":[],"c":[{}, [ ], {"d":{ }}]}',
      '{\n  "a": {},\n  "b": [],\n  "c": [\n    {},\n    [],\n    {\n      "d": {}\n    }\n  ]\n}',
    ],
    "an empty object at the top": ["{ }", "{}"],
    "an empty array at the top": ["[\n]", "[]"],
    "a top-level array": [
      '[1,"two",[3],{"four":4}]',
      '[\n  1,\n  "two",\n  [\n    3\n  ],\n  {\n    "four": 4\n  }\n]',
    ],
    "a top-level string": ['  "a \\"b\\""  ', '"a \\"b\\""'],
    "a top-level number": [" 1.50E+3 ", "1.50E+3"],
    "a top-level literal": ["\nnull\n", "null"],
  };
  for (const [kind, [text, expected]] of Object.entries(cases)) {
    test(`formats ${kind}`, () => {
      const output = formatJson(text);
      assert.equal(output, expected);
      assert.equal(tokensOf(output), tokensOf(text), "only whitespace between tokens changed");
    });
  }

  test("changes only the whitespace between tokens, over a document of every kind", () => {
    const text =
      ' { "z" : [ 1.0 , -0 , 1e3 , { "10" : "a\\u0000\\t b" , "2" : [ ] } ] , "z" : { "y" : ' +
      'true , "x" : false , "w" : null } , "\\ud83d\\ude00" : "😀" , "big" : 9007199254740993 } ';
    const output = formatJson(text);
    assert.equal(tokensOf(output), tokensOf(text));
    assert.ok(!/[ \t\r]\n|\n\n/.test(output), "no trailing space and no blank line");
  });

  test("formats about 1 MB of JSON without a stall", (t) => {
    // 6,000 records of nested objects, arrays, strings with escapes, and numbers, minified.
    const record = (i: number) => ({
      id: `run-${i}`,
      "10": i,
      "2": -i * 1.5,
      note: `line "${i}"\n\u00e9`,
      stages: [
        { name: "classify", outputs: [i, i + 1, i + 2], ok: true },
        { name: "summarize", err: null },
      ],
      meta: {},
    });
    const records = (count: number) =>
      JSON.stringify(Array.from({ length: count }, (_, i) => record(i)));
    const text = records(6000);
    const quarter = records(1500);
    const output = formatJson(text);
    const bytes = new TextEncoder().encode(text).length;
    assert.ok(bytes > 900_000, `the document is ${bytes} bytes`);
    assert.equal(tokensOf(output), text, "only whitespace between tokens changed");
    const ms = fastest(text);
    const ratio = ms / fastest(quarter);
    t.diagnostic(`${bytes} bytes to ${output.split("\n").length} lines in ${ms.toFixed(1)} ms`);
    t.diagnostic(`${ratio.toFixed(1)} times the time of a quarter of the records`);
    assert.ok(ratio < LINEAR_BOUND, `four times the records took ${ratio} times as long`);
  });

  test("indents every level of text nested JSON_MAX_DEPTH deep", () => {
    const text = "[".repeat(MAX) + "1" + "]".repeat(MAX);
    const opening = Array.from({ length: MAX }, (_, depth) => `${indent(depth)}[`);
    const closing = Array.from({ length: MAX }, (_, depth) => `${indent(MAX - 1 - depth)}]`);
    const expected = [...opening, `${indent(MAX)}1`, ...closing].join("\n");
    const output = formatJson(text);
    assert.equal(output, expected);
    assert.equal(tokensOf(output), tokensOf(text), "only whitespace between tokens changed");
  });

  test("keeps a container that would open past JSON_MAX_DEPTH as written, on its line", () => {
    // Arrays to one level short of the cap, an object at the cap, and in it an array past it,
    // spaced oddly, a string with brackets in it, and a member after it, where the formatting
    // resumes.
    const inner = '[ 1 ,{"b" : "] }"} ,\t[ ] ]';
    const text = "[".repeat(MAX - 1) + `{"a":${inner} , "c":3}` + "]".repeat(MAX - 1);
    const opening = Array.from({ length: MAX - 1 }, (_, depth) => `${indent(depth)}[`);
    const closing = Array.from({ length: MAX - 1 }, (_, depth) => `${indent(MAX - 2 - depth)}]`);
    const object = [`${indent(MAX - 1)}{`, `${indent(MAX)}"a": ${inner},`, `${indent(MAX)}"c": 3`];
    const expected = [...opening, ...object, `${indent(MAX - 1)}}`, ...closing].join("\n");
    const output = formatJson(text);
    assert.equal(output, expected);
    assert.equal(tokensOf(output), tokensOf(text), "only whitespace between tokens changed");
  });

  test("keeps a container past JSON_MAX_DEPTH whole when its strings hold quotes and brackets", () => {
    // Past the cap, an object whose key holds an opening brace, an escaped quote before closing
    // brackets, and an escaped backslash before a string's real end; then, back at the cap, a
    // string holding the brackets that would close it. A count fooled by any of them ends the kept
    // container early or late, and the text after it shows indented differently or not at all.
    const kept = String.raw`{"{k\"": [ "\"]}", "\\", {"[" :"}]"} ] }`;
    const after = String.raw`"]]}\"["`;
    const text = "[".repeat(MAX) + `${kept},${after}` + "]".repeat(MAX);
    const opening = Array.from({ length: MAX }, (_, depth) => `${indent(depth)}[`);
    const closing = Array.from({ length: MAX }, (_, depth) => `${indent(MAX - 1 - depth)}]`);
    const inner = [`${indent(MAX)}${kept},`, `${indent(MAX)}${after}`];
    const output = formatJson(text);
    assert.equal(output, [...opening, ...inner, ...closing].join("\n"));
    assert.equal(tokensOf(output), tokensOf(text), "only whitespace between tokens changed");
  });

  test("formats text nested 20,000 deep in output linear in its length, without a stall", (t) => {
    // The JSON_MAX_DEPTH levels formatted add a line break and at most 2 * JSON_MAX_DEPTH spaces
    // of indent at each of their opening and closing brackets; the levels below are kept as
    // written.
    // Its time against 80,000 levels', each sample twenty calls long, so it's measured in
    // milliseconds rather than the timer's noise.
    const nested = (levels: number) => "[".repeat(levels) + " 1 " + "]".repeat(levels);
    const text = nested(20000);
    const output = formatJson(text);
    const kept = "[".repeat(20000 - MAX) + " 1 " + "]".repeat(20000 - MAX);
    const ms = fastest(text, 20);
    const ratio = fastest(nested(80000), 20) / ms;
    t.diagnostic(`${text.length} characters to ${output.length}; ${ms.toFixed(1)} ms for 20 calls`);
    t.diagnostic(`${ratio.toFixed(1)} times the time at four times the depth`);
    assert.ok(output.length <= text.length + 4 * MAX * MAX, `${output.length} from ${text.length}`);
    assert.equal(output.replace(/[ \n]+/g, ""), text.replace(/ /g, ""));
    assert.ok(
      output.includes(`\n${indent(MAX)}${kept}\n`),
      "levels past the cap kept, on their line",
    );
    assert.ok(ratio < LINEAR_BOUND, `four times the depth took ${ratio} times as long`);
  });
});

describe("tryFormatJson", () => {
  test("formats text JSON.parse accepts, as formatJson does", () => {
    const text = '{"b":1,"a":[true,null]}';
    const result: FormattedJson = tryFormatJson(text);
    assert.deepEqual(result, { ok: true, text: formatJson(text) });
  });

  test("formats text nested 20,000 deep, which JSON.parse accepts", () => {
    const text = "[".repeat(20000) + "1" + "]".repeat(20000);
    assert.deepEqual(tryFormatJson(text), { ok: true, text: formatJson(text) });
  });

  test("gives the parser's message for text JSON.parse refuses", () => {
    for (const text of ["", "{", '{"a":1,}', "[1 2]", "{'a':1}", "undefined"]) {
      let reason = "";
      try {
        JSON.parse(text);
      } catch (error) {
        reason = (error as Error).message;
      }
      assert.notEqual(reason, "", `JSON.parse refuses ${JSON.stringify(text)}`);
      assert.deepEqual(tryFormatJson(text), { ok: false, reason });
    }
  });

  test("gives the text unchanged when its formatting would pass the longest string", () => {
    // Ones in an array at JSON_MAX_DEPTH, about 8 MB: each element formats to a comma, a line
    // break and 2 * JSON_MAX_DEPTH spaces of indent, past V8's longest string, 2 ** 29 - 24
    // characters, so formatJson throws a RangeError.
    const ones = Math.ceil(2 ** 29 / (2 * MAX + 3));
    const text = "[".repeat(MAX) + "1,".repeat(ones) + "1" + "]".repeat(MAX);
    assert.throws(() => formatJson(text), RangeError);
    assert.deepEqual(tryFormatJson(text), { ok: true, text });
  });
});
