import { productsManifest, categoriesManifest, menusManifest, modifierGroupsManifest } from "@/modules/menu/manifest";
import { checkoutManifest } from "@/modules/checkout/manifest";
import { printerManifest } from "@/modules/printer/manifest";
import { shiftReportsManifest } from "@/modules/shift-reports/manifest";
import { updaterManifest } from "@/modules/updater/manifest";
import type { ModuleManifest } from "@/modules/settings";

export const MODULE_REGISTRY: ModuleManifest[] = [
  productsManifest,
  categoriesManifest,
  menusManifest,
  modifierGroupsManifest,
  checkoutManifest,
  printerManifest,
  shiftReportsManifest,
  updaterManifest,
];
