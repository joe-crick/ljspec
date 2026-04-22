# Combinators

Combinators allow you to combine existing specs into more complex structures.

[Back to README](../README.md)

## `tuple_`

`tuple_` describes a fixed-length array where each element matches a specific spec.

```javascript
import { tuple_, Num, Str } from "ljspec";

const Vector2D = tuple_(Num, Num);
const UserInfo = tuple_(Str, Num);

isValid(Vector2D, [10, 20]); // true
isValid(Vector2D, [10]); // false (too short)
isValid(UserInfo, ["John", 30]); // true
```

## `and_`

`and_` combines multiple specs. All of them must match for the validation to pass.

```javascript
import { and_, Int } from "ljspec";

const IsPositive = (n) => n > 0;
const PositiveInt = and_(Int, IsPositive);

isValid(PositiveInt, 10); // true
isValid(PositiveInt, -1); // false (not positive)
isValid(PositiveInt, 1.5); // false (not an integer)
```

**Note**: `and_` pipes conformed values through each spec.

```javascript
const Trim = { valid: (v) => typeof v === "string", conform: (v) => v.trim() };
const NonEmpty = (v) => v.length > 0;
const MySpec = and_(Trim, NonEmpty);

conform(MySpec, "   hello   "); // returns "hello" (trimmed and non-empty)
```

## `or_`

`or_` combines multiple specs. If any of them match, the validation passes.

```javascript
import { or_, Str, Num } from "ljspec";

const StrOrNum = or_(Str, Num);

isValid(StrOrNum, "hello"); // true
isValid(StrOrNum, 123); // true
isValid(StrOrNum, true); // false
```

**Note**: `or_` returns the result of the first spec that successfully conforms the value.

## `shape_()`

`shape_()` composes field-level specs into an object spec.

Example:

```js
import { Int, Str, shape_ } from "ljspec";

const User = shape_({
  id: Str,
  age: Int,
});
```

This validates that:

- the value is a non-array object
- `id` satisfies `Str`
- `age` satisfies `Int`

`shape_()` is intended for compositional object specs that would otherwise require hand-written
`valid` / `explain` definitions in `sdef(...)`.

## Generation

Combinators also compose generators:

```javascript
import fc from "fast-check";
import { gen, tuple_, and_, or_, Int, Str } from "ljspec";

const Pair = tuple_(Int, Int);
const PositiveInt = and_(Int, (n) => n > 0);
const StrOrInt = or_(Str, Int);

fc.sample(gen(Pair), { seed: 1, numRuns: 2 });
fc.sample(gen(PositiveInt), { seed: 1, numRuns: 2 });
fc.sample(gen(StrOrInt), { seed: 1, numRuns: 2 });
```

[Go to Function Contracts](./function-contracts.md)
