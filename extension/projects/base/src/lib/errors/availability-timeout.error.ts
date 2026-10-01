/**
 * Thrown when a Built-In AI `availability()` or `params()` call does not settle
 * in time. It means "the browser did not answer", not "the API is unavailable".
 */
export class AvailabilityTimeoutError extends Error {
  constructor(public readonly timeoutMs: number) {
    super(`The browser did not answer the availability check within ${timeoutMs}ms.`);
    this.name = 'AvailabilityTimeoutError';
  }
}
