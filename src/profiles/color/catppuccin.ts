// From spike-html-apps-foundation (07ba39a): src/profiles/color/catppuccin.ts.
// The Catppuccin unit's registration module, beside its sheet, catppuccin.css:
// importing it registers catppuccin under the color facet, and that is all. It loads no CSS: the
// page links the sheet.

import { register } from "../../registry.ts";

register("color", "catppuccin");
