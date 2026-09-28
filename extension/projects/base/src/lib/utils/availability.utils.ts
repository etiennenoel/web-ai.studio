export const DEFAULT_AVAILABILITY_TIMEOUT_MS = 3000;

/**
 * Races an availability or params check against a timeout so that a hanging
 * browser API call (e.g. inside a devtools:// extension iframe when the
 * on-device model service is not initialized) resolves to `fallbackValue`
 * instead of blocking the UI indefinitely.
 */
export async function withAvailabilityTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = DEFAULT_AVAILABILITY_TIMEOUT_MS,
  fallbackValue: T,
): Promise<T> {
  let timerId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timerId = setTimeout(() => resolve(fallbackValue), timeoutMs);
      }),
    ]);
  } finally {
    if (timerId !== undefined) {
      clearTimeout(timerId);
    }
  }
}
