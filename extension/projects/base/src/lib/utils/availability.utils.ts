import { AvailabilityTimeoutError } from '../errors/availability-timeout.error';

export const AVAILABILITY_TIMEOUT_MS = 5000;
const WARM_UP_RETRY_DELAYS_MS = [500, 1000, 2000];
const WARM_UP_TIMEOUT_MS = 8000;

let warmUpPromise: Promise<boolean> | undefined;

/**
 * Resolves to `true` when the browser's on-device model broker has answered
 * one `availability()` call, or to `false` if it did not answer within
 * `WARM_UP_TIMEOUT_MS`.
 *
 * On a cold browser start, Chrome queues early `availability()` calls until
 * every asset in the model manifest is initialized
 * (`ManifestBrokerState::EnsureInitialization`). Calls made after the manifest
 * loads skip that queue and answer at once. The queued calls can wait much
 * longer, or forever. To get out of the queue, this sends a new probe after
 * each delay in `WARM_UP_RETRY_DELAYS_MS` until one probe settles.
 *
 * It runs once per page. If no probe settles, the next caller tries again.
 */
export function waitForModelBrokerWarmUp(): Promise<boolean> {
  const summarizer = (self as any).Summarizer;
  if (typeof summarizer?.availability !== 'function') {
    return Promise.resolve(true);
  }

  warmUpPromise ??= new Promise<boolean>((resolve) => {
    let settled = false;
    const timeoutIds: ReturnType<typeof setTimeout>[] = [];
    const settle = (answered: boolean) => {
      if (settled) {
        return;
      }
      settled = true;
      timeoutIds.forEach((id) => clearTimeout(id));
      if (!answered) {
        warmUpPromise = undefined;
      }
      resolve(answered);
    };
    const probe = () => {
      try {
        summarizer.availability({ outputLanguage: 'en' }).then(() => settle(true), () => settle(true));
      } catch {
        settle(true);
      }
    };

    probe();
    let elapsedMs = 0;
    for (const delayMs of WARM_UP_RETRY_DELAYS_MS) {
      elapsedMs += delayMs;
      timeoutIds.push(setTimeout(probe, elapsedMs));
    }
    timeoutIds.push(setTimeout(() => settle(false), WARM_UP_TIMEOUT_MS));
  });

  return warmUpPromise;
}

/**
 * Calls a Built-In AI `availability()` or `params()` function. Rejects with
 * `AvailabilityTimeoutError` if the call does not settle within `timeoutMs`,
 * so the UI never waits forever and never shows a hang as "unavailable".
 *
 * Use it directly for APIs that do not use the model broker (Translator,
 * Language Detector, Classifier polyfill). Use `callModelAvailability` for the
 * APIs backed by Gemini Nano.
 */
export async function callAvailability<T>(
  call: () => Promise<T>,
  timeoutMs: number = AVAILABILITY_TIMEOUT_MS,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      call(),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new AvailabilityTimeoutError(timeoutMs)), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * `callAvailability` for the APIs backed by the on-device model broker
 * (Prompt, Summarizer, Writer, Rewriter, Proofreader). Waits for the broker
 * warm-up first. If the broker did not answer the warm-up, the call would only
 * wait in the same queue, so this rejects at once.
 */
export async function callModelAvailability<T>(
  call: () => Promise<T>,
  timeoutMs: number = AVAILABILITY_TIMEOUT_MS,
): Promise<T> {
  if (!(await waitForModelBrokerWarmUp())) {
    throw new AvailabilityTimeoutError(WARM_UP_TIMEOUT_MS);
  }
  return callAvailability(call, timeoutMs);
}

/**
 * Test hook: forgets the warm-up result.
 */
export function resetModelBrokerWarmUp(): void {
  warmUpPromise = undefined;
}
