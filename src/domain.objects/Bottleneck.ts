import type { IsoDuration } from 'iso-time';

/**
 * .what = semaphore interface for concurrency control
 * .why = limits simultaneous operations via slot-based acquire/release
 */
export interface BottleneckSemaphore {
  /** acquire a slot, blocks until available */
  acquire: () => Promise<void>;

  /** release a slot */
  release: () => void;

  /** count of queued waiters */
  readonly queued: number;

  /** count of active slots */
  readonly active: number;
}

/**
 * .what = throttle interface for velocity control
 * .why = limits operations per time via token bucket
 */
export interface BottleneckThrottle {
  /** acquire a token, blocks until available */
  acquire: () => Promise<void>;

  /** count of available tokens */
  readonly tokens: number;
}

/**
 * .what = bottleneck instance with semaphore and schedule
 * .why = provides unified concurrency and velocity control
 */
export interface Bottleneck {
  /** the inner semaphore for concurrency control */
  readonly semaphore: BottleneckSemaphore;

  /**
   * schedule fn for execution with bottleneck control
   *
   * acquires semaphore slot, then throttle token if configured,
   * runs function, then releases semaphore slot (always, even on error)
   */
  schedule: <T>(fn: () => Promise<T>) => Promise<T>;
}

/**
 * .what = limits configuration for genBottleneck
 * .why = specifies concurrency and/or velocity constraints
 */
export interface BottleneckLimits {
  /** max concurrent operations (how many at once) */
  concurrency?: number;

  /** rate limit (how many per time) */
  velocity?: {
    /** how many operations */
    quantity: number;
    /** per duration */
    duration: IsoDuration;
  };
}

/**
 * .what = supplier type for bottleneck resolution
 * .why = enables static instance or per-call derivation from context
 */
export type BottleneckSupplier<TInput, TContext> =
  | Bottleneck
  | ((input: TInput, context: TContext) => Bottleneck);
