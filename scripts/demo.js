// mise run demo: serves the repository through web-tooling's static server, as the browser tier
// does, and prints the demo pages' URLs, which load dist/, until Ctrl-C.
// Adapted from spike-html-apps-foundation (07ba39a): scripts/demo.js, on @standards-lab/web-tooling.
// Adapted from spike-html-packages-foundation (5dd8a58): scripts/demo.js.

import { join } from "node:path";

import { serve } from "@standards-lab/web-tooling/server.js";

const server = await serve({ root: join(import.meta.dirname, "..") });
for (const page of [
  "tools",
  "profiles",
  "specimen",
  "theme",
  "unit",
  "keys",
  "format",
  "hooks",
  "utilities",
  "dialogs",
  "app",
  "prose",
]) {
  console.log(`${server.origin}/demo/${page}.html`);
}
process.once("SIGINT", async () => {
  await server.stop();
  process.exit(0);
});
