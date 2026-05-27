export type FeatureFlagKey = "categories_enabled" | "multiple_menus_enabled";

export interface FeatureFlag {
  key: FeatureFlagKey;
  value: boolean;
  updatedAt: Date;
}
