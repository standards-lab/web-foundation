// The GitHub unit's registration module, beside its sheet, github.css:
// importing it registers github under the color facet, and that is all. It loads no CSS: the
// page links the sheet.

import { register } from "../../registry.ts";

register("color", "github");
