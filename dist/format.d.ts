/** Options for formatBytes: Intl.NumberFormat's, less its style and unit, which it sets. */
export type BytesOptions = Omit<Intl.NumberFormatOptions, "style" | "unit">;
/** A byte count in SI units, base 1000 (kB, MB, GB, ...), with Intl.NumberFormat's byte units. */
export declare function formatBytes(bytes: number, locale?: Intl.LocalesArgument, options?: BytesOptions): string;
/** A calendar date, dateStyle "medium" by default. */
export declare function formatDate(date: Date | number, locale?: Intl.LocalesArgument, options?: Intl.DateTimeFormatOptions): string;
/** A date and time, dateStyle "medium" and timeStyle "short" by default. */
export declare function formatDateTime(date: Date | number, locale?: Intl.LocalesArgument, options?: Intl.DateTimeFormatOptions): string;
/** Options for formatRelative: Intl.RelativeTimeFormat's, and the moment it is relative to, the
 * current time by default. */
export interface RelativeOptions extends Intl.RelativeTimeFormatOptions {
    now?: Date | number;
}
/** A date relative to now in its largest whole unit ("3 days ago", "in 2 hours"). */
export declare function formatRelative(date: Date | number, locale?: Intl.LocalesArgument, options?: RelativeOptions): string;
/** Options for formatDuration: Intl.DurationFormat's style, "short" by default. */
export interface DurationOptions {
    style?: "long" | "short" | "narrow" | "digital";
}
/** A duration given in milliseconds, in days, hours, minutes, and seconds, by Intl.DurationFormat. */
export declare function formatDuration(milliseconds: number, locale?: Intl.LocalesArgument, options?: DurationOptions): string;
/**
 * The deepest container `formatJson` indents: the top-level object or array is depth 1, and a
 * container that would open at depth `JSON_MAX_DEPTH + 1` is kept as written, its brackets, its
 * tokens, and the whitespace between them, on the line where it opens.
 */
export declare const JSON_MAX_DEPTH = 64;
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
export declare function formatJson(text: string): string;
/** JSON text as `tryFormatJson` gives it: formatted, or, when it doesn't parse, the parser's
 * reason. */
export type FormattedJson = {
    ok: true;
    text: string;
} | {
    ok: false;
    reason: string;
};
/**
 * Any text as JSON to show: `{ ok: true, text }` when `JSON.parse` accepts it, `text` formatted by
 * `formatJson`, or the text unchanged when its formatting would pass the longest string; else
 * `{ ok: false, reason }`, the parser's message. `JSON.parse` decides validity alone and its value
 * is thrown away: printing the value would move integer-like keys first, rewrite numbers, and drop
 * duplicate keys.
 */
export declare function tryFormatJson(text: string): FormattedJson;
