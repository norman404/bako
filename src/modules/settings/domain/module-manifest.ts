import type React from "react";
import type { LucideIcon } from "lucide-react";

export interface ModuleManifest {
  id: string;
  flagKey?: string;
  settingsPanel?: React.ComponentType;
  settingsLabel?: string;
  settingsIcon?: LucideIcon;
}
