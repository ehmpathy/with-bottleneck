import { UnexpectedCodePathError } from 'helpful-errors';

import type { BottleneckSemaphore } from '@src/domain.objects/Bottleneck';

/**
 * .what = creates a semaphore for concurrency control
 * .why = limits simultaneous operations via slot-based acquire/release
 *
 * .exemption = rule.require.immutable-vars (scoped mutation zone)
 *
 * semaphores are fundamentally stateful — they track available resources
 * and a queue of waiters. there is no immutable alternative:
 *
 * | alternative considered | why it fails                        |
 * |------------------------|-------------------------------------|
 * | immutable counter      | cannot share state across acquire() |
 * | functional reduce      | no lock/wake mechanism              |
 * | external store         | same mutation, different location   |
 *
 * this matches the canonical semaphore (Dijkstra, 1965) and all major
 * implementations (async-sema, p-queue, bottleneck npm).
 *
 * .safety = single-threaded JS event loop
 *
 * javascript guarantees synchronous blocks complete atomically.
 * the read-modify-write (if < limit then count += 1) is safe because:
 * - no preemption mid-block
 * - async boundaries (await) are explicit
 * - queue mutations are synchronous
 *
 * .boundaries = unsafe in worker threads or shared memory
 *
 * must not share via SharedArrayBuffer. for distributed, use redis/etcd.
 */
export const genSemaphore = (input: {
  concurrency: number;
}): BottleneckSemaphore => {
  // .mutation-zone = semaphore state (scoped, const reference with mutable properties)
  const state = {
    active: 0,
    queue: [] as Array<() => void>,
  };

  /**
   * acquire a slot, blocks until available
   */
  const acquire = (): Promise<void> => {
    // slot available: proceed immediately
    if (state.active < input.concurrency) {
      state.active += 1;
      return Promise.resolve();
    }

    // at capacity: queue and wait
    return new Promise((onSlotAvailable) => {
      state.queue.push(onSlotAvailable);
    });
  };

  /**
   * release a slot, allows next waiter to proceed
   */
  const release = (): void => {
    // guard: release without acquire is a bug
    if (state.active === 0) {
      throw new UnexpectedCodePathError(
        'release called without prior acquire',
        { active: 0, hint: 'ensure acquire() is awaited before release()' },
      );
    }

    // release slot
    state.active -= 1;

    // wake next waiter if any
    const next = state.queue.shift();
    if (next) {
      state.active += 1;
      next();
    }
  };

  return {
    acquire,
    release,
    get queued() {
      return state.queue.length;
    },
    get active() {
      return state.active;
    },
  };
};
