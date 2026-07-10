import { productsManifest, categoriesManifest, menusManifest, modifierGroupsManifest } from "@/modules/menu/manifest";
import { checkoutManifest } from "@/modules/checkout/manifest";
import { deliveryPersonsManifest, deliveryCutManifest } from "@/modules/delivery/manifest";
import { shiftReportsManifest } from "@/modules/shift-reports/manifest";
import { updaterManifest } from "@/modules/updater/manifest";
import type { ModuleManifest } from "@/modules/settings/domain/module-manifest";

export const MODULE_REGISTRY: ModuleManifest[] = [
  productsManifest,
  categoriesManifest,
  menusManifest,
  modifierGroupsManifest,
  checkoutManifest,
  deliveryPersonsManifest,
  deliveryCutManifest,
  shiftReportsManifest,
  updaterManifest,
];
