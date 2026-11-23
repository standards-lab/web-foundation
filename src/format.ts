// The foundation's formatters: byte counts, dates, relative times, and durations, on the
// platform's Intl alone, and JSON text re-indented from its own tokens; no package and no other
// layer, and none touches the DOM.

/** Options for formatBytes: Intl.NumberFormat's, less its style and unit, which it sets. */
export type BytesOptions = Omit<Intl.NumberFormatOptions, "style" | "unit">;

const byteUnits = ["byte", "kilobyte", "megabyte", "gigabyte", "terabyte", "petabyte"];

/**
 * A byte count in SI units, base 1000 (kB, MB, GB, ...), with Intl.NumberFormat's byte units: the
 * largest unit that keeps the count's magnitude at 1 or more, bytes under 1 kB or for NaN. Bytes
 * are long ("1 byte", "13 bytes") and the larger units short ("1.5 kB"), unless `unitDisplay` is
 * set; at most one fraction digit, unless either fraction-digit bound is set.
 */
export function formatBytes(
  bytes: number,
  locale?: Intl.LocalesArgument,
  options?: BytesOptions,
): string {
  let step = 0;
  while (step < byteUnits.length - 1 && Math.abs(bytes) >= 1000 ** (step + 1)) step++;
  const fraction =
    options?.minimumFractionDigits === undefined && options?.maximumFractionDigits === undefined
      ? { maximumFractionDigits: 1 }
      : {};
  return new Intl.NumberFormat(locale, {
    unitDisplay: step === 0 ? "long" : "short",
    ...fraction,
    ...options,
    style: "unit",
    unit: byteUnits[step],
  }).format(bytes / 1000 ** step);
}

const dateTimeFields = [
  "year",
  "month",
  "day",
  "weekday",
  "era",
  "hour",
  "minute",
  "second",
  "fractionalSecondDigits",
  "dayPeriod",
  "timeZoneName",
] as const;

function withStyles(
  styles: Intl.DateTimeFormatOptions,
  options: Intl.DateTimeFormatOptions = {},
): Intl.DateTimeFormatOptions {
  const fields = dateTimeFields.some((field) => options[field] !== undefined);
  return fields ? options : { ...styles, ...options };
}

/** A calendar date, dateStyle "medium" by default. */
export function formatDate(
  date: Date | number,
  locale?: Intl.LocalesArgument,
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(locale, withStyles({ dateStyle: "medium" }, options)).format(date);
}

/** A date and time, dateStyle "medium" and timeStyle "short" by default. */
export function formatDateTime(
  date: Date | number,
  locale?: Intl.LocalesArgument,
  options?: Intl.DateTimeFormatOptions,
): string {
  const styles: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" };
  return new Intl.DateTimeFormat(locale, withStyles(styles, options)).format(date);
}

/** Options for formatRelative: Intl.RelativeTimeFormat's, and the moment it is relative to, the
 * current time by default. */
export interface RelativeOptions extends Intl.RelativeTimeFormatOptions {
  now?: Date | number;
}

const second = 1000;
const day = 86_400 * second;
const relativeUnits: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * day],
  ["month", 30 * day],
  ["week", 7 * day],
  ["day", day],
  ["hour", 3_600 * second],
  ["minute", 60 * second],
  ["second", second],
];

/**
 * A date relative to now in its largest whole unit ("3 days ago", "in 2 hours"), truncated toward
 * zero, seconds when it fills no unit; a month is 30 days and a year 365.
 */
export function formatRelative(
  date: Date | number,
  locale?: Intl.LocalesArgument,
  options?: RelativeOptions,
): string {
  const { now = Date.now(), ...format } = options ?? {};
  const difference = Number(date) - Number(now);
  const [unit, length] = relativeUnits.find(([, length]) => Math.abs(difference) >= length) ?? [
    "second",
    second,
  ];
  return new Intl.RelativeTimeFormat(locale, format).format(Math.trunc(difference / length), unit);
}

/** Options for formatDuration: Intl.DurationFormat's style, "short" by default. */
export interface DurationOptions {
  style?: "long" | "short" | "narrow" | "digital";
}

/**
 * A duration given in milliseconds, in days, hours, minutes, and whole seconds, by
 * Intl.DurationFormat; a zero duration shows its seconds.
 */
export function formatDuration(
  milliseconds: number,
  locale?: Intl.LocalesArgument,
  options?: DurationOptions,
): string {
  const total = Math.trunc(milliseconds / second);
  const duration = {
    days: Math.trunc(total / 86_400) || 0,
    hours: Math.trunc((total % 86_400) / 3_600) || 0,
    minutes: Math.trunc((total % 3_600) / 60) || 0,
    seconds: total % 60 || 0,
  };
  const zero = total === 0 ? { secondsDisplay: "always" as const } : {};
  return new Intl.DurationFormat(locale, { style: "short", ...options, ...zero }).format(duration);
}

const SPACE = 0x20;
const TAB = 0x09;
const LINE_FEED = 0x0a;
const CARRIAGE_RETURN = 0x0d;
const QUOTE = 0x22;
const COMMA = 0x2c;
const COLON = 0x3a;
const OPEN_BRACKET = 0x5b;
const BACKSLASH = 0x5c;
const CLOSE_BRACKET = 0x5d;
const OPEN_BRACE = 0x7b;
const CLOSE_BRACE = 0x7d;

