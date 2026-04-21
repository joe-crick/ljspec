# ljspec

A data-oriented contract and specification library for JavaScript. `ljspec` allows you to define specs for your data and contracts for your functions, enabling runtime validation, explanation, generation, and conformance.

## Installation

`ljspec` can be installed directly from GitHub using your preferred package manager:

```bash
# pnpm
pnpm add github:joe-crick/ljspec

# npm
npm install github:joe-crick/ljspec

# yarn
yarn add github:joe-crick/ljspec
```

## Core Concepts

- **Specs as Data**: Define validations using predicates, classes, custom spec objects, or combinators.
- **One Contract Model**: Use `fdef` to declare `args`, `ret`, and relational `fn` constraints.
- **Wrapper-Based Instrumentation**: `instrument` wraps a function and returns a validated replacement.
- **Conformance**: Transform data as it passes through validation (e.g., trimming strings, parsing numbers).
- **Generation**: `gen(spec)` returns a `fast-check` arbitrary for built-in and composable specs.
- **Async-Safe Contracts**: Promise-returning functions are checked after resolution.

## Documentation

Detailed guides and examples are available in the `/docs` folder:

- [Getting Started](./docs/getting-started.md)
- [Defining Specs](./docs/defining-specs.md)
- [Combinators (tuple, and, or)](./docs/combinators.md)
- [Function Contracts & Instrumentation](./docs/function-contracts.md)
- [Integration Guide & Best Practices](./docs/integration-guide.md)
- [Migration Guide](./docs/migration-guide.md)
- [Stability Policy](./docs/stability-policy.md)

## Basic Example

```javascript
import { sdef, fdef, instrument, Int, tuple_ } from "ljspec";

// Define a spec
const PositiveInt = sdef("PositiveInt", Int, (n) => n > 0);

// Define a function contract
fdef("calculateArea", {
  args: tuple_(PositiveInt, PositiveInt),
  ret: PositiveInt,
});

function calculateArea(width, height) {
  return width * height;
}

// Wrap for runtime validation
const safeArea = instrument(calculateArea, "calculateArea");

safeArea(10, 5); // Returns 50
safeArea(-1, 5); // Throws ContractError (Invalid arguments)
```

## Generation Example

```javascript
import fc from "fast-check";
import { sdef, gen, Int } from "ljspec";

const PositiveInt = sdef("PositiveInt", Int, (n) => n > 0);
const samples = fc.sample(gen(PositiveInt), { seed: 42, numRuns: 5 });
```

## Running Tests

```bash
pnpm install
pnpm test
```

## Release Hygiene

- Changes that affect consumers must be recorded in [CHANGELOG.md](./CHANGELOG.md).
- Public API and behavior changes should follow Semantic Versioning.
- Migration-sensitive changes should update [docs/migration-guide.md](./docs/migration-guide.md).
- `1.x` compatibility guarantees live in [docs/stability-policy.md](./docs/stability-policy.md).

## License

ISC
