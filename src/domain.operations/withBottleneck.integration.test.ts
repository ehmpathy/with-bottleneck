import { getError, given, then, when } from 'test-fns';

import type { Bottleneck } from '@src/domain.objects/Bottleneck';

import { genBottleneck } from './genBottleneck';
import { withBottleneck } from './withBottleneck';

describe('withBottleneck', () => {
  given('[case1] static bottleneck', () => {
    const bottleneck = genBottleneck({ concurrency: 2 });

    const exampleFn = async (input: { value: number }): Promise<number> => {
      return input.value * 2;
    };

    const wrappedFn = withBottleneck(exampleFn, { bottleneck });

    when('[t0] fn wrapped', () => {
      then('wrapped fn has same signature', async () => {
        // verify return type and input signature work
        const result: number = await wrappedFn({ value: 5 });
        expect(result).toBe(10);
      });
    });

    when('[t1] wrapped fn called', () => {
      then('bottleneck.schedule used', async () => {
        // acquire both slots via direct schedule
        let scheduleCompleted = false;
        const holdSlot1 = bottleneck.schedule(
          () =>
            new Promise<void>((done) => {
              setTimeout(() => {
                done();
                scheduleCompleted = true;
              }, 50);
            }),
        );
        const holdSlot2 = bottleneck.schedule(
          () =>
            new Promise<void>((done) => {
              setTimeout(done, 50);
            }),
        );

        // wrapped fn should block (both slots held)
        expect(bottleneck.semaphore.active).toBe(2);

        let wrappedCompleted = false;
        const wrappedPromise = wrappedFn({ value: 3 }).then((result) => {
          wrappedCompleted = true;
          return result;
        });

        // should be queued
        expect(bottleneck.semaphore.queued).toBe(1);
        expect(wrappedCompleted).toBe(false);

        // release slots
        await Promise.all([holdSlot1, holdSlot2]);

        // wrapped should complete
        const result = await wrappedPromise;
        expect(result).toBe(6);
        expect(wrappedCompleted).toBe(true);
      });
    });
  });

  given('[case2] BottleneckSupplier function', () => {
    interface UsecaseContext {
      bottleneck: Bottleneck;
    }

    const bottleneckA = genBottleneck({ concurrency: 1 });
    const bottleneckB = genBottleneck({ concurrency: 1 });

    const exampleFn = async (
      input: { value: number },
      context: { usecase: UsecaseContext },
    ): Promise<{ value: number; concurrency: number }> => {
      return {
        value: input.value,
        concurrency: context.usecase.bottleneck.semaphore.active,
      };
    };

    const wrappedFn = withBottleneck(exampleFn, {
      bottleneck: (_input, context) => context.usecase.bottleneck,
    });

    when('[t0] wrapped fn called with context A', () => {
      then('uses context A bottleneck', async () => {
        const result = await wrappedFn(
          { value: 1 },
          { usecase: { bottleneck: bottleneckA } },
        );

        // should have used bottleneckA (active was 1 while fn ran)
        expect(result.concurrency).toBe(1);
        expect(bottleneckA.semaphore.active).toBe(0); // released after
      });
    });

    when('[t1] wrapped fn called with context B', () => {
      then('uses context B bottleneck', async () => {
        // hold a slot in bottleneckA
        let releaseA: () => void;
        const holdA = bottleneckA.schedule(
          () =>
            new Promise<void>((done) => {
              releaseA = done;
            }),
        );

        // call with context B should not be blocked by bottleneckA
        const result = await wrappedFn(
          { value: 2 },
          { usecase: { bottleneck: bottleneckB } },
        );

        expect(result.value).toBe(2);
        expect(bottleneckB.semaphore.active).toBe(0);

        // bottleneckA is still held
        expect(bottleneckA.semaphore.active).toBe(1);

        // cleanup
        releaseA!();
        await holdA;
      });
    });
  });

  given('[case3] wrapped fn that throws', () => {
    const bottleneck = genBottleneck({ concurrency: 2 });

    class CustomError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'CustomError';
      }
    }

    const fnThatThrows = async (_input: { value: number }): Promise<number> => {
      throw new CustomError('intentional test error');
    };

    const wrappedFn = withBottleneck(fnThatThrows, { bottleneck });

    when('[t0] error occurs', () => {
      then('slot is released and error propagates to caller', async () => {
        // verify initial state
        expect(bottleneck.semaphore.active).toBe(0);

        // call and capture error
        const error = await getError(async () => wrappedFn({ value: 1 }));

        // slot should be released after error
        expect(bottleneck.semaphore.active).toBe(0);

        // error should propagate with original type and message
        expect(error).toBeInstanceOf(CustomError);
        expect(error.name).toBe('CustomError');
        expect(error.message).toBe('intentional test error');
        expect(error).toMatchSnapshot();
      });
    });
  });
});
