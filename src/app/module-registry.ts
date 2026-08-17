import {
  validateModuleRegistry,
  type ModuleManifest,
} from "@/app/module-manifest";
import { checkoutManifest } from "@/modules/checkout/manifest";
import { menuManifest } from "@/modules/menu/manifest";
import { metricsManifest } from "@/modules/metrics/manifest";
import { printerManifest } from "@/modules/printer/manifest";
import { shiftReportsManifest } from "@/modules/shift-reports/manifest";
import { updaterManifest } from "@/modules/updater/manifest";

export const MODULE_REGISTRY: ModuleManifest[] = validateModuleRegistry([
  menuManifest,
  checkoutManifest,
  metricsManifest,
  printerManifest,
  shiftReportsManifest,
  updaterManifest,
]);
