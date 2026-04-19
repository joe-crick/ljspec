# Defining Specs

In `ljspec`, specifications (specs) are the fundamental building blocks. This guide explores the different ways to define them.

[Back to README](../README.md)

## Basic Specs with `sdef`

The `sdef` function is the primary way to define and register specs.

### Using Predicates

Any function that returns a boolean can be a spec.

```javascript
import { sdef } from "ljspec";

const IsPositive = sdef("IsPositive", (n) => n > 0);
```

### Using Classes

If you provide a class, `ljspec` will automatically create an `instanceof` check.

```javascript
import { sdef } from "ljspec";

class Order {}
const IsOrder = sdef("IsOrder", Order);
```

### Multiple Arguments

`sdef` can take multiple arguments. If it does, all of them must match (it's implicitly an `and_` of all arguments).

```javascript
import { sdef } from "ljspec";

class AdminUser {}
const IsAdmin = sdef("IsAdmin", AdminUser, (u) => u.role === "admin");
```

## Built-in Predicates

`ljspec` provides several common predicates out of the box:

- `Str`: Checks if a value is a string.
- `Num`: Checks if a value is a number.
- `Int`: Checks if a value is an integer.
- `NonEmptyStr`: Checks if a value is a string and has a length > 0.
- `Any`: Always returns true.

```javascript
import { Str, Int, isValid } from "ljspec";

isValid(Str, "hello"); // true
isValid(Int, 1.5); // false
```

## Custom Spec Objects

You can define a spec by providing an object that satisfies the spec interface:

```javascript
import fc from "fast-check";

const CustomSpec = {
  valid: (v) => v === "secret-value",
  conform: (v) => v,
  explain: (v) => (v === "secret-value" ? null : "value does not match"),
  gen: () => fc.constant("secret-value"),
};
```

`valid` is the only required field. If `conform` or `explain` are omitted, `ljspec` supplies defaults. Add `gen()` when the library cannot infer a generator from the spec definition.

## Registry

When you use `sdef('Name', ...)` or define a spec with a string, it is stored in a global registry. You can then reference it later by its name:

```javascript
import { sdef, isValid } from "ljspec";

sdef("IsEmail", (v) => v.includes("@"));

isValid("IsEmail", "test@example.com"); // true
```

[Go to Combinators](./combinators.md)
