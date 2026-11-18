// The Zenwritten unit's registration module, beside its sheet, zenwritten.css:
// importing it registers zenwritten under the color facet, and that is all. It loads no CSS: the
// page links the sheet.
import { register } from "../../registry.js";
register("color", "zenwritten");
