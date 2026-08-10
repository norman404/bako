export class FeatureFlagDomainError extends Error {
  readonly kind = "FeatureFlagDomainError";
}

export class FeatureFlagPersistenceError extends FeatureFlagDomainError {
  constructor(message: string) {
    super(message);
    this.name = "FeatureFlagPersistenceError";
  }
}
