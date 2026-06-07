import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
import { getError, given, then, useBeforeAll, when } from 'test-fns';

import type { Bottleneck } from './index';
import { genBottleneck, withBottleneck } from './index';

describe('with-bottleneck acceptance', () => {
  given('[case1] public exports', () => {
    when('[t0] Bottleneck type imported', () => {
      then('type is available', () => {
        // type-level check — compiles means available
        const bottleneck: Bottleneck = genBottleneck({ concurrency: 1 });
        expect(bottleneck).toBeDefined();
      });
    });

    when('[t1] genBottleneck imported', () => {
      then('function is available', () => {
        expect(typeof genBottleneck).toBe('function');
      });
    });

    when('[t2] withBottleneck imported', () => {
      then('function is available', () => {
        expect(typeof withBottleneck).toBe('function');
      });
    });
  });

  given('[case2] genBottleneck with valid limits', () => {
    when('[t0] called with concurrency and velocity limits', () => {
      then('returns Bottleneck shape', () => {
        const bottleneck = genBottleneck({
          concurrency: 5,
          velocity: { quantity: 10, duration: { seconds: 1 } },
        });

        expect(bottleneck.semaphore).toBeDefined();
        expect(bottleneck.semaphore.acquire).toBeInstanceOf(Function);
        expect(bottleneck.semaphore.release).toBeInstanceOf(Function);
        expect(typeof bottleneck.semaphore.queued).toBe('number');
        expect(typeof bottleneck.semaphore.active).toBe('number');

        expect(bottleneck.schedule).toBeInstanceOf(Function);
      });

      then('shape matches snapshot', () => {
        const bottleneck = genBottleneck({
          concurrency: 5,
          velocity: { quantity: 10, duration: { seconds: 1 } },
        });

        // explicit assertions before snapshot
        expect(bottleneck.semaphore.queued).toBe(0);
        expect(bottleneck.semaphore.active).toBe(0);

        expect({
          semaphore: {
            queued: bottleneck.semaphore.queued,
            active: bottleneck.semaphore.active,
          },
        }).toMatchSnapshot();
      });
    });
  });

  given('[case3] genBottleneck with invalid limits', () => {
    when('[t0] called with concurrency 0', () => {
      then('throws BadRequestError', () => {
        const error = getError(() => genBottleneck({ concurrency: 0 }));
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('concurrency');
        expect(error).toMatchSnapshot();
      });
    });

    when('[t1] called with negative concurrency', () => {
      then('throws BadRequestError', () => {
        const error = getError(() => genBottleneck({ concurrency: -5 }));
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('concurrency');
        expect(error).toMatchSnapshot();
      });
    });

    when('[t2] called with velocity quantity 0', () => {
      then('throws BadRequestError', () => {
        const error = getError(() =>
          genBottleneck({
            velocity: { quantity: 0, duration: { seconds: 1 } },
          }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('velocity');
        expect(error.message).toContain('quantity');
        expect(error).toMatchSnapshot();
      });
    });

    when('[t3] called with negative velocity quantity', () => {
      then('throws BadRequestError', () => {
        const error = getError(() =>
          genBottleneck({
            velocity: { quantity: -5, duration: { seconds: 1 } },
          }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('velocity');
        expect(error.message).toContain('quantity');
        expect(error).toMatchSnapshot();
      });
    });

    when('[t4] called with non-integer concurrency', () => {
      then('throws BadRequestError', () => {
        const error = getError(() => genBottleneck({ concurrency: 1.5 }));
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('concurrency');
        expect(error.message).toContain('integer');
        expect(error).toMatchSnapshot();
      });
    });

    when('[t5] called with non-integer velocity quantity', () => {
      then('throws BadRequestError', () => {
        const error = getError(() =>
          genBottleneck({
            velocity: { quantity: 2.5, duration: { seconds: 1 } },
          }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('velocity');
        expect(error.message).toContain('integer');
        expect(error).toMatchSnapshot();
      });
    });

    when('[t6] called with zero velocity duration', () => {
      then('throws BadRequestError', () => {
        const error = getError(() =>
          genBottleneck({
            velocity: { quantity: 5, duration: { seconds: 0 } },
          }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('velocity');
        expect(error.message).toContain('duration');
        expect(error).toMatchSnapshot();
      });
    });

    when('[t7] called with negative velocity duration', () => {
      then('throws BadRequestError', () => {
        const error = getError(() =>
          genBottleneck({
            velocity: { quantity: 5, duration: { seconds: -1 } },
          }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('velocity');
        expect(error.message).toContain('duration');
        expect(error).toMatchSnapshot();
      });
    });

    when('[t8] called with velocity absent duration', () => {
      then('throws BadRequestError', () => {
        const error = getError(() =>
          // @ts-expect-error — intentionally invalid: velocity without duration
          genBottleneck({ velocity: { quantity: 5 } }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('velocity');
        expect(error.message).toContain('duration');
        expect(error).toMatchSnapshot();
      });
    });
  });

  given('[case3.5] genBottleneck with empty limits', () => {
    when('[t0] called with no arguments', () => {
      then('returns unlimited bottleneck', async () => {
        const bottleneck = genBottleneck();

        // schedule many concurrent operations
        const results = await Promise.all([
          bottleneck.schedule(async () => 1),
          bottleneck.schedule(async () => 2),
          bottleneck.schedule(async () => 3),
          bottleneck.schedule(async () => 4),
          bottleneck.schedule(async () => 5),
        ]);

        expect(results).toEqual([1, 2, 3, 4, 5]);
        expect(bottleneck.semaphore.active).toBe(0);
        expect(bottleneck.semaphore.queued).toBe(0);
      });

      then('shape matches snapshot', () => {
        const bottleneck = genBottleneck();

        // explicit assertions before snapshot
        expect(bottleneck.semaphore.queued).toBe(0);
        expect(bottleneck.semaphore.active).toBe(0);

        expect({
          semaphore: {
            queued: bottleneck.semaphore.queued,
            active: bottleneck.semaphore.active,
          },
        }).toMatchSnapshot();
      });
    });

    when('[t1] called with explicit Infinity concurrency', () => {
      then('returns unlimited bottleneck', async () => {
        const bottleneck = genBottleneck({ concurrency: Infinity });

        // schedule many concurrent operations
        const results = await Promise.all([
          bottleneck.schedule(async () => 1),
          bottleneck.schedule(async () => 2),
          bottleneck.schedule(async () => 3),
          bottleneck.schedule(async () => 4),
          bottleneck.schedule(async () => 5),
        ]);

        expect(results).toEqual([1, 2, 3, 4, 5]);
        expect(bottleneck.semaphore.active).toBe(0);
        expect(bottleneck.semaphore.queued).toBe(0);
      });
    });
  });

  given('[case4] withBottleneck wraps async function', () => {
    const bottleneck = genBottleneck({ concurrency: 2 });

    const asyncFn = async (input: { n: number }): Promise<number> => {
      return input.n * 2;
    };

    const wrapped = withBottleneck(asyncFn, { bottleneck });

    when('[t0] wrapped function called', () => {
      then('preserves signature and respects bottleneck', async () => {
        const result = await wrapped({ n: 7 });
        expect(result).toBe(14);
        expect({ result }).toMatchSnapshot();
      });
    });

    when('[t1] wrapped function throws', () => {
      class TestError extends Error {
        constructor() {
          super('test error message');
          this.name = 'TestError';
        }
      }

      const fnThatThrows = async (_input: { n: number }): Promise<number> => {
        throw new TestError();
      };

      const wrappedThrower = withBottleneck(fnThatThrows, { bottleneck });

      then('error propagates to caller and slot is released', async () => {
        const activeBefore = bottleneck.semaphore.active;

        const error = await getError(async () => wrappedThrower({ n: 1 }));

        expect(error).toBeInstanceOf(TestError);
        expect(error.message).toBe('test error message');
        expect(bottleneck.semaphore.active).toBe(activeBefore); // released
        expect(error).toMatchSnapshot();
      });
    });
  });

  given('[case5] concurrency-controlled scenario', () => {
    const bottleneck: Bottleneck = useBeforeAll(async () =>
      genBottleneck({ concurrency: 2 }),
    );

    when('[t0] bottleneck is created', () => {
      then('initial state is clean', () => {
        expect(bottleneck.semaphore.queued).toBe(0);
        expect(bottleneck.semaphore.active).toBe(0);
        expect({
          queued: bottleneck.semaphore.queued,
          active: bottleneck.semaphore.active,
        }).toMatchSnapshot();
      });
    });

    when('[t1] concurrent operations execute', () => {
      then('concurrency limit is enforced', async () => {
        let releaseFirst: () => void;
        let releaseSecond: () => void;

        // start 2 operations (fill capacity)
        const first = bottleneck.schedule(
          () =>
            new Promise<string>((done) => {
              releaseFirst = () => done('first');
            }),
        );
        const second = bottleneck.schedule(
          () =>
            new Promise<string>((done) => {
              releaseSecond = () => done('second');
            }),
        );

        // flush microtask queue to let schedule callbacks execute
        await Promise.resolve();

        // both should be active
        expect(bottleneck.semaphore.active).toBe(2);
        expect({
          state: 'at capacity',
          active: bottleneck.semaphore.active,
          queued: bottleneck.semaphore.queued,
        }).toMatchSnapshot();

        // 3rd should queue
        let thirdCompleted = false;
        const third = bottleneck.schedule(async () => {
          thirdCompleted = true;
          return 'third';
        });

        // flush microtask queue
        await Promise.resolve();

        expect(bottleneck.semaphore.queued).toBe(1);
        expect(thirdCompleted).toBe(false);
        expect({
          state: 'blocked',
          active: bottleneck.semaphore.active,
          queued: bottleneck.semaphore.queued,
          thirdCompleted,
        }).toMatchSnapshot();

        // release first → third proceeds
        releaseFirst!();
        await first;

        // wait for third to complete
        const thirdResult = await third;
        expect(thirdResult).toBe('third');
        expect(thirdCompleted).toBe(true);

        // cleanup
        releaseSecond!();
        await second;

        // final state
        expect(bottleneck.semaphore.active).toBe(0);
        expect(bottleneck.semaphore.queued).toBe(0);
      });
    });
  });

  given('[case6] velocity-controlled scenario', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    when('[t0] bottleneck with velocity created', () => {
      then('schedule respects rate limit', async () => {
        const bottleneck = genBottleneck({
          velocity: { quantity: 3, duration: { seconds: 1 } },
        });

        // exhaust 3 tokens
        await bottleneck.schedule(async () => 'first');
        await bottleneck.schedule(async () => 'second');
        await bottleneck.schedule(async () => 'third');

        // 4th should block until refill
        let fourthCompleted = false;
        const fourth = bottleneck.schedule(async () => {
          fourthCompleted = true;
          return 'fourth';
        });

        expect(fourthCompleted).toBe(false);
        expect({
          state: 'blocked by velocity',
          fourthCompleted,
        }).toMatchSnapshot();

        // advance time to trigger refill
        jest.advanceTimersByTime(1000);

        const result = await fourth;
        expect(result).toBe('fourth');
        expect(fourthCompleted).toBe(true);
      });
    });
  });

  given('[case6.5] velocity with ISO string duration', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    when('[t0] bottleneck with ISO string duration created', () => {
      then('schedule respects rate limit with string format', async () => {
        // ISO 8601 duration string: PT1S = 1 second
        const bottleneck = genBottleneck({
          velocity: { quantity: 2, duration: 'PT1S' },
        });

        // exhaust 2 tokens
        await bottleneck.schedule(async () => 'first');
        await bottleneck.schedule(async () => 'second');

        // 3rd should block until refill
        let thirdCompleted = false;
        const third = bottleneck.schedule(async () => {
          thirdCompleted = true;
          return 'third';
        });

        expect(thirdCompleted).toBe(false);
        expect({
          state: 'blocked by velocity',
          thirdCompleted,
        }).toMatchSnapshot();

        // advance time to trigger refill
        jest.advanceTimersByTime(1000);

        const result = await third;
        expect(result).toBe('third');
        expect(thirdCompleted).toBe(true);
      });
    });
  });

  given('[case7] withBottleneck with supplier', () => {
    when('[t0] bottleneck resolved from context', () => {
      then('respects per-context bottleneck', async () => {
        const bottleneck1 = genBottleneck({ concurrency: 1 });
        const bottleneck2 = genBottleneck({ concurrency: 1 });

        const asyncFn = async (
          input: { n: number },
          context: { bottleneck: Bottleneck },
        ): Promise<number> => {
          return input.n * 2;
        };

        const wrapped = withBottleneck(asyncFn, {
          bottleneck: (_input, context) => context.bottleneck,
        });

        // call with different bottlenecks
        const result1 = await wrapped({ n: 5 }, { bottleneck: bottleneck1 });
        const result2 = await wrapped({ n: 7 }, { bottleneck: bottleneck2 });

        expect(result1).toBe(10);
        expect(result2).toBe(14);

        // verify independent bottleneck state
        expect(bottleneck1.semaphore.active).toBe(0);
        expect(bottleneck2.semaphore.active).toBe(0);

        expect({
          results: { result1, result2 },
          states: {
            bottleneck1Active: bottleneck1.semaphore.active,
            bottleneck2Active: bottleneck2.semaphore.active,
          },
        }).toMatchSnapshot();
      });
    });

    when('[t1] unlimited bottleneck for testability', () => {
      then(
        'fast tests without delay via injected unlimited bottleneck',
        async () => {
          // .why = key use case from vision: inject unlimited bottleneck for fast tests
          const unlimitedBottleneck = genBottleneck(); // no limits = no delay

          const asyncFn = async (
            input: { n: number },
            context: { bottleneck: Bottleneck },
          ): Promise<number> => {
            return input.n * 3;
          };

          const wrapped = withBottleneck(asyncFn, {
            bottleneck: (_input, context) => context.bottleneck,
          });

          // call many times concurrently — no delay
          const results = await Promise.all([
            wrapped({ n: 1 }, { bottleneck: unlimitedBottleneck }),
            wrapped({ n: 2 }, { bottleneck: unlimitedBottleneck }),
            wrapped({ n: 3 }, { bottleneck: unlimitedBottleneck }),
            wrapped({ n: 4 }, { bottleneck: unlimitedBottleneck }),
            wrapped({ n: 5 }, { bottleneck: unlimitedBottleneck }),
          ]);

          expect(results).toEqual([3, 6, 9, 12, 15]);
          expect(unlimitedBottleneck.semaphore.active).toBe(0);
          expect(unlimitedBottleneck.semaphore.queued).toBe(0);

          expect({
            scenario: 'unlimited bottleneck for testability',
            results,
            state: {
              active: unlimitedBottleneck.semaphore.active,
              queued: unlimitedBottleneck.semaphore.queued,
            },
          }).toMatchSnapshot();
        },
      );
    });
  });

  given('[case8] semaphore direct access', () => {
    when('[t0] manual acquire/release', () => {
      then('state updates correctly', async () => {
        const bottleneck = genBottleneck({ concurrency: 2 });

        expect(bottleneck.semaphore.active).toBe(0);

        await bottleneck.semaphore.acquire();
        expect(bottleneck.semaphore.active).toBe(1);

        await bottleneck.semaphore.acquire();
        expect(bottleneck.semaphore.active).toBe(2);

        bottleneck.semaphore.release();
        expect(bottleneck.semaphore.active).toBe(1);

        bottleneck.semaphore.release();
        expect(bottleneck.semaphore.active).toBe(0);
      });
    });

    when('[t1] release without acquire', () => {
      then('throws UnexpectedCodePathError', () => {
        const bottleneck = genBottleneck({ concurrency: 1 });

        const error = getError(() => bottleneck.semaphore.release());

        expect(error).toBeInstanceOf(UnexpectedCodePathError);
        expect(error.message).toContain('release');
        expect(error.message).toContain('acquire');
        expect(error).toMatchSnapshot();
      });
    });
  });
});
