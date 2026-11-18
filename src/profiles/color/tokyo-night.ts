// The Tokyo Night unit's registration module, beside its sheet, tokyo-night.css:
// importing it registers tokyo-night under the color facet, and that is all. It loads no CSS: the
// page links the sheet.

import { register } from "../../registry.ts";

register("color", "tokyo-night");
