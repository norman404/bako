import { productsManifest, categoriesManifest, menusManifest } from "@/modules/menu/manifest";
import { checkoutManifest } from "@/modules/checkout/manifest";
import type { ModuleManifest } from "@/modules/settings/domain/module-manifest";

export const MODULE_REGISTRY: ModuleManifest[] = [
  productsManifest,
  categoriesManifest,
  menusManifest,
  checkoutManifest,
];
