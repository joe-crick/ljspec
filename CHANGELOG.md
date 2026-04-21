# Changelog

All notable changes to `ljspec` will be documented in this file.

The format is based on Keep a Changelog and the project follows Semantic Versioning.

## [1.0.0] - 2026-04-21

### Added

- Initial public release of the data-oriented spec and contract system.
- Core spec APIs: `sdef`, `getSpec`, `isValid`, `conform`, `explain`, `gen`.
- Contract APIs: `fdef`, `instrument`, `getContract`, `ContractError`.
- Built-in predicates and compositors for primitive and tuple-based validation.
- Documentation for getting started, defining specs, combinators, function contracts, and integration guidance.

### Notes

- `instrument()` is the enforcement boundary for function contracts.
- `gen()` relies on `fast-check` generators for built-in and custom specs.
