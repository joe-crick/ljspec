# Migration Guide

This guide is for projects replacing ad hoc assertions or a legacy contract helper with `ljspec`.

## Migration Goals

- Keep the application shippable during the migration.
- Preserve current runtime checks before introducing richer spec semantics.
- Move repeated boolean checks into named reusable specs.
- Apply `instrument()` first at public boundaries, not everywhere.

## Recommended Migration Order

1. **Compatibility layer first**
   Keep the old contract entry points in place and reimplement them on top of `ljspec` where possible. Do not begin by rewriting every call site.

2. **Shared primitive specs**
   Extract repeated checks into named specs such as `NonEmptyStr`, `Email`, `UserId`, and stable result-envelope specs.

3. **Public module boundaries**
   Use `fdef()` and `instrument()` for exported functions in service, route, plugin, and shared-library modules.

4. **Relational constraints**
   Add `fn` predicates where the output must remain coupled to the input, for example “returned id must match requested id”.

5. **Property-based tests**
   Add `gen(spec)` only for logic that benefits from broader input exploration, such as parsers, normalizers, or domain transforms.

## Mapping from Legacy Patterns

### Inline preconditions

```javascript
pre(saveUser, {
  "email is non-empty string": typeof email === "string" && email.length > 0,
});
```

Becomes:

```javascript
const NonEmptyStr = sdef("NonEmptyStr", Str, (v) => v.length > 0);

fdef("saveUser", {
  args: tuple_(NonEmptyStr),
});

export const saveUser = instrument(function saveUser(email) {
  // ...
}, "saveUser");
```

### Inline postconditions

```javascript
after(loadBook, {
  "result is object": result !== null && typeof result === "object",
});
```

Becomes:

```javascript
const Book = sdef("Book", (v) => v !== null && typeof v === "object");

fdef("loadBook", {
  args: tuple_(NonEmptyStr),
  ret: Book,
});
```

## Rollout Rules

- Prefer validation over conformance inside the application core.
- Reserve conformance for untrusted boundaries such as HTTP payloads, env vars, and external integration inputs.
- Instrument exported APIs first; leave trivial internal helpers alone unless the contract is meaningful.
- Use stable, domain-oriented names for specs and contracts.

## Definition of Done

- Package consumers have a clear upgrade path.
- Public module contracts are explicit and instrumented.
- Shared repeated checks have become reusable specs.
- The migration reduces duplicated assumptions instead of just changing syntax.
