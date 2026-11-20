// Adapted from spike-html-apps-foundation (07ba39a): src/format.ts, its header no longer naming
// the v0.1.0 declaration fixture, which isn't carried.
// The foundation's formatters: byte counts, dates, relative times, and durations, on the
// platform's Intl alone, and JSON text re-indented from its own tokens; no package and no other
// layer, and none touches the DOM.
// Adapted from spike-html-packages-foundation (5dd8a58): src/format.d.ts, its declarations given a
// runtime.
// The byte units Intl.NumberFormat sanctions, smallest first: unit i is 1000 ** i bytes.
const byteUnits = ["byte", "kilobyte", "megabyte", "gigabyte", "terabyte", "petabyte"];
/** A byte count in SI units, base 1000 (kB, MB, GB, ...), with Intl.NumberFormat's byte units. */
export function formatBytes(bytes, locale, options) {
    // The largest unit that keeps the value at 1 or more, by its magnitude, so a negative count
    // steps as its positive does; anything under 1 kB, NaN included, stays in bytes.
    let step = 0;
    while (step < byteUnits.length - 1 && Math.abs(bytes) >= 1000 ** (step + 1))
        step++;
    // At most one fraction digit by default, unless the caller sets either bound: a minimum above a
    // default maximum would throw.
    const fraction = options?.minimumFractionDigits === undefined && options?.maximumFractionDigits === undefined
        ? { maximumFractionDigits: 1 }
        : {};
    // The byte unit long by default, so Intl words and pluralizes it ("1 byte", "13 bytes"): en-US's
    // short byte is "byte" at every count. The units above it stay short ("1.5 kB"). A caller's own
    // unitDisplay wins at every unit.
    return new Intl.NumberFormat(locale, {
        unitDisplay: step === 0 ? "long" : "short",
        ...fraction,
        ...options,
        style: "unit",
        unit: byteUnits[step],
    }).format(bytes / 1000 ** step);
}
// The options that set a date or time field one by one, which Intl.DateTimeFormat refuses to mix
// with dateStyle or timeStyle.
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
];
/** `options` over `styles`, the styles dropped when `options` sets any field of its own. */
function withStyles(styles, options = {}) {
    const fields = dateTimeFields.some((field) => options[field] !== undefined);
    return fields ? options : { ...styles, ...options };
}
/** A calendar date, dateStyle "medium" by default. */
export function formatDate(date, locale, options) {
    return new Intl.DateTimeFormat(locale, withStyles({ dateStyle: "medium" }, options)).format(date);
}
/** A date and time, dateStyle "medium" and timeStyle "short" by default. */
export function formatDateTime(date, locale, options) {
    const styles = { dateStyle: "medium", timeStyle: "short" };
    return new Intl.DateTimeFormat(locale, withStyles(styles, options)).format(date);
}
const second = 1000;
const day = 86_400 * second;
// The relative units, largest first, each a fixed length: a month is 30 days and a year 365.
const relativeUnits = [
    ["year", 365 * day],
    ["month", 30 * day],
    ["week", 7 * day],
    ["day", day],
    ["hour", 3_600 * second],
    ["minute", 60 * second],
    ["second", second],
];
/** A date relative to now in its largest whole unit ("3 days ago", "in 2 hours"). */
export function formatRelative(date, locale, options) {
    const { now = Date.now(), ...format } = options ?? {};
    const difference = Number(date) - Number(now);
    // The largest unit the difference fills once, seconds when it fills none; truncated toward zero,
    // so 59 seconds is 59 seconds and 89 seconds is 1 minute, either way in time.
    const [unit, length] = relativeUnits.find(([, length]) => Math.abs(difference) >= length) ?? [
        "second",
        second,
    ];
    return new Intl.RelativeTimeFormat(locale, format).format(Math.trunc(difference / length), unit);
}
/** A duration given in milliseconds, in days, hours, minutes, and seconds, by Intl.DurationFormat. */
export function formatDuration(milliseconds, locale, options) {
    // Whole seconds, the fraction dropped toward zero, split into fields that share its sign, as
    // Intl.DurationFormat requires; `|| 0` turns a negative zero into zero.
    const total = Math.trunc(milliseconds / second);
    const duration = {
        days: Math.trunc(total / 86_400) || 0,
        hours: Math.trunc((total % 86_400) / 3_600) || 0,
        minutes: Math.trunc((total % 3_600) / 60) || 0,
        seconds: total % 60 || 0,
    };
    // Intl.DurationFormat prints "" when every field is zero, so a zero duration shows its seconds.
    const zero = total === 0 ? { secondsDisplay: "always" } : {};
    return new Intl.DurationFormat(locale, { style: "short", ...options, ...zero }).format(duration);
}
// JSON formatted from its own tokens: the text is walked once, token by token, and each token is
// emitted exactly as written, with two-space indentation between them. Nothing is parsed into a
// value and printed again, so the keys keep their order, duplicates included, numbers keep their
// literals, and strings keep their escapes; only the whitespace between tokens changes. A
// container deeper than JSON_MAX_DEPTH is kept as written, whole, so no indent grows past
// JSON_MAX_DEPTH's, and the output's length stays linear in the text's however deep it nests.
// Adapted from web-components (a659353): src/json.ts, its MAX_DEPTH renamed JSON_MAX_DEPTH, and
// artifact-viewer.ts' pretty as tryFormatJson.
// The indent of a depth, two spaces a level.
function indent(depth) {
    return "  ".repeat(depth);
}
// JSON's whitespace between tokens: space, tab, line feed, and carriage return.
function isSpace(code) {
    return code === 0x20 || code === 0x09 || code === 0x0a || code === 0x0d;
}
// Where a number or a literal ends: whitespace, or the punctuation that may follow a value.
function endsValue(code) {
    return isSpace(code) || code === 0x2c || code === 0x3a || code === 0x5d || code === 0x7d;
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
export function formatJson(text) {
    const out = [];
    const length = text.length;
    let depth = 0;
    let at = 0;
    // Past whitespace from `from`, the index of the next token, or the text's length.
    const skip = (from) => {
        while (from < length && isSpace(text.charCodeAt(from)))
            from++;
        return from;
    };
    // From a string's opening quote, the index of its closing one: the first quote no backslash
    // escapes, or the text's length.
    const stringEnd = (from) => {
        let end = from + 1;
        while (end < length) {
            const inner = text.charCodeAt(end);
            if (inner === 0x5c)
                end += 2;
            else if (inner === 0x22)
                break;
            else
                end++;
        }
        return end;
    };
    // From a container's opening bracket, the index past its matching closing one, strings skipped
    // whole so a bracket inside one never counts.
    const containerEnd = (from) => {
        let open = 0;
        let end = from;
        while (end < length) {
            const inner = text.charCodeAt(end);
            if (inner === 0x22)
                end = stringEnd(end);
            else if (inner === 0x7b || inner === 0x5b)
                open++;
            else if ((inner === 0x7d || inner === 0x5d) && --open === 0)
                return end + 1;
            end++;
        }
        return length;
    };
    while ((at = skip(at)) < length) {
        const code = text.charCodeAt(at);
        switch (code) {
            case 0x7b: // {
            case 0x5b: {
                // [
                if (depth === JSON_MAX_DEPTH) {
                    // Too deep to indent: the container as written, whole.
                    const end = containerEnd(at);
                    out.push(text.slice(at, end));
                    at = end;
                    break;
                }
                const next = skip(at + 1);
                const close = code === 0x7b ? 0x7d : 0x5d;
                if (text.charCodeAt(next) === close) {
                    out.push(code === 0x7b ? "{}" : "[]");
                    at = next + 1;
                }
                else {
                    depth++;
                    out.push(text[at], "\n", indent(depth));
                    at++;
                }
                break;
            }
            case 0x7d: // }
            case 0x5d: // ]
                depth--;
                out.push("\n", indent(depth), text[at]);
                at++;
                break;
            case 0x2c: // ,
                out.push(",\n", indent(depth));
                at++;
                break;
            case 0x3a: // :
                out.push(": ");
                at++;
                break;
            case 0x22: {
                // " : a string, as written.
                const end = stringEnd(at);
                out.push(text.slice(at, end + 1));
                at = end + 1;
                break;
            }
            default: {
                // A number, true, false, or null, as written.
                let end = at + 1;
                while (end < length && !endsValue(text.charCodeAt(end)))
                    end++;
                out.push(text.slice(at, end));
                at = end;
            }
        }
    }
    return out.join("");
}
/**
 * Any text as JSON to show: `{ ok: true, text }` when `JSON.parse` accepts it, `text` formatted by
 * `formatJson`, or the text unchanged when its formatting would pass the longest string; else
 * `{ ok: false, reason }`, the parser's message. `JSON.parse` decides validity alone and its value
 * is thrown away: printing the value would move integer-like keys first, rewrite numbers, and drop
 * duplicate keys.
 */
export function tryFormatJson(text) {
    try {
        JSON.parse(text);
    }
    catch (error) {
        return { ok: false, reason: error instanceof Error ? error.message : String(error) };
    }
    try {
        return { ok: true, text: formatJson(text) };
    }
    catch {
        // The only throw formatJson has: a RangeError, its output past the longest string.
        return { ok: true, text };
    }
}
