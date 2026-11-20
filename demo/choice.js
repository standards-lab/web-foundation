// The theme and unit demo pages' controls, a demo and not a foundation feature: each select of
// the page's form[data-choice], named for a key of a choice, lists the names this page registered
// (the schemes for scheme), shows the stored choice, and applies and saves a change through
// preferences.js. Another tab's save, which preferences.js applies, shows here too.

import { apply, read, save, SCHEMES } from "../dist/preferences.js";
import { DEFAULTS, profiles } from "../dist/registry.js";

const form = document.querySelector("form[data-choice]");
const selects = [...form.querySelectorAll("select")];

for (const select of selects) {
  const names = select.name === "scheme" ? SCHEMES : profiles(select.name);
  select.replaceChildren(...names.map((name) => new Option(name)));
}

/** Selects the stored choice, a name this page didn't register showing its default. */
function show() {
  const choice = read() ?? {};
  for (const select of selects) {
    const names = [...select.options].map((option) => option.value);
    const name = choice[select.name];
    select.value = names.includes(name) ? name : (DEFAULTS[select.name] ?? SCHEMES[0]);
  }
}

form.addEventListener("change", () => {
  const choice = Object.fromEntries(selects.map((select) => [select.name, select.value]));
  apply(choice);
  save(choice);
});
addEventListener("storage", show);
show();
