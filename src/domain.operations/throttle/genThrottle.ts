import type { IsoDuration } from 'iso-time';
import { toMilliseconds } from 'iso-time';

import type { BottleneckThrottle } from '../../domain.objects/Bottleneck';

/**
 * .what = creates a throttle for velocity control
 * .why = limits operations per time via token bucket algorithm
 *
 * .exemption = rule.require.immutable-vars (scoped mutation zone)
 *
 * token bucket requires mutable state: token count, waiter queue, refill
 * timer. there is no immutable alternative for rate limits:
 *
 * | alternative considered | why it fails                         |
 * |------------------------|--------------------------------------|
 * | immutable counter      | cannot share token state over time   |
 * | functional timestamp   | no queue/wake mechanism              |
 * | external store         | same mutation, different location    |
 *
 * this matches the canonical token bucket (Leaky Bucket, 1986) and
 * all major implementations (bottleneck npm, limiter, p-ratelimit).
 *
 * .safety = single-threaded JS event loop
 *
 * javascript guarantees synchronous blocks complete atomically:
 * - tokens -= 1 and queue.shift() execute in same sync block
 * - setTimeout callback runs in fresh event loop turn
 * - no preemption between read and write
 *
 * .timer = setTimeout precision (intentional trade-off)
 *
 * setTimeout is not precise — delays may exceed requested duration under
 * CPU load. this means actual rate may be lower than configured (more
 * time between refills). this is safe: we never exceed the configured
 * rate, only potentially undershoot.
 *
 * | precision need     | solution                           |
 * |--------------------|------------------------------------|
 * | approximate (here) | setTimeout, safe undershoot        |
 * | high precision     | setImmediate + hrtime (not needed) |
 * | distributed        | redis-based (rate-limiter-flexible)|
 *
 * .boundaries = unsafe in worker threads or shared memory
 */
export const genThrottle = (input: {
  velocity: {
    quantity: number;
    duration: IsoDuration;
  } | null;
}): BottleneckThrottle | null => {
  // guard: no velocity = no throttle
  if (!input.velocity) return null;

  const { quantity, duration } = input.velocity;
  const durationMs = toMilliseconds(duration);

  // .mutation-zone = token bucket state (scoped, const reference with mutable properties)
  const state = {
    tokens: quantity,
    queue: [] as Array<() => void>,
    refillTimer: null as ReturnType<typeof setTimeout> | null,
  };

  /**
   * schedule refill after duration passes
   */
  const scheduleRefill = (): void => {
    // guard: only one refill timer at a time
    if (state.refillTimer !== null) return;

    state.refillTimer = setTimeout(() => {
      // refill tokens
      state.tokens = quantity;
      state.refillTimer = null;

      // wake queued waiters (up to available tokens)
      while (state.queue.length > 0 && state.tokens > 0) {
        const next = state.queue.shift();
        if (next) {
          state.tokens -= 1;
          next();
        }
      }

      // if still waiters, schedule another refill
      if (state.queue.length > 0) {
        scheduleRefill();
      }
    }, durationMs);
  };

  /**
   * acquire a token, blocks until available
   */
  const acquire = (): Promise<void> => {
    // token available: proceed immediately
    if (state.tokens > 0) {
      state.tokens -= 1;

      // start refill timer if this is first token consumed
      if (state.tokens < quantity && state.refillTimer === null) {
        scheduleRefill();
      }

      return Promise.resolve();
    }

    // no tokens: queue and wait for refill
    return new Promise((onTokenAvailable) => {
      state.queue.push(onTokenAvailable);
    });
  };

  return {
    acquire,
    get tokens() {
      return state.tokens;
    },
  };
};
