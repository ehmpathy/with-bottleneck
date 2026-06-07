import type { Bottleneck } from '../../domain.objects/Bottleneck';

/**
 * .what = derives bottleneck from supplier or static instance
 * .why = transforms polymorphic bottleneck option to concrete instance
 */
export const getBottleneckFromSupplier = <TArgs extends unknown[]>(input: {
  bottleneck: Bottleneck | ((...args: TArgs) => Bottleneck);
  args: TArgs;
}): Bottleneck => {
  // static instance: return directly
  if (typeof input.bottleneck !== 'function') {
    return input.bottleneck;
  }

  // supplier function: invoke with args
  return input.bottleneck(...input.args);
};
