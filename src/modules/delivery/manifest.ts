import { Bike } from "lucide-react";

import type { ModuleManifest } from "@/modules/settings/domain/module-manifest";
import { DeliveryCutPanel } from "./components/admin/DeliveryCutPanel";
import { DeliveryPersonSettingsPanel } from "./components/admin/DeliveryPersonSettingsPanel";

export const deliveryPersonsManifest: ModuleManifest = {
  id: "delivery",
  flagKey: "delivery_enabled",
  settingsPanel: DeliveryPersonSettingsPanel,
  settingsLabel: "Repartidores",
  settingsIcon: Bike,
};

export const deliveryCutManifest: ModuleManifest = {
  id: "delivery-cut",
  flagKey: "delivery_enabled",
  settingsPanel: DeliveryCutPanel,
  settingsLabel: "Corte repartidores",
  settingsIcon: Bike,
};
