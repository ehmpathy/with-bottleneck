/**
 * .what = derives concurrency limit from optional input
 * .why = extracts default logic for unlimited concurrency
 */
export const asConcurrencyLimit = (input: {
  concurrency: number | undefined;
}): number => input.concurrency ?? Infinity;
