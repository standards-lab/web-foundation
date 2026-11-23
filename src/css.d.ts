// A CSS module script, `import sheet from "./x.css" with { type: "css" }`: one CSSStyleSheet.

declare module "*.css" {
  const sheet: CSSStyleSheet;
  export default sheet;
}
