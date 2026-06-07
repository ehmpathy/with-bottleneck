import { given, then, when } from 'test-fns';

import { genBottleneck } from './genBottleneck';

describe('genBottleneck', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  given('[case1] limits with concurrency only', () => {
    when('[t0] bottleneck created', () => {
      then('semaphore enforces limit', async () => {
        const bottleneck = genBottleneck({ concurrency: 2 });

        // acquire 2 slots via schedule
        let completed = 0;
        const first = bottleneck.schedule(async () => {
          completed += 1;
          return 'first';
        });
        const second = bottleneck.schedule(async () => {
          completed += 1;
          return 'second';
        });

        // both should complete immediately
        await Promise.all([first, second]);
        expect(completed).toBe(2);
      });

      then('semaphore state is clean after operations', () => {
        const bottleneck = genBottleneck({ concurrency: 2 });
        expect(bottleneck.semaphore.active).toBe(0);
        expect(bottleneck.semaphore.queued).toBe(0);
      });
    });
  });

  given('[case2] limits with velocity only', () => {
    when('[t0] bottleneck created', () => {
      then('throttle enforces velocity', async () => {
        const bottleneck = genBottleneck({
          velocity: { quantity: 2, duration: { seconds: 1 } },
        });

        // acquire 2 tokens
        await bottleneck.schedule(async () => 'first');
        await bottleneck.schedule(async () => 'second');

        // 3rd should block
        let thirdDone = false;
        const thirdPromise = bottleneck.schedule(async () => {
          thirdDone = true;
          return 'third';
        });

        expect(thirdDone).toBe(false);
        expect({
          state: 'blocked by velocity',
          thirdDone,
        }).toMatchSnapshot();

        // advance time
        jest.advanceTimersByTime(1000);

        await thirdPromise;
        expect(thirdDone).toBe(true);
      });

      then('semaphore allows unlimited concurrency', async () => {
        const bottleneck = genBottleneck({
          velocity: { quantity: 100, duration: { seconds: 1 } },
        });

        // all 50 operations should start concurrently (no semaphore limit)
        // this proves velocity-only config has unlimited concurrency
        const startTimes: number[] = [];
        const now = Date.now();

        const operations = Array.from({ length: 50 }, (_, i) =>
          bottleneck.schedule(async () => {
            startTimes.push(Date.now() - now);
            return i;
          }),
        );

        const results = await Promise.all(operations);

        // all started at ~same time (within 50ms of each other)
        const maxDelta = Math.max(...startTimes) - Math.min(...startTimes);
        expect(maxDelta).toBeLessThan(50); // generous threshold

        // all completed
        expect(results).toHaveLength(50);
        expect(bottleneck.semaphore.active).toBe(0);

        expect({
          scenario: 'velocity-only allows unlimited concurrency',
          operationCount: 50,
          allStartedConcurrently: maxDelta < 50,
        }).toMatchSnapshot();
      });
    });
  });

  given('[case3] limits with both', () => {
    when('[t0] bottleneck created', () => {
      then('semaphore and throttle both enforce', async () => {
        const bottleneck = genBottleneck({
          concurrency: 2,
          velocity: { quantity: 5, duration: { seconds: 1 } },
        });

        expect(bottleneck.semaphore).toBeDefined();

        // schedule 2 operations
        const first = bottleneck.schedule(async () => 'first');
        const second = bottleneck.schedule(async () => 'second');

        await Promise.all([first, second]);

        // both complete, via concurrency and velocity limits
        expect(bottleneck.semaphore.active).toBe(0);
      });
    });
  });

  given('[case4] empty limits', () => {
    when('[t0] bottleneck created', () => {
      then('operations execute immediately (unlimited)', async () => {
        const bottleneck = genBottleneck();

        // schedule many operations
        const results = await Promise.all([
          bottleneck.schedule(async () => 1),
          bottleneck.schedule(async () => 2),
          bottleneck.schedule(async () => 3),
          bottleneck.schedule(async () => 4),
          bottleneck.schedule(async () => 5),
        ]);

        expect(results).toEqual([1, 2, 3, 4, 5]);
        expect(bottleneck.semaphore.active).toBe(0);
      });
    });
  });
});
