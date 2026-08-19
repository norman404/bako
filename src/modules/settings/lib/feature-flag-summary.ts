interface FeatureFlagSummary {
  enabled: number;
  total: number;
}

function summarizeFeatureFlags(
  keys: readonly string[],
  flags: Readonly<Record<string, boolean>> | undefined,
): FeatureFlagSummary {
  const enabled = keys.reduce((count, key) => (flags?.[key] === true ? count + 1 : count), 0);

  return { enabled, total: keys.length };
}

export { summarizeFeatureFlags, type FeatureFlagSummary };
