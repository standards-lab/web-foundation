// From spike-html-apps-foundation (07ba39a): src/css.d.ts.
// From spike-html-packages-foundation (5dd8a58): src/css.d.ts.
// A CSS module script, `import sheet from "./x.css" with { type: "css" }`: one CSSStyleSheet.

declare module "*.css" {
  const sheet: CSSStyleSheet;
  export default sheet;
}
