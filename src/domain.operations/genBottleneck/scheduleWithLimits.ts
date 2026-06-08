import type {
  BottleneckSemaphore,
  BottleneckThrottle,
} from '@src/domain.objects/Bottleneck';

/**
 * .what = schedules fn with semaphore and optional throttle control
 * .why = encapsulates acquire/run/release pattern with guaranteed cleanup
 *
 * .note = order-dependence (intentional architecture)
 *
 * semaphore is acquired before throttle. when both are configured,
 * a slot is held while blocked for velocity tokens. this is intentional:
 * it prevents more than N operations from queued at the velocity limit.
 *
 * without this order, unlimited operations could pile up blocked for
 * tokens, which leads to memory pressure. the order-dependence is a
 * deliberate trade-off:
 *
 * | order           | memory           | behavior                      |
 * |-----------------|------------------|-------------------------------|
 * | semaphore first | bounded (N)      | velocity wait holds slot      |
 * | throttle first  | unbounded        | unlimited queue at throttle   |
 *
 * if you need independent limits, compose two separate bottlenecks.
 *
 * .mitigation = the order is documented here and in genBottleneck.
 *               tests verify the bounded memory behavior explicitly.
 */
export const scheduleWithLimits = async <T>(input: {
  fn: () => Promise<T>;
  semaphore: BottleneckSemaphore;
  throttle: BottleneckThrottle | null;
}): Promise<T> => {
  // acquire semaphore (blocks if at concurrency limit)
  await input.semaphore.acquire();

  try {
    // acquire throttle token if configured (blocks if at velocity limit)
    if (input.throttle) {
      await input.throttle.acquire();
    }

    // run function
    return await input.fn();
  } finally {
    // always release semaphore slot
    input.semaphore.release();
  }
};
