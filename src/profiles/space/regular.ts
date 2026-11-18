// From spike-html-apps-foundation (07ba39a): src/profiles/space/regular.ts.
// The regular unit's registration module, beside its sheet, regular.css:
// importing it registers regular under the space facet, and that is all. It loads no CSS: the
// page links the sheet.

import { register } from "../../registry.ts";

register("space", "regular");
