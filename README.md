# ljspec

A data-oriented contract and specification library for JavaScript. `ljspec` allows you to define specs for your data and contracts for your functions, enabling runtime validation, explanation, generation, and conformance.

## Installation

`ljspec` can be installed directly from GitHub using your preferred package manager:

```bash
# pnpm
pnpm add github:user/ljspec

# npm
npm install github:user/ljspec

# yarn
yarn add github:user/ljspec
```

_Note: Replace `user` with the actual GitHub username where the repository is hosted._

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

## License

ISC