function indent(depth: number): string {
  return "  ".repeat(depth);
}

function isSpace(code: number): boolean {
  return code === SPACE || code === TAB || code === LINE_FEED || code === CARRIAGE_RETURN;
}

function endsValue(code: number): boolean {
  return (
    isSpace(code) ||
    code === COMMA ||
    code === COLON ||
    code === CLOSE_BRACKET ||
    code === CLOSE_BRACE
  );
}

/**
 * The deepest container `formatJson` indents: the top-level object or array is depth 1, and a
 * container that would open at depth `JSON_MAX_DEPTH + 1` is kept as written, its brackets, its
 * tokens, and the whitespace between them, on the line where it opens.
 */
export const JSON_MAX_DEPTH = 64;

/**
 * Valid JSON text, re-indented: each member or element on its own line, two spaces an indent per
 * depth, `": "` after each key, and an empty object or array as `{}` or `[]`. Every token, a
 * string with its escapes, a number, `true`, `false`, or `null`, and each punctuation mark,
 * appears as the text wrote it and in its order; whitespace outside strings is the only thing that
 * changes. The text must be valid JSON, as `JSON.parse` accepts it: the walk reads tokens without
 * checking their grammar, so it never decides whether the text is valid, and its output for text
 * that isn't is unspecified; `tryFormatJson` checks first. Containers to `JSON_MAX_DEPTH` deep are
 * indented; one that would open deeper is kept as written, from its opening bracket to its
 * matching closing one, on the line where it opens, and formatting resumes after it. Each token in
 * the outer `JSON_MAX_DEPTH` levels adds at most a line break and an indent of
 * `2 * JSON_MAX_DEPTH` spaces, so the output's length is linear in the text's, at any depth; only
 * text whose output passes the longest string throws, a RangeError.
 */
export function formatJson(text: string): string {
  const out: string[] = [];
  const length = text.length;
  let depth = 0;
  let at = 0;
  const skip = (from: number): number => {
    while (from < length && isSpace(text.charCodeAt(from))) from++;
    return from;
  };
  const stringEnd = (from: number): number => {
    let end = from + 1;
    while (end < length) {
      const inner = text.charCodeAt(end);
      if (inner === BACKSLASH) end += 2;
      else if (inner === QUOTE) break;
      else end++;
    }
    return end;
  };
  const containerEnd = (from: number): number => {
    let open = 0;
    let end = from;
    while (end < length) {
      const inner = text.charCodeAt(end);
      if (inner === QUOTE) end = stringEnd(end);
      else if (inner === OPEN_BRACE || inner === OPEN_BRACKET) open++;
      else if ((inner === CLOSE_BRACE || inner === CLOSE_BRACKET) && --open === 0) return end + 1;
      end++;
    }
    return length;
  };
  while ((at = skip(at)) < length) {
    const code = text.charCodeAt(at);
    switch (code) {
      case OPEN_BRACE:
      case OPEN_BRACKET: {
        if (depth === JSON_MAX_DEPTH) {
          const end = containerEnd(at);
          out.push(text.slice(at, end));
          at = end;
          break;
        }
        const next = skip(at + 1);
        const close = code === OPEN_BRACE ? CLOSE_BRACE : CLOSE_BRACKET;
        if (text.charCodeAt(next) === close) {
          out.push(code === OPEN_BRACE ? "{}" : "[]");
          at = next + 1;
        } else {
          depth++;
          out.push(text[at], "\n", indent(depth));
          at++;
        }
        break;
      }
      case CLOSE_BRACE:
      case CLOSE_BRACKET:
        depth--;
        out.push("\n", indent(depth), text[at]);
        at++;
        break;
      case COMMA:
        out.push(",\n", indent(depth));
        at++;
        break;
      case COLON:
        out.push(": ");
        at++;
        break;
      case QUOTE: {
        const end = stringEnd(at);
        out.push(text.slice(at, end + 1));
        at = end + 1;
        break;
      }
      default: {
        let end = at + 1;
        while (end < length && !endsValue(text.charCodeAt(end))) end++;
        out.push(text.slice(at, end));
        at = end;
      }
    }
  }
  return out.join("");
}

/** JSON text as `tryFormatJson` gives it: formatted, or, when it doesn't parse, the parser's
 * reason. */
export type FormattedJson = { ok: true; text: string } | { ok: false; reason: string };

/**
 * Any text as JSON to show: `{ ok: true, text }` when `JSON.parse` accepts it, `text` formatted by
 * `formatJson`, or the text unchanged when its formatting would pass the longest string; else
 * `{ ok: false, reason }`, the parser's message. `JSON.parse` decides validity alone and its value
 * is thrown away: printing the value would move integer-like keys first, rewrite numbers, and drop
 * duplicate keys.
 */
export function tryFormatJson(text: string): FormattedJson {
  try {
    JSON.parse(text);
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
  try {
    return { ok: true, text: formatJson(text) };
  } catch {
    return { ok: true, text };
  }
}
