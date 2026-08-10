export type FeatureFlagKey = string;

export interface FeatureFlag {
  key: FeatureFlagKey;
  value: boolean;
  updatedAt: Date;
}
