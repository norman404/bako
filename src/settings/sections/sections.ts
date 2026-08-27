import type { ModuleNavigationEntry } from "@/app/module-manifest";

import { FEATURES_SECTION } from "./features";
import { GENERAL_SECTION } from "./general";
import { PRINTING_SECTION } from "./printing";
import { SYSTEM_SECTION } from "./system";

export const SETTINGS_SECTIONS: ModuleNavigationEntry[] = [
  GENERAL_SECTION,
  FEATURES_SECTION,
  PRINTING_SECTION,
  SYSTEM_SECTION,
];
