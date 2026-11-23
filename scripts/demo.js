// mise run demo: serves the repository through web-tooling's static server, as the browser tier
// does, and prints the demo pages' URLs, which load dist/, until Ctrl-C.

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
