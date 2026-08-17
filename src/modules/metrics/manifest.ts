import { BarChart3 } from "lucide-react";

import {
  NAVIGATION_GROUP,
  NAVIGATION_SURFACE,
  type ModuleManifest,
} from "@/app/module-manifest";

import { DashboardPanel } from "./dashboard-panel";

export const metricsManifest: ModuleManifest = {
  id: "metrics",
  navigation: [
    {
      id: "dashboard",
      surface: NAVIGATION_SURFACE.ADMIN,
      group: NAVIGATION_GROUP.OPERATIONS,
      order: 10,
      labelKey: "admin:navigation.dashboard",
      icon: BarChart3,
      Component: DashboardPanel,
    },
  ],
};
