import { BadRequestError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { assertLimitsValid } from './assertLimitsValid';

describe('assertLimitsValid', () => {
  given('[case1] valid limits', () => {
    when('[t0] concurrency is positive', () => {
      then('no error thrown', () => {
        expect(() =>
          assertLimitsValid({ limits: { concurrency: 5 } }),
        ).not.toThrow();
      });
    });

    when('[t1] velocity has positive quantity', () => {
      then('no error thrown', () => {
        expect(() =>
          assertLimitsValid({
            limits: { velocity: { quantity: 10, duration: { seconds: 1 } } },
          }),
        ).not.toThrow();
      });
    });

    when('[t2] both concurrency and velocity valid', () => {
      then('no error thrown', () => {
        expect(() =>
          assertLimitsValid({
            limits: {
              concurrency: 5,
              velocity: { quantity: 10, duration: { seconds: 1 } },
            },
          }),
        ).not.toThrow();
      });
    });
  });

  given('[case2] invalid limits', () => {
    when('[t0] concurrency is zero', () => {
      then('throws BadRequestError with details', () => {
        const error = getError(() =>
          assertLimitsValid({ limits: { concurrency: 0 } }),
        );

        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('concurrency');
        expect(error.message).toContain('field');
        expect(error.message).toContain('concurrency');
        expect(error.message).toContain('value');
        expect(error.message).toContain('0');
        expect(error).toMatchSnapshot();
      });
    });

    when('[t1] concurrency is negative', () => {
      then('throws BadRequestError with details', () => {
        const error = getError(() =>
          assertLimitsValid({ limits: { concurrency: -1 } }),
        );

        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('concurrency');
        expect(error.message).toContain('-1');
        expect(error).toMatchSnapshot();
      });
    });

    when('[t2] velocity quantity is zero', () => {
      then('throws BadRequestError with details', () => {
        const error = getError(() =>
          assertLimitsValid({
            limits: { velocity: { quantity: 0, duration: { seconds: 1 } } },
          }),
        );

        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('velocity');
        expect(error.message).toContain('quantity');
        expect(error.message).toContain('0');
        expect(error).toMatchSnapshot();
      });
    });

    when('[t3] velocity quantity is negative', () => {
      then('throws BadRequestError with details', () => {
        const error = getError(() =>
          assertLimitsValid({
            limits: { velocity: { quantity: -5, duration: { seconds: 1 } } },
          }),
        );

        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('velocity');
        expect(error.message).toContain('quantity');
        expect(error.message).toContain('-5');
        expect(error).toMatchSnapshot();
      });
    });

    when('[t4] concurrency is non-integer', () => {
      then('throws BadRequestError with details', () => {
        const error = getError(() =>
          assertLimitsValid({ limits: { concurrency: 1.5 } }),
        );

        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('concurrency');
        expect(error.message).toContain('integer');
        expect(error).toMatchSnapshot();
      });
    });

    when('[t5] velocity quantity is non-integer', () => {
      then('throws BadRequestError with details', () => {
        const error = getError(() =>
          assertLimitsValid({
            limits: { velocity: { quantity: 2.5, duration: { seconds: 1 } } },
          }),
        );

        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('velocity');
        expect(error.message).toContain('quantity');
        expect(error.message).toContain('integer');
        expect(error).toMatchSnapshot();
      });
    });

    when('[t6] velocity duration is absent', () => {
      then('throws BadRequestError with details', () => {
        const error = getError(() =>
          assertLimitsValid({
            // @ts-expect-error test runtime validation of absent duration
            limits: { velocity: { quantity: 5 } },
          }),
        );

        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('velocity');
        expect(error.message).toContain('duration');
        expect(error).toMatchSnapshot();
      });
    });
  });

  given('[case3] null limits', () => {
    when('[t0] limits is null', () => {
      then('no error thrown (defaults apply)', () => {
        expect(() => assertLimitsValid({ limits: null })).not.toThrow();
      });
    });
  });

  given('[case4] invalid velocity duration', () => {
    when('[t0] velocity duration is zero', () => {
      then('throws BadRequestError with details', () => {
        const error = getError(() =>
          assertLimitsValid({
            limits: { velocity: { quantity: 5, duration: { seconds: 0 } } },
          }),
        );

        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('velocity');
        expect(error.message).toContain('duration');
        expect(error.message).toContain('positive');
        expect(error).toMatchSnapshot();
      });
    });

    when('[t1] velocity duration is negative', () => {
      then('throws BadRequestError with details', () => {
        const error = getError(() =>
          assertLimitsValid({
            limits: { velocity: { quantity: 5, duration: { seconds: -1 } } },
          }),
        );

        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('velocity');
        expect(error.message).toContain('duration');
        expect(error).toMatchSnapshot();
      });
    });
  });
});
