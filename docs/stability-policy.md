# Stability Policy

This document defines what `ljspec` promises to consumers during the `1.x` line.

[Back to README](../README.md)

## Versioning

`ljspec` follows Semantic Versioning.

- **Patch releases** fix bugs, improve docs, and tighten internal implementation without changing the documented public API.
- **Minor releases** may add new APIs and new documented behavior in a backward-compatible way.
- **Major releases** may remove APIs, change contract semantics, or alter documented runtime behavior in a way that can break consumers.

## Stable in `1.x`

The following surfaces are stable unless a major version is released:

- Public exports from `src/index.js`
- The core spec APIs: `sdef`, `getSpec`, `isValid`, `conform`, `explain`, `gen`
- The contract APIs: `fdef`, `instrument`, `getContract`, `ContractError`
- Built-in predicates exported by the package
- Documented instrumentation options: `enabled`, `conformArgs`, `conformReturn`, `onError`
- The documented `ContractError` fields: `kind`, `spec`, `value`, `args`, `result`

## Provisional in `1.x`

The following may still evolve in minor releases, but any meaningful change must be documented in the changelog and migration guide:

- Error-message wording
- Generator inference breadth for built-in and composed specs
- Documentation guidance and recommended rollout patterns
- Internal registry implementation details that are not part of the documented API

## Compatibility Rules

- A documented example in the README or `/docs` is part of the supported consumer story.
- A new release must not silently change what a documented example means.
- If behavior changes in a way that could alter a consumer's runtime validation outcome, the change must be called out in `CHANGELOG.md`.
- If a consumer-facing migration step is required, `docs/migration-guide.md` must be updated in the same change.

## Release Checklist

Before publishing a release:

- [ ] `pnpm test` passes
- [ ] `pnpm lint` passes
- [ ] `CHANGELOG.md` includes the release
- [ ] `README.md` and `/docs` match the shipped behavior
- [ ] Any consumer-affecting migration note is reflected in `docs/migration-guide.md`

## Maintainer Rule

`ljspec` is infrastructure. Prefer boring compatibility over clever API churn.
