import fc from "fast-check";

const specRegistry = new Map();
const INVALID = "::invalid";

// --- Wishful Thinking: High-Level Entry Points ---

export function sdef(name, ...args) {
  const spec = createSpecFromDefinition(name, args);
  registerSpec(name, spec);
  return spec;
}

export function getSpec(nameOrSpec) {
  return resolveToSpec(nameOrSpec);
}

export function isValid(nameOrSpec, value) {
  return checkValidity(resolveToSpec(nameOrSpec), value);
}

export function conform(nameOrSpec, value) {
  return applyConformance(resolveToSpec(nameOrSpec), value);
}

export function explain(nameOrSpec, value) {
  return getExplanation(resolveToSpec(nameOrSpec), value);
}

export function gen(nameOrSpec) {
  return getGenerator(resolveToSpec(nameOrSpec));
}

// --- Implementation: Fine-Grained Named Functions ---

function createSpecFromDefinition(name, args) {
  if (isSingleDefinition(args)) {
    return wrapSingleDefinition(args[0], name);
  }
  return wrapMultipleDefinitions(args, name);
}

const isSingleDefinition = (args) => args.length === 1;

function wrapSingleDefinition(def, name) {
  if (isClass(def)) return createClassSpec(def, name);
  if (isFunction(def)) return createPredicateSpec(def, name);
  return createObjectSpec(def, name);
}

function wrapMultipleDefinitions(defs, name) {
  const predicates = defs.map(asPredicate);
  const combinedPredicate = (v) => predicates.every((p) => p(v));
  return createPredicateSpec(combinedPredicate, name, {
    genFactory: createFilteredGeneratorFactory(defs, combinedPredicate, name),
  });
}

function asPredicate(def) {
  if (isClass(def)) return (v) => v instanceof def;
  if (isFunction(def)) return def;
  return (v) => isValid(def, v);
}

function resolveToSpec(nameOrSpec) {
  if (isString(nameOrSpec)) return lookupInRegistry(nameOrSpec);
  if (isClass(nameOrSpec)) return createClassSpec(nameOrSpec);
  if (isFunction(nameOrSpec)) return createPredicateSpec(nameOrSpec);
  return nameOrSpec;
}

const lookupInRegistry = (name) => {
  const spec = specRegistry.get(name);
  if (!spec) throw new Error(`Spec not found: ${name}`);
  return spec;
};

const registerSpec = (name, spec) => specRegistry.set(name, spec);

const checkValidity = (spec, value) => spec.valid(value);
const applyConformance = (spec, value) => spec.conform(value);
const getExplanation = (spec, value) => spec.explain(value);
const getGenerator = (spec) => {
  if (!isFunction(spec.gen)) {
    throw new Error(`Generation not implemented for spec ${spec.name || "anonymous"}`);
  }
  return spec.gen();
};

// --- Low-Level Construction & Utilities ---

function createPredicateSpec(predicate, name, { genFactory } = {}) {
  return {
    name,
    valid: predicate,
    conform: (v) => (predicate(v) ? v : INVALID),
    explain: (v) => (predicate(v) ? null : formatFailure(v, name, predicate)),
    gen: () => createGeneratedArbitrary(name, predicate, genFactory || inferGeneratorFactory(name)),
  };
}

const createClassSpec = (cls, name) =>
  createPredicateSpec((v) => v instanceof cls, name || cls.name, {
    genFactory: isFunction(cls.gen) ? () => cls.gen() : undefined,
  });

function createObjectSpec(obj, name) {
  const valid = isFunction(obj.valid) ? obj.valid : () => true;
  const conform = isFunction(obj.conform) ? obj.conform : (v) => (valid(v) ? v : INVALID);
  const explain = isFunction(obj.explain)
    ? obj.explain
    : (v) => (valid(v) ? null : formatFailure(v, name, valid));
  const gen = isFunction(obj.gen)
    ? () => obj.gen()
    : () => createGeneratedArbitrary(name ?? obj.name, valid);

  return {
    ...obj,
    name: name ?? obj.name,
    valid,
    conform,
    explain,
    gen,
  };
}

function createGeneratedArbitrary(name, predicate, genFactory) {
  const baseArbitrary = genFactory?.();
  if (!baseArbitrary) {
    throw new Error(`Generation not implemented for spec ${name || "anonymous"}`);
  }
  return baseArbitrary.filter(predicate);
}

function createFilteredGeneratorFactory(defs, predicate, name) {
  return () => {
    for (const def of defs) {
      const candidate = getGeneratorOrNull(resolveToSpec(def));
      if (candidate) {
        return candidate.filter(predicate);
      }
    }
    throw new Error(`Generation not implemented for spec ${name || "anonymous"}`);
  };
}

function getGeneratorOrNull(spec) {
  try {
    return getGenerator(spec);
  } catch {
    return null;
  }
}

function inferGeneratorFactory(name) {
  switch (name) {
    case "Any":
      return () => fc.anything();
    case "Str":
      return () => fc.string();
    case "NonEmptyStr":
      return () => fc.string({ minLength: 1 });
    case "Num":
      return () => fc.double({ noNaN: true });
    case "Int":
      return () => fc.integer();
    default:
      return undefined;
  }
}

const formatFailure = (v, name, predicate) =>
  `Value ${JSON.stringify(v)} failed predicate ${name || predicate.name || "anonymous"}`;

const isClass = (v) => typeof v === "function" && /^\s*class\s+/.test(v.toString());
const isFunction = (v) => typeof v === "function";
const isString = (v) => typeof v === "string";
