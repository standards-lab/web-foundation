// From spike-html-apps-foundation (07ba39a): src/profiles/type/sans.ts.
// The sans unit's registration module, beside its sheet, sans.css:
// importing it registers sans under the type facet, and that is all. It loads no CSS: the
// page links the sheet.

import { register } from "../../registry.ts";

register("type", "sans");
