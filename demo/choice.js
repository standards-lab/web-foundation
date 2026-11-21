// The theme and unit demo pages' controls: each select of form[data-choice] lists the names the
// page registered, shows the stored choice, and applies and saves a change through preferences.js.

import { apply, read, save, SCHEMES } from "../dist/preferences.js";
import { DEFAULTS, profiles } from "../dist/registry.js";

const form = document.querySelector("form[data-choice]");
const selects = [...form.querySelectorAll("select")];

for (const select of selects) {
  const names = select.name === "scheme" ? SCHEMES : profiles(select.name);
  select.replaceChildren(...names.map((name) => new Option(name)));
}

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
