// domain objects
export type {
  Bottleneck,
  BottleneckLimits,
  BottleneckSemaphore,
  BottleneckSupplier,
} from './domain.objects/Bottleneck';
// domain operations
export { genBottleneck } from './domain.operations/genBottleneck';
export { withBottleneck } from './domain.operations/withBottleneck';
