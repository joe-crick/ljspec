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
import { fdef, instrument, PositiveInt, tuple_ } from "ljspec";

fdef("calculateArea", {
  args: tuple_(PositiveInt, PositiveInt),
  ret: PositiveInt,
});

function calculateArea(width, height) {
  return width * height;
}

const safeArea = instrument(calculateArea, "calculateArea");

safeArea(10, 5); // Returns 50
safeArea(-1, 5); // Throws ContractError (Invalid arguments)
```

## Generation Example

```javascript
import fc from "fast-check";
import { gen, PositiveInt } from "ljspec";

const samples = fc.sample(gen(PositiveInt), { seed: 42, numRuns: 5 });
```

## Built-in Primitives

Import these directly — no need to redefine them:

| Name             | Matches                     |
| ---------------- | --------------------------- |
| `Any`            | anything                    |
| `Str`            | `typeof v === "string"`     |
| `NonEmptyStr`    | string with length > 0      |
| `Num`            | `typeof v === "number"`     |
| `Int`            | `Number.isInteger(v)`       |
| `NonNegativeInt` | integer ≥ 0                 |
| `PositiveInt`    | integer > 0                 |
| `Bool`           | `typeof v === "boolean"`    |
| `Fn`             | `typeof v === "function"`   |
| `Null`           | `v === null`                |
| `Undefined`      | `v === undefined`           |
| `Date_`          | `v instanceof Date`         |
| `Buffer_`        | `Buffer.isBuffer(v)` (Node) |
| `PlainObject`    | non-null, non-array object  |

`Date_` and `Buffer_` use trailing underscores to avoid shadowing the globals. Rename on import if you prefer: `import { Date_ as DateSpec } from "ljspec"`.

## Combinators

| Combinator            | Purpose                                          |
| --------------------- | ------------------------------------------------ |
| `tuple_(...specs)`    | Fixed-length array with positional specs         |
| `shape_({ ... })`     | Object with typed fields                         |
| `and_(...specs)`      | Value must satisfy all specs                     |
| `or_(...specs)`       | Value must satisfy at least one                  |
| `literal_(value)`     | Exact match via `Object.is`                      |
| `enum_(...values)`    | Value must be one of `values` (alias: `oneOf_`)  |
| `instanceOf_(Ctor)`   | `v instanceof Ctor`                              |
| `arrayOf_(spec)`      | Array where every element matches `spec`         |
| `refine_(spec, pred)` | Base spec plus extra predicate (alias: `where_`) |

```javascript
import { arrayOf_, enum_, instanceOf_, refine_, Int, Str } from "ljspec";

const Status = enum_("pending", "active", "done");
const Tags = arrayOf_(Str);
const EvenInt = refine_(Int, (n) => n % 2 === 0);
const ErrorSpec = instanceOf_(Error);
```

## Running Tests

```bash
pnpm install
pnpm test
```

## Releases

Releases are automated. On every push to `master`, the [Release workflow](./.github/workflows/release.yml) runs lint + tests and invokes [semantic-release](https://github.com/semantic-release/semantic-release), which:

1. Parses commit messages since the last tag to decide the next version.
2. Updates `package.json` and prepends release notes to [CHANGELOG.md](./CHANGELOG.md).
3. Commits those changes back to `master` with `[skip ci]`.
4. Tags the commit and creates a [GitHub Release](https://github.com/joe-crick/ljspec/releases).

The package is marked `private` and **not** published to npm — consumers install directly from GitHub (see [Installation](#installation)).

### Conventional Commits

Commit messages must follow the [Conventional Commits](https://www.conventionalcommits.org/) spec. A `commit-msg` husky hook runs [commitlint](https://commitlint.js.org/) locally to enforce this.

| Type                                                                        | Effect                         |
| --------------------------------------------------------------------------- | ------------------------------ |
| `fix: …`                                                                    | patch bump (`1.0.0` → `1.0.1`) |
| `feat: …`                                                                   | minor bump (`1.0.0` → `1.1.0`) |
| `feat!: …` or `BREAKING CHANGE:`                                            | major bump (`1.0.0` → `2.0.0`) |
| `chore:`, `docs:`, `refactor:`, `test:`, `ci:`, `build:`, `style:`, `perf:` | no release                     |

Scopes are optional: `feat(combinators): add arrayOf_`.

If you'd rather not memorize the format, run `pnpm commit` instead of `git commit` — [commitizen](https://commitizen-tools.github.io/commitizen/) prompts for each field and builds a valid message from the commitlint config.

### Stability

- Public API and behavior changes follow [Semantic Versioning](https://semver.org/).
- Migration-sensitive changes should update [docs/migration-guide.md](./docs/migration-guide.md).
- `1.x` compatibility guarantees live in [docs/stability-policy.md](./docs/stability-policy.md).

## License

ISC
