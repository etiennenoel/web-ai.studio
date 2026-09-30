import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AvailabilityTimeoutError } from '../errors/availability-timeout.error';
import {
  callAvailability,
  callModelAvailability,
  resetModelBrokerWarmUp,
  waitForModelBrokerWarmUp,
} from './availability.utils';

describe('availability.utils', () => {
  let originalSummarizer: any;

  beforeEach(() => {
    originalSummarizer = (self as any).Summarizer;
    resetModelBrokerWarmUp();
  });

  afterEach(() => {
    vi.useRealTimers();
    (self as any).Summarizer = originalSummarizer;
    resetModelBrokerWarmUp();
  });

  it('should skip the warm-up when Summarizer is not defined', async () => {
    delete (self as any).Summarizer;
    await expect(waitForModelBrokerWarmUp()).resolves.toBe(true);
  });

  it('should send a new probe when the first cold-start probe hangs', async () => {
    let calls = 0;
    (self as any).Summarizer = {
      availability: () => {
        calls++;
        return calls === 1 ? new Promise(() => {}) : Promise.resolve('available');
      },
    };

    await expect(waitForModelBrokerWarmUp()).resolves.toBe(true);
    expect(calls).toBe(2);

    // The warm-up runs once per page.
    await waitForModelBrokerWarmUp();
    expect(calls).toBe(2);
  });

  it('should treat a rejected probe as a browser answer', async () => {
    const availability = vi.fn(() => Promise.reject(new Error('boom')));
    (self as any).Summarizer = { availability };

    await expect(waitForModelBrokerWarmUp()).resolves.toBe(true);
    expect(availability).toHaveBeenCalledTimes(1);
  });

  it('should reject model calls at once when the broker never answers, then try again later', async () => {
    vi.useFakeTimers();
    const availability = vi.fn(() => new Promise(() => {}));
    (self as any).Summarizer = { availability };
    const call = vi.fn(() => Promise.resolve('available'));

    const result = callModelAvailability(call);
    const assertion = expect(result).rejects.toBeInstanceOf(AvailabilityTimeoutError);
    await vi.advanceTimersByTimeAsync(8000);
    await assertion;

    expect(availability).toHaveBeenCalledTimes(4);
    expect(call).not.toHaveBeenCalled();

    // A later caller starts a new warm-up.
    void waitForModelBrokerWarmUp();
    expect(availability).toHaveBeenCalledTimes(5);
  });

  it('should not wait for the broker warm-up in callAvailability', async () => {
    (self as any).Summarizer = { availability: () => new Promise(() => {}) };
    await expect(callAvailability(() => Promise.resolve('available'))).resolves.toBe('available');
  });

  it('should return the value of the call', async () => {
    delete (self as any).Summarizer;
    await expect(callModelAvailability(() => Promise.resolve('downloadable'))).resolves.toBe('downloadable');
  });

  it('should reject with AvailabilityTimeoutError, not "unavailable", when the call hangs', async () => {
    await expect(callAvailability(() => new Promise(() => {}), 25)).rejects.toBeInstanceOf(AvailabilityTimeoutError);
  });
});
