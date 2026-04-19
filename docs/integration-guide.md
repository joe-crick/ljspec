# Integrating `ljspec` into a Project

This guide covers best practices for adopting `ljspec` in a real codebase: where to put specs, when to wrap functions, how to control instrumentation in different environments, and how to combine specs with your test suite.

[Back to README](../README.md)

## Where to define specs

Specs are plain data, so co-locate them with the code they describe.

- **Domain specs** live next to the domain model. A `User` spec belongs in the same module that exports the `User` type or constructor.
- **Shared primitives** (e.g. `Email`, `NonNegativeInt`) belong in a small dedicated module (`src/specs/primitives.js`) that other modules import.
- **Function contracts** (`fdef`) belong in the module that defines the function. Keep the contract declaration immediately above the function body so they move together when either changes.

```javascript
// src/orders/cancelOrder.js
import { fdef, instrument, sdef, tuple_, NonEmptyStr } from "ljspec";
import { Order } from "./Order.js";

fdef("cancelOrder", {
  args: tuple_(
    sdef("cancellable-order", Order, (o) => o.status !== "shipped" && o.status !== "cancelled"),
    NonEmptyStr,
  ),
  ret: sdef("cancelled-order", Order, (o) => o.status === "cancelled"),
  fn: ([order, reason], result) => result.id === order.id && result.cancelReason === reason,
});

function cancelOrderImpl(order, reason) {
  // ...
}

export const cancelOrder = instrument(cancelOrderImpl, "cancelOrder");
```

Export the **wrapped** function as the public API. Consumers never see the raw implementation, so the contract always runs.

## Enable in dev/test, disable in production (by default)

Runtime validation costs cycles. The recommended default is:

- **Always on in development and CI**: contracts catch integration bugs early.
- **Off in production** unless the contract is cheap and the safety is worth the cost.

Use the `enabled` option to flip instrumentation per-environment:

```javascript
const contractsEnabled = process.env.NODE_ENV !== "production";

export const cancelOrder = instrument(cancelOrderImpl, "cancelOrder", {
  enabled: contractsEnabled,
});
```

When `enabled: false`, `instrument` returns the raw function with no wrapper overhead.

For libraries, expose the switch so your consumers decide. For applications, centralize the flag in one config module.

## Error-handling strategy

By default, a failed contract throws `ContractError`. That surfaces the bug loudly, which is what you usually want in development.

For production, decide per-call whether you want to:

- **Throw** (default) — treat the violation as a bug that must not be swallowed.
- **Log and continue** — useful when rolling out contracts to legacy code paths you can't yet correct.
- **Report to observability** — forward to Sentry/Datadog/etc. and rethrow.

```javascript
import * as Sentry from "@sentry/node";

export const processPayment = instrument(processPaymentImpl, "processPayment", {
  onError: (err) => {
    Sentry.captureException(err, { extra: { args: err.args, kind: err.kind } });
    throw err;
  },
});
```

The `err` passed to `onError` is a `ContractError` with `kind`, `spec`, `value`, `args`, and `result` fields. Use `kind` to distinguish `args`, `ret`, and `fn` failures.

## Conformance vs. validation

Two different uses:

- **Validation (default)** — check the value, leave it untouched. Use when inputs are already well-formed.
- **Conformance (`conformArgs` / `conformReturn`)** — transform the value as part of validation (trim a string, parse a number, normalize a shape). Use at system boundaries where inputs come from untrusted sources.

```javascript
const Trimmed = {
  valid: (v) => typeof v === "string",
  conform: (v) => v.trim(),
};

fdef("createUser", {
  args: tuple_(Trimmed, Trimmed),
  ret: User,
});

export const createUser = instrument(createUserImpl, "createUser", {
  conformArgs: true, // the implementation sees already-trimmed strings
});
```

Prefer pure validation internally; reserve conformance for the outer edge.

## Testing integration

`ljspec` gives you two testing leverage points.

### Instrumented-by-default functions catch bugs in unit tests

If your public function is the `instrument(...)` wrapper, your existing unit tests already exercise the contract. A regression that breaks an invariant shows up as a `ContractError` at the failing test's site, not as a subtle downstream bug.

### Property-based testing with `gen`

Any spec can produce a `fast-check` arbitrary via `gen(spec)`. Combine this with `fc.assert` for property tests:

```javascript
import fc from "fast-check";
import { gen, sdef, Int } from "ljspec";

const NonNegativeInt = sdef("NonNegativeInt", Int, (n) => n >= 0);

it("sqrt(n*n) === n for non-negative integers", () => {
  fc.assert(
    fc.property(gen(NonNegativeInt), (n) => {
      expect(Math.sqrt(n * n)).toBe(n);
    }),
  );
});
```

For combinators, generation composes automatically: `gen(tuple_(Int, Str))` produces `[number, string]` pairs.

### Custom generators for business types

If you wrap a domain class, supply a `gen()` so `fast-check` can synthesize realistic values:

```javascript
const OrderSpec = sdef("Order", {
  valid: (v) => v instanceof Order,
  gen: () =>
    fc
      .record({ id: fc.integer(), status: fc.constantFrom("pending", "shipped") })
      .map(({ id, status }) => new Order(id, status)),
});
```

## Naming and registry hygiene

- Use **stable, fully qualified names** for registered specs and contracts (`billing.invoice.line-item` rather than `lineItem`). The registry is global; short names collide across modules.
- Avoid re-registering the same name from multiple modules. If you need that, extract the spec into a shared module and import it.
- Prefer passing the spec **value** (not its name) across module boundaries. Names are a convenience for cross-module lookup, not an API contract.

## Production checklist

Before shipping:

- [ ] Contracts defined for every public function in your module's API surface.
- [ ] Wrapped (instrumented) function is the exported symbol, not the raw implementation.
- [ ] `enabled` flag is driven by environment config, not hardcoded.
- [ ] A production `onError` is wired to your observability stack when instrumentation is on.
- [ ] Property tests exist for any non-trivial relational `fn` constraint.
- [ ] Custom `gen()` is provided for domain classes used in `args` or `ret`.

## What to skip

Don't put a contract on everything. Good candidates:

- Public API boundaries (HTTP handlers, RPC endpoints, published library functions).
- Functions with non-trivial invariants you'd otherwise express in prose comments.
- Hot-path functions where a bug would be hard to reproduce in production.

Skip contracts on:

- Trivial one-liners where the type is self-evident.
- Performance-sensitive inner loops (or wrap the outer entry point only).
- Internal helpers whose inputs are already validated upstream.

[Back to README](../README.md)
