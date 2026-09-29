export const DEFAULT_AVAILABILITY_TIMEOUT_MS = 8000;
const COLD_START_RETRY_INTERVAL_MS = 1000;

/**
 * Races an availability or params check against a timeout so that a hanging
 * browser API call resolves to `fallbackValue` instead of blocking the UI.
 *
 * When passed a factory function `() => Promise<T>`, it also retries every
 * 1000ms while the call is still pending. In Chrome 154+, early
 * `.availability()` calls on a cold browser start can hang until a subsequent
 * call arrives after `OnDeviceModelComponentStateManager` finishes initializing
 * (~4s total on cold start, 0ms on warm calls).
 */
export async function withAvailabilityTimeout<T>(
  promiseOrFactory: Promise<T> | (() => Promise<T>),
  timeoutMs: number = DEFAULT_AVAILABILITY_TIMEOUT_MS,
  fallbackValue: T,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let retryIntervalId: ReturnType<typeof setInterval> | undefined;

  try {
    const mainPromise =
      typeof promiseOrFactory === 'function'
        ? new Promise<T>((resolve, reject) => {
            let settled = false;
            const settle = (fn: () => void) => {
              if (!settled) {
                settled = true;
                if (retryIntervalId !== undefined) {
                  clearInterval(retryIntervalId);
                  retryIntervalId = undefined;
                }
                fn();
              }
            };

            promiseOrFactory().then(
              (val) => settle(() => resolve(val)),
              (err) => settle(() => reject(err)),
            );

            if (timeoutMs > COLD_START_RETRY_INTERVAL_MS) {
              retryIntervalId = setInterval(() => {
                if (!settled) {
                  try {
                    promiseOrFactory().then(
                      (val) => settle(() => resolve(val)),
                      () => {
                        // Ignore retry rejection and let earlier call or timeout decide
                      },
                    );
                  } catch {
                    // Ignore synchronous retry error
                  }
                }
              }, COLD_START_RETRY_INTERVAL_MS);
            }
          })
        : promiseOrFactory;

    return await Promise.race([
      mainPromise,
      new Promise<T>((resolve) => {
        timeoutId = setTimeout(() => resolve(fallbackValue), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
    if (retryIntervalId !== undefined) {
      clearInterval(retryIntervalId);
    }
  }
}
