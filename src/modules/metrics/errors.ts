export class MetricsPersistenceError extends Error {
  readonly kind = "MetricsPersistenceError";
  readonly params?: Record<string, unknown>;

  constructor(params?: Record<string, unknown>, message?: string) {
    super(message ?? `Metrics persistence error: ${JSON.stringify(params ?? {})}`);
    this.name = "MetricsPersistenceError";
    this.params = params;
  }
}
