import type {
  Bottleneck,
  BottleneckLimits,
} from '../domain.objects/Bottleneck';
import { asConcurrencyLimit } from './genBottleneck/asConcurrencyLimit';
import { assertLimitsValid } from './genBottleneck/assertLimitsValid';
import { scheduleWithLimits } from './genBottleneck/scheduleWithLimits';
import { genSemaphore } from './semaphore/genSemaphore';
import { genThrottle } from './throttle/genThrottle';

/**
 * .what = creates a bottleneck instance with concurrency and/or velocity limits
 * .why = provides unified rate limit and concurrency control
 */
export const genBottleneck = (input?: BottleneckLimits | null): Bottleneck => {
  // validate limits
  assertLimitsValid({ limits: input ?? null });

  // derive concurrency limit (Infinity if not configured)
  const concurrency = asConcurrencyLimit({ concurrency: input?.concurrency });
  const semaphore = genSemaphore({ concurrency });

  // derive throttle (null if velocity not configured)
  const throttle = genThrottle({ velocity: input?.velocity ?? null });

  // compose schedule with limits
  const schedule = async <T>(fn: () => Promise<T>): Promise<T> =>
    scheduleWithLimits({ fn, semaphore, throttle });

  return {
    semaphore,
    schedule,
  };
};
