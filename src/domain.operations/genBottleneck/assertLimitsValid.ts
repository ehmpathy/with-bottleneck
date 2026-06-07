import { BadRequestError } from 'helpful-errors';
import { toMilliseconds } from 'iso-time';

import type { BottleneckLimits } from '../../domain.objects/Bottleneck';

/**
 * .what = validates bottleneck limits configuration
 * .why = fails fast on invalid limits with actionable error
 */
export const assertLimitsValid = (input: {
  limits: BottleneckLimits | null;
}): void => {
  const { limits } = input;

  // null limits are valid (defaults apply)
  if (limits === null) return;

  // validate concurrency: must be positive integer or Infinity
  if (limits.concurrency !== undefined && limits.concurrency <= 0)
    throw new BadRequestError('concurrency must be positive', {
      field: 'concurrency',
      value: limits.concurrency,
      hint: 'use a positive integer for concurrency limit, or omit for unlimited',
    });

  if (
    limits.concurrency !== undefined &&
    limits.concurrency !== Infinity &&
    !Number.isInteger(limits.concurrency)
  )
    throw new BadRequestError('concurrency must be an integer', {
      field: 'concurrency',
      value: limits.concurrency,
      hint: 'use a positive integer for concurrency limit, or Infinity for unlimited',
    });

  // validate velocity.quantity: must be positive integer
  if (limits.velocity !== undefined && limits.velocity.quantity <= 0)
    throw new BadRequestError('velocity.quantity must be positive', {
      field: 'velocity.quantity',
      value: limits.velocity.quantity,
      hint: 'use a positive integer for velocity quantity',
    });

  if (
    limits.velocity !== undefined &&
    !Number.isInteger(limits.velocity.quantity)
  )
    throw new BadRequestError('velocity.quantity must be an integer', {
      field: 'velocity.quantity',
      value: limits.velocity.quantity,
      hint: 'use a positive integer for velocity quantity',
    });

  // validate velocity.duration: must be present and positive
  if (limits.velocity !== undefined && limits.velocity.duration === undefined)
    throw new BadRequestError('velocity.duration is required', {
      field: 'velocity.duration',
      value: limits.velocity.duration,
      hint: 'specify duration as { seconds: 1 } or ISO 8601 string',
    });

  if (
    limits.velocity !== undefined &&
    toMilliseconds(limits.velocity.duration) <= 0
  )
    throw new BadRequestError('velocity.duration must be positive', {
      field: 'velocity.duration',
      value: limits.velocity.duration,
      hint: 'specify duration as { seconds: 1 } or ISO 8601 string',
    });
};
