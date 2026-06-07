import { UnexpectedCodePathError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { genSemaphore } from './genSemaphore';

describe('genSemaphore', () => {
  given('[case1] semaphore with concurrency 2', () => {
    when('[t0] 2 operations acquire', () => {
      then('both proceed immediately', async () => {
        const semaphore = genSemaphore({ concurrency: 2 });

        // acquire two slots
        await semaphore.acquire();
        await semaphore.acquire();

        // both acquired immediately (no block)
        expect(semaphore.active).toBe(2);
        expect(semaphore.queued).toBe(0);

        // cleanup
        semaphore.release();
        semaphore.release();
      });
    });

    when('[t1] 3rd operation acquires', () => {
      then('it blocks until release', async () => {
        const semaphore = genSemaphore({ concurrency: 2 });

        // acquire two slots (at capacity)
        await semaphore.acquire();
        await semaphore.acquire();

        // 3rd acquire should queue
        let thirdAcquired = false;
        const thirdPromise = semaphore.acquire().then(() => {
          thirdAcquired = true;
        });

        // verify queued
        expect(semaphore.queued).toBe(1);
        expect(thirdAcquired).toBe(false);

        // release one slot
        semaphore.release();

        // now third should proceed
        await thirdPromise;
        expect(thirdAcquired).toBe(true);
        expect(semaphore.queued).toBe(0);

        // cleanup
        semaphore.release();
        semaphore.release();
      });
    });

    when('[t2] queued is checked', () => {
      then('returns waiter count', async () => {
        const semaphore = genSemaphore({ concurrency: 2 });

        // fill slots
        await semaphore.acquire();
        await semaphore.acquire();

        // queue 3 waiters (intentionally not awaited — we want them queued)
        void semaphore.acquire();
        void semaphore.acquire();
        void semaphore.acquire();

        expect(semaphore.queued).toBe(3);

        // cleanup: release all (2 active + 3 queued become active then release)
        semaphore.release();
        semaphore.release();
        semaphore.release();
        semaphore.release();
        semaphore.release();
      });
    });

    when('[t3] active is checked', () => {
      then('returns held slot count', async () => {
        const semaphore = genSemaphore({ concurrency: 2 });

        expect(semaphore.active).toBe(0);

        await semaphore.acquire();
        expect(semaphore.active).toBe(1);

        await semaphore.acquire();
        expect(semaphore.active).toBe(2);

        semaphore.release();
        expect(semaphore.active).toBe(1);

        semaphore.release();
        expect(semaphore.active).toBe(0);
      });
    });
  });

  given('[case2] release without acquire', () => {
    when('[t0] release called with active 0', () => {
      then('throws UnexpectedCodePathError with details', () => {
        const semaphore = genSemaphore({ concurrency: 2 });
        const error = getError(() => semaphore.release());

        // verify type
        expect(error).toBeInstanceOf(UnexpectedCodePathError);

        // verify message content
        expect(error.message).toContain('release called without prior acquire');
        expect(error.message).toContain('active');
        expect(error.message).toContain('0');

        // snapshot for visual review
        expect(error).toMatchSnapshot();
      });
    });
  });
});
