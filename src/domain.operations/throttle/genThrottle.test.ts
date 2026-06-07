import { given, then, when } from 'test-fns';

import { genThrottle } from './genThrottle';

describe('genThrottle', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  given('[case0] velocity is null', () => {
    when('[t0] genThrottle called with null velocity', () => {
      then('returns null', () => {
        const throttle = genThrottle({ velocity: null });
        expect(throttle).toBeNull();
      });
    });
  });

  given('[case1] throttle with quantity 5, duration 1 second', () => {
    when('[t0] 5 tokens acquired immediately', () => {
      then('all proceed without wait', async () => {
        const throttle = genThrottle({
          velocity: { quantity: 5, duration: { seconds: 1 } },
        })!;

        // acquire all 5 tokens
        const results: boolean[] = [];
        for (let i = 0; i < 5; i++) {
          await throttle.acquire();
          results.push(true);
        }

        // all acquired immediately
        expect(results).toHaveLength(5);
        expect(throttle.tokens).toBe(0);
      });
    });

    when('[t1] 6th token acquired', () => {
      then('it blocks until refill', async () => {
        const throttle = genThrottle({
          velocity: { quantity: 5, duration: { seconds: 1 } },
        })!;

        // acquire all 5 tokens
        for (let i = 0; i < 5; i++) {
          await throttle.acquire();
        }

        // 6th should block
        let sixthAcquired = false;
        const sixthPromise = throttle.acquire().then(() => {
          sixthAcquired = true;
        });

        // verify still blocked
        expect(sixthAcquired).toBe(false);
        expect(throttle.tokens).toBe(0);

        // advance time to trigger refill
        jest.advanceTimersByTime(1000);

        // now sixth should proceed
        await sixthPromise;
        expect(sixthAcquired).toBe(true);
      });
    });

    when('[t2] duration passes', () => {
      then('tokens refill to quantity', async () => {
        const throttle = genThrottle({
          velocity: { quantity: 5, duration: { seconds: 1 } },
        })!;

        // acquire all tokens
        for (let i = 0; i < 5; i++) {
          await throttle.acquire();
        }
        expect(throttle.tokens).toBe(0);

        // advance time past duration
        jest.advanceTimersByTime(1000);

        // tokens should be refilled
        expect(throttle.tokens).toBe(5);
      });
    });

    when('[t3] multiple waiters exceed single refill', () => {
      then('waiters proceed across multiple refills', async () => {
        const throttle = genThrottle({
          velocity: { quantity: 2, duration: { seconds: 1 } },
        })!;

        // acquire initial 2 tokens
        await throttle.acquire();
        await throttle.acquire();
        expect(throttle.tokens).toBe(0);

        // queue 5 waiters (will need 3 refills: 2+2+1)
        const acquired: number[] = [];
        const waiterPromises = [3, 4, 5, 6, 7].map((id) =>
          throttle.acquire().then(() => {
            acquired.push(id);
          }),
        );

        // still blocked
        expect(acquired).toHaveLength(0);

        // first refill: 2 waiters proceed
        jest.advanceTimersByTime(1000);
        await Promise.resolve(); // flush microtasks
        expect(acquired).toHaveLength(2);

        // second refill: 2 more proceed
        jest.advanceTimersByTime(1000);
        await Promise.resolve();
        expect(acquired).toHaveLength(4);

        // third refill: last one proceeds
        jest.advanceTimersByTime(1000);
        await Promise.all(waiterPromises);
        expect(acquired).toHaveLength(5);
      });
    });
  });
});
