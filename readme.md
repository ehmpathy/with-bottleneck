# with-bottleneck

![test](https://github.com/ehmpathy/with-bottleneck/workflows/test/badge.svg)
![publish](https://github.com/ehmpathy/with-bottleneck/workflows/publish/badge.svg)

simple, ergonomic rate limit and concurrency control utilities

# install

```sh
npm install with-bottleneck
```

# why

don't spill your drink down your shirt — use a bottleneck to control the pour.

- limit api calls to avoid rate limit bans
- limit db connections to avoid saturation
- limit concurrent requests to respect server capacity

**bottleneck = intentional, precise flow control**

# use

## two usecases

`withBottleneck` supports two patterns for where the bottleneck comes from:

| usecase | bind time | bottleneck source | when |
|---------|-----------|-------------------|------|
| **per declaration** | declaration | static instance | global limits, scripts |
| **per context** | call time | extracted from context | per-tenant, DI, testability |

## usecase 1: per declaration

bottleneck created once, bound at declaration. all calls share same instance.

```ts
import { withBottleneck, genBottleneck } from 'with-bottleneck';

// create bottleneck at module level
const bottleneck = genBottleneck({
  concurrency: 5,
  velocity: { quantity: 10, duration: { seconds: 1 } }
});

// bind to function at declaration
const fetchLimited = withBottleneck(fetch, { bottleneck });

// all calls share the same bottleneck
await fetchLimited('https://api.example.com/a');
await fetchLimited('https://api.example.com/b');
await fetchLimited('https://api.example.com/c');
```

## usecase 2: per context

bottleneck resolved from context at call time. each call can use different bottleneck.

```ts
import { withBottleneck, genBottleneck, Bottleneck } from 'with-bottleneck';

// declare function — bottleneck comes from context
const fetchLimited = withBottleneck(fetch, {
  bottleneck: (_input, context) => context.usecase.bottleneck,
});

// create different bottlenecks for different tenants
const customerBottleneck = genBottleneck({
  concurrency: 2,
  velocity: { quantity: 5, duration: { seconds: 1 } }
});
const adminBottleneck = genBottleneck({
  concurrency: 10,
  velocity: { quantity: 100, duration: { seconds: 1 } }
});

// each call uses bottleneck from its context
await fetchLimited('https://api.example.com/data', {
  usecase: { bottleneck: customerBottleneck }
});

await fetchLimited('https://api.example.com/data', {
  usecase: { bottleneck: adminBottleneck }
});
```

# exports

| export | purpose |
|--------|---------|
| `Bottleneck` | type — the bottleneck instance shape |
| `genBottleneck(config)` | create `Bottleneck` instance |
| `withBottleneck(fn, { bottleneck })` | wrap fn with bottleneck |

# genBottleneck config

```ts
interface BottleneckConfig {
  /** max concurrent operations (how many at once) */
  concurrency?: number;

  /** rate limit (how many per time) */
  velocity?: {
    /** how many operations */
    quantity: number;
    /** per duration (IsoDuration from iso-time) */
    duration: IsoDuration;
  };
}
```

examples:

```ts
// concurrency only: max 5 at once
genBottleneck({ concurrency: 5 });

// velocity only: max 10 per second
genBottleneck({ velocity: { quantity: 10, duration: { seconds: 1 } } });

// both: max 5 at once, max 100 per minute
genBottleneck({
  concurrency: 5,
  velocity: { quantity: 100, duration: { minutes: 1 } }
});
```

# Bottleneck shape

```ts
interface Bottleneck {
  /** the inner semaphore — for manual acquire/release */
  semaphore: {
    acquire: () => Promise<void>;
    release: () => void;
    queued: number;
    active: number;
  };

  /** schedule fn for execution — acquires, runs, releases automatically */
  schedule: <T>(fn: () => Promise<T>) => Promise<T>;
}
```

direct semaphore access for complex flows:

```ts
// manual control
await bottleneck.semaphore.acquire();
try {
  const a = await fetchA();
  const b = await fetchB(a);
  return transform(b);
} finally {
  bottleneck.semaphore.release();
}

// check state
if (bottleneck.semaphore.queued > 100) {
  throw new Error('queue too deep, backpressure');
}
```

# why "bottleneck"

a bottleneck is not a defect — it's precision design.

the neck of a beer bottle is *intentional*: controls pour rate, prevents spills, enables clean pour.

same here: we *want* a bottleneck to control flow.

# background

pour one out to the og, [`bottleneck`](https://www.npmjs.com/package/bottleneck), who paved the intuitive frame — abandoned since 2020.

we pick up where bottleneck left off; now, with wrappers and dependency injection.
