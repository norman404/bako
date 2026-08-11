import { Bike } from "lucide-react";

import type { ModuleManifest } from "@/modules/settings";
import { DeliveryCutPanel } from "./DeliveryCutPanel";
import { DeliveryPersonSettingsPanel } from "./DeliveryPersonSettingsPanel";

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
