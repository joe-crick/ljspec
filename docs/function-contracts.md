# Function Contracts & Instrumentation

`ljspec` uses one contract story in v1: define contracts as data with `fdef`, then enforce them by wrapping functions with `instrument`.

[Back to README](../README.md)

## Defining a Contract with `fdef`

Use `fdef` to declare a contract for a named function.

```javascript
import { fdef, tuple_, Int, Str } from "ljspec";

const ProcessedOrder = {
  valid: (v) =>
    typeof v === "object" && v !== null && typeof v.id === "number" && typeof v.status === "string",
  conform: (v) => v,
  explain: (v) =>
    ProcessedOrder.valid(v) ? null : `invalid processed order: ${JSON.stringify(v)}`,
};

fdef("processOrder", {
  args: tuple_(Int, Str), // args is a spec that receives an array of all arguments
  ret: ProcessedOrder, // ret is a spec that receives the return value
  fn: ([id, status], result) => result.status === status, // fn is a relational predicate
});
```

### Relational Predicates (`fn`)

The `fn` field allows you to define a constraint that relates the arguments to the return value. Its signature is `fn(args, result)`, where `args` is the argument array.

```javascript
fdef("add", {
  args: tuple_(Int, Int),
  ret: Int,
  fn: ([a, b], res) => res === a + b,
});
```

## Instrumentation with `instrument`

Defining a contract doesn't enforce it automatically. You must use `instrument` to wrap your function.

```javascript
function processOrder(id, status) {
  // ...
  return { id, status, processed: true };
}

const wrappedProcessOrder = instrument(processOrder, "processOrder");
```

`instrument` always returns a wrapper. Keep the original function if you need the raw implementation, or read it from `wrappedProcessOrder.raw`.

### Instrumentation Options

`instrument(fn, nameOrContract, options?)`

Available options:

- `enabled`: Set to `false` to disable validation (e.g., in production). Default: `true`.
- `conformArgs`: If `true`, arguments will be conformed before being passed to the underlying function. Default: `false`.
- `conformReturn`: If `true`, the return value will be conformed. Default: `false`.
- `onError`: A custom function to handle `ContractError`. Default: throws the error.

If the wrapped function returns a promise, `ret` and `fn` are validated after the promise resolves. Contract failures reject the returned promise with `ContractError`.

```javascript
const safeAdd = instrument(add, "add", {
  conformArgs: true,
  onError: (err) => {
    console.error("Contract Violation:", err.message);
    throw err;
  },
});
```

## `ContractError`

When a contract is violated, `instrument` throws a `ContractError`. This error includes metadata about the failure:

- `kind`: 'args' | 'ret' | 'fn'
- `spec`: The spec that failed.
- `value`: The value that failed validation.
- `args`: The arguments array.
- `result`: The return value (only for 'ret' and 'fn' errors).

## Next Steps

- [Integration Guide & Best Practices](./integration-guide.md) — where to put specs, how to wire instrumentation across environments, and how to combine contracts with property-based testing.
- [Back to Getting Started](./getting-started.md)
