import { Clock } from "lucide-react";

import {
  NAVIGATION_GROUP,
  NAVIGATION_SURFACE,
  type ModuleManifest,
} from "@/app/module-manifest";

import { ShiftControlPanel } from "./components/ShiftControlPanel";

export const shiftReportsManifest: ModuleManifest = {
  id: "shift-reports",
  navigation: [
    {
      id: "shifts",
      surface: NAVIGATION_SURFACE.ADMIN,
      group: NAVIGATION_GROUP.OPERATIONS,
      order: 20,
      labelKey: "admin:navigation.shifts",
      icon: Clock,
      Component: ShiftControlPanel,
      flagKey: "shift_management_enabled",
    },
  ],
};
