import type React from "react";
import type { LucideIcon } from "lucide-react";

export interface ModuleManifest {
  id: string;
  flagKey?: string;
  settingsPanel?: React.ComponentType;
  /** Optional i18n key (resolved in the `settings` namespace) for the tab label. */
  settingsLabelKey?: string;
  settingsLabel?: string;
  /** Optional i18n key (resolved in the `settings` namespace) for the tab description. */
  settingsDescriptionKey?: string;
  settingsIcon?: LucideIcon;
}
