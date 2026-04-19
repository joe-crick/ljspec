# Getting Started with ljspec

`ljspec` is a specification-based validation library for JavaScript. This guide will walk you through setting up and using the core features of the library.

[Back to README](../README.md)

## Core Idea

Instead of simple type checking, `ljspec` lets you define **specifications** as data. A spec can represent:

- A simple predicate (e.g., "is a positive integer").
- A class/instanceof check.
- A composition of other specs (e.g., "is a string AND is not empty").
- A generator for valid values.
- A function contract (e.g., "takes two integers and returns their sum").

## Step 1: Defining a Spec

Use `sdef` to create a new specification.

```javascript
import { sdef } from 'ljspec';

// A spec using a simple predicate
const IsEven = sdef('IsEven', n => n % 2 === 0);

// A spec using a class
class User { ... }
const IsUser = sdef('IsUser', User);

// A spec with multiple conditions (all must match)
const PositiveInt = sdef('PositiveInt', n => Number.isInteger(n) && n > 0);
```

## Step 2: Validating Data

Use `isValid` to check if data matches a spec.

```javascript
import { isValid } from "ljspec";

isValid(IsEven, 2); // true
isValid(IsEven, 3); // false
isValid("IsEven", 4); // You can also use the name if it's registered
```

## Step 3: Conforming Data

Conformance allows you to transform data as it passes through validation.

```javascript
import { conform } from "ljspec";

const TrimmedString = {
  valid: (v) => typeof v === "string",
  conform: (v) => v.trim(),
  explain: (v) => (typeof v === "string" ? null : "not a string"),
};

const result = conform(TrimmedString, "   hello   ");
console.log(result); // "hello"
```

## Step 4: Generating Valid Data

`gen` returns a `fast-check` arbitrary for a spec. This is useful for fixtures and property-based testing.

```javascript
import fc from "fast-check";
import { sdef, gen, Int } from "ljspec";

const PositiveInt = sdef("PositiveInt", Int, (n) => n > 0);
const samples = fc.sample(gen(PositiveInt), { seed: 42, numRuns: 3 });
```

For custom spec objects, provide `gen()` when `ljspec` cannot infer a base generator from the spec definition.

## Next Steps

- Learn about [Defining Specs](./defining-specs.md) in detail.
- Explore complex types with [Combinators](./combinators.md).
- Enforce [Function Contracts](./function-contracts.md) to catch bugs early.
- Read the [Integration Guide](./integration-guide.md) for best practices on adopting `ljspec` in a real project.
