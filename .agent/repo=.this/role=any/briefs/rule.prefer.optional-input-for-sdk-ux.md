# rule.prefer.optional-input-for-sdk-ux

## .what

public SDK functions use optional input parameters (`input?:`) to maximize developer experience.

## .why

SDK consumers should not need to pass explicit null or empty objects for default behavior:

```ts
// good — optional input, zero friction
const object = await getObject({ bucket, key });

// bad — required input, unnecessary friction
const object = await getObject({ bucket, key }, {});
const object = await getObject({ bucket, key }, null);
```

## .where

applies to:
- any public SDK entry point in `src/contract/`

## .exception

this overrides `rule.forbid.undefined-inputs` which applies to internal contracts.

public SDK boundaries prioritize ergonomics over strictness because:
- consumers are external, not team members
- friction at SDK boundary compounds across all consumers
- default behavior is the common case

## .examples

### good — optional for public SDK

```ts
export const getObject = (
  input: { bucket: string; key: string },
  options?: { cache?: 'skip' | null } | null,
): Promise<S3Object> => { ... };
```

### bad — required for public SDK

```ts
export const getObject = (
  input: { bucket: string; key: string },
  options: { cache: 'skip' | null },
): Promise<S3Object> => { ... };
```

## .note

internal contracts (inside `domain.operations/`, `access/`) still follow `rule.forbid.undefined-inputs` for strictness.
