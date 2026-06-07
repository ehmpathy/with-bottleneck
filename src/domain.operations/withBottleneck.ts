import type { Bottleneck } from '../domain.objects/Bottleneck';
import { getBottleneckFromSupplier } from './withBottleneck/getBottleneckFromSupplier';

/**
 * .what = wraps function with bottleneck control
 * .why = enables declarative rate limit and concurrency control via HOF
 */
export const withBottleneck = <
  TLogic extends (
    ...args: Parameters<TLogic>
  ) => Promise<Awaited<ReturnType<TLogic>>>,
>(
  logic: TLogic,
  options: {
    bottleneck: Bottleneck | ((...args: Parameters<TLogic>) => Bottleneck);
  },
): TLogic => {
  const wrapped = async (
    ...args: Parameters<TLogic>
  ): Promise<Awaited<ReturnType<TLogic>>> => {
    // derive bottleneck from static instance or supplier function
    const bottleneck = getBottleneckFromSupplier({
      bottleneck: options.bottleneck,
      args,
    });

    // delegate to bottleneck.schedule
    /**
     * .cast = sdk boundary (external org code boundary)
     * .why = TypeScript cannot infer that Promise<T> from schedule matches Awaited<ReturnType<TLogic>>
     *        because schedule is generic over T while TLogic is the outer constraint
     * .safe = schedule returns Promise<T> where T is the return type of logic(...args)
     *         which is exactly Awaited<ReturnType<TLogic>> by construction
     * .removal = requires higher-kinded types or const type parameters
     *            to flow TLogic's return type through schedule's generic
     *            blocked on microsoft/TypeScript#1213
     */
    return bottleneck.schedule(() => logic(...args)) as Promise<
      Awaited<ReturnType<TLogic>>
    >;
  };

  /**
   * .cast = sdk boundary (external org code boundary)
   * .why = preserves exact TLogic type for consumers
   *        TypeScript cannot infer that wrapped satisfies TLogic because:
   *        - TLogic may have additional properties (e.g., displayName)
   *        - the wrapped signature is derived via Parameters<>/ReturnType<>
   * .safe = wrapped has identical call signature to TLogic
   * .removal = requires TypeScript to support exact function type inference
   *            blocked on microsoft/TypeScript#34319 (exactOptionalPropertyTypes)
   *            until then, this cast is the standard HOF pattern
   */
  return wrapped as TLogic;
};
